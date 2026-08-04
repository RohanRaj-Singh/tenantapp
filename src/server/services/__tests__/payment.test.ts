import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { createEmployee } from "@/src/server/services/employeeService";
import {
  createReimbursement,
  createEmployeeReimbursement,
  approveReimbursement,
  markInProgress,
} from "@/src/server/services/reimbursementService";
import {
  queueForPayment,
  processPayments,
  listPaymentQueue,
  listPaymentOperations,
  getPaymentDetail,
} from "@/src/server/services/paymentService";
import {
  generateInvoice,
  issueInvoice,
  markInvoicePaid,
} from "@/src/server/services/invoiceService";

const TENANT_ID = "tenant-payment-test";
const OTHER_TENANT = "tenant-payment-other";
const ACTOR = "super-admin-test";

async function seedEmployee(suffix: string) {
  return createEmployee(TENANT_ID, {
    employeeCode: `PAY-${suffix}`,
    email: `pay-${suffix.toLowerCase()}@example.com`,
  });
}

/**
 * Route a freshly-created (pending) claim to `approved` through the legal state
 * machine (`pending → in_progress → approved`). Direct `pending → approved` is
 * no longer a valid transition.
 */
async function approveClaim(tenantId: string, claimId: string) {
  await markInProgress(tenantId, claimId, ACTOR);
  return approveReimbursement(tenantId, claimId, ACTOR);
}

async function createApprovedClaim(
  tenantId: string,
  suffix: string,
  amount: number,
  clinic?: { clinicId: string; clinicName: string },
) {
  const emp = await createEmployee(tenantId, {
    employeeCode: `PAY-${suffix}`,
    email: `pay-${suffix.toLowerCase()}@example.com`,
  });
  const claim = clinic
    ? await createEmployeeReimbursement(tenantId, emp.employeeId, "Payment Test Employee", {
        clinicId: clinic.clinicId,
        clinicName: clinic.clinicName,
        amount,
        description: `Payment test claim ${suffix}`,
      })
    : await createReimbursement(tenantId, {
        employeeId: emp.employeeId,
        employeeName: "Payment Test Employee",
        type: "medical",
        amount,
        description: `Payment test claim ${suffix}`,
      });
  await approveClaim(tenantId, claim.reimbursementId);
  return claim;
}

describe("Payment Service — queueForPayment", () => {
  it("moves an approved claim to to_be_paid and writes a PaymentRecord", async () => {
    const emp = await seedEmployee("Q1");
    const claim = await createEmployeeReimbursement(TENANT_ID, emp.employeeId, "Payment Test Employee", {
      clinicId: "clinic_alpha",
      clinicName: "Alpha Clinic",
      amount: 50,
      description: "Queue test",
    });
    await approveClaim(TENANT_ID, claim.reimbursementId);

    const queued = await queueForPayment(TENANT_ID, claim.reimbursementId, ACTOR);
    assert.ok(queued);
    assert.equal(queued!.status, "to_be_paid");

    const repositories = await getRepositoryContext();
    const record = await repositories.paymentRecords.findByClaimId(claim.reimbursementId);
    assert.ok(record, "a PaymentRecord must be created");
    assert.equal(record!.status, "to_be_paid");
    assert.equal(record!.clinicId, "clinic_alpha");
    assert.equal(record!.amount, 50);
  });

  it("returns null for cross-tenant queue requests", async () => {
    const emp = await seedEmployee("Q2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: "Payment Test Employee",
      type: "medical",
      amount: 60,
      description: "Cross-tenant queue test",
    });
    await approveClaim(TENANT_ID, claim.reimbursementId);

    const result = await queueForPayment(OTHER_TENANT, claim.reimbursementId, ACTOR);
    assert.equal(result, null);
  });

  it("rejects re-queueing an already queued claim (state machine guard)", async () => {
    const emp = await seedEmployee("Q3");
    const claim = await createEmployeeReimbursement(TENANT_ID, emp.employeeId, "Payment Test Employee", {
      clinicId: "clinic_beta",
      clinicName: "Beta Clinic",
      amount: 70,
      description: "Re-queue test",
    });
    await approveClaim(TENANT_ID, claim.reimbursementId);

    const first = await queueForPayment(TENANT_ID, claim.reimbursementId, ACTOR);
    assert.ok(first);
    assert.equal(first!.status, "to_be_paid");

    await assert.rejects(
      () => queueForPayment(TENANT_ID, claim.reimbursementId, ACTOR),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });
});

describe("Payment Service — listPaymentQueue", () => {
  it("groups to_be_paid claims by clinic with totals", async () => {
    const tenantId = "tenant-payment-queue";
    const claims = await Promise.all([
      createApprovedClaim(tenantId, "G1", 100, { clinicId: "clinic_x", clinicName: "X Clinic" }),
      createApprovedClaim(tenantId, "G2", 200, { clinicId: "clinic_x", clinicName: "X Clinic" }),
      createApprovedClaim(tenantId, "G3", 300, { clinicId: "clinic_y", clinicName: "Y Clinic" }),
    ]);

    for (const claim of claims) {
      await queueForPayment(tenantId, claim.reimbursementId, ACTOR);
    }

    const result = await listPaymentQueue({ tenantId });
    assert.equal(result.total, 3, "all queued claims are listed");

    const x = result.groups.find((g) => g.clinicId === "clinic_x");
    assert.ok(x, "clinic_x group must exist");
    assert.equal(x!.totalAmount, 300);
    assert.equal(x!.count, 2);
    assert.equal(x!.claims.length, 2);
    assert.ok(x!.claims.every((c) => c.claimNumber), "claims carry claimNumber");

    const y = result.groups.find((g) => g.clinicId === "clinic_y");
    assert.ok(y, "clinic_y group must exist");
    assert.equal(y!.totalAmount, 300);
    assert.equal(y!.count, 1);
  });

  it("returns empty when no claims are queued", async () => {
    const tenantId = "tenant-payment-empty";
    await createApprovedClaim(tenantId, "E1", 100, { clinicId: "clinic_e", clinicName: "E Clinic" });

    const result = await listPaymentQueue({ tenantId });
    assert.equal(result.total, 0);
    assert.deepEqual(result.groups, []);
  });
});

describe("Payment Service — processPayments", () => {
  it("pays a single claim when its id is supplied", async () => {
    const tenantId = "tenant-payment-process-one";
    const c1 = await createApprovedClaim(tenantId, "P1", 100, { clinicId: "clinic_p", clinicName: "P Clinic" });
    const c2 = await createApprovedClaim(tenantId, "P2", 200, { clinicId: "clinic_p", clinicName: "P Clinic" });
    await queueForPayment(tenantId, c1.reimbursementId, ACTOR);
    await queueForPayment(tenantId, c2.reimbursementId, ACTOR);

    const result = await processPayments({ claimIds: [c1.reimbursementId], actorId: ACTOR });
    assert.equal(result.processed, 1);

    const repositories = await getRepositoryContext();
    const paidRecord = await repositories.paymentRecords.findByClaimId(c1.reimbursementId);
    assert.equal(paidRecord!.status, "paid");
    assert.ok(paidRecord!.paidAt, "paidAt must be set");
    assert.equal(paidRecord!.paidBy, ACTOR);

    const stillQueued = await repositories.paymentRecords.findByClaimId(c2.reimbursementId);
    assert.equal(stillQueued!.status, "to_be_paid", "the other claim must remain queued");
  });

  it("processes all to_be_paid claims when no claimIds are supplied", async () => {
    const tenantId = "tenant-payment-process-all";
    const c1 = await createApprovedClaim(tenantId, "A1", 150, { clinicId: "clinic_a", clinicName: "A Clinic" });
    const c2 = await createApprovedClaim(tenantId, "A2", 250, { clinicId: "clinic_a", clinicName: "A Clinic" });
    await queueForPayment(tenantId, c1.reimbursementId, ACTOR);
    await queueForPayment(tenantId, c2.reimbursementId, ACTOR);

    const result = await processPayments({ tenantId, actorId: ACTOR });
    assert.equal(result.processed, 2);

    const queue = await listPaymentQueue({ tenantId });
    assert.equal(queue.total, 0, "the queue must be drained");

    const repositories = await getRepositoryContext();
    assert.equal((await repositories.paymentRecords.findByClaimId(c1.reimbursementId))!.status, "paid");
    assert.equal((await repositories.paymentRecords.findByClaimId(c2.reimbursementId))!.status, "paid");
  });

  it("never pays a claim that is not in to_be_paid", async () => {
    const tenantId = "tenant-payment-guard";
    const claim = await createApprovedClaim(tenantId, "G1", 300, { clinicId: "clinic_g", clinicName: "G Clinic" });

    // Approved, not queued → not a valid payout target.
    const result = await processPayments({ claimIds: [claim.reimbursementId], actorId: ACTOR });
    assert.equal(result.processed, 0);

    const repositories = await getRepositoryContext();
    const record = await repositories.paymentRecords.findByClaimId(claim.reimbursementId);
    assert.equal(record, null, "no PaymentRecord should be written");
  });

  it("finalizes the claim status via the state machine (to_be_paid → paid)", async () => {
    const tenantId = "tenant-payment-state";
    const claim = await createApprovedClaim(tenantId, "S1", 400, { clinicId: "clinic_s", clinicName: "S Clinic" });
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    const result = await processPayments({ claimIds: [claim.reimbursementId], actorId: ACTOR });
    assert.equal(result.processed, 1);

    const repositories = await getRepositoryContext();
    const paid = await repositories.reimbursements.findById(claim.reimbursementId);
    assert.equal(paid!.status, "paid");
    assert.ok(paid!.history!.some((h) => h.status === "paid"), "history must include a paid entry");
  });

  it("assigns a payment reference when a payout is finalized", async () => {
    const tenantId = "tenant-payment-ref";
    const claim = await createApprovedClaim(tenantId, "R1", 120, { clinicId: "clinic_r", clinicName: "R Clinic" });
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    const result = await processPayments({ claimIds: [claim.reimbursementId], actorId: ACTOR });
    assert.equal(result.processed, 1);

    const repositories = await getRepositoryContext();
    const record = await repositories.paymentRecords.findByClaimId(claim.reimbursementId);
    assert.equal(record!.status, "paid");
    assert.match(record!.paymentReference ?? "", /^PAY-\d{4}-\d{6}$/, "payment reference uses PAY-YYYY-NNNNNN format");
  });
});

describe("Payment Service — claim bank details snapshot", () => {
  it("carries the claim's own bank snapshot into the workspace", async () => {
    const tenantId = "tenant-payment-bank-snapshot";
    const emp = await createEmployee(tenantId, {
      employeeCode: "BK1",
      email: "bk1@example.com",
      bankAccountNumber: "EMP-PROFILE-ACCT",
      bankName: "Bank Muscat",
    });
    const claim = await createEmployeeReimbursement(tenantId, emp.employeeId, "Bank Test Employee", {
      clinicId: "clinic_bk",
      clinicName: "BK Clinic",
      amount: 150,
      description: "Bank snapshot claim",
      bankAccountNumber: "CLAIM-SNAPSHOT-ACCT",
      bankName: "Bank Dhofar",
    });
    await approveClaim(tenantId, claim.reimbursementId);
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    const result = await listPaymentOperations({ tenantId });
    const org = result.organizations.find((o) => o.tenantId === tenantId)!;
    const workspaceClaim = org.clinics[0]!.claims[0]!;

    // The claim's own snapshot wins over the employee profile.
    assert.equal(workspaceClaim.bankAccountNumber, "CLAIM-SNAPSHOT-ACCT");
    assert.equal(workspaceClaim.effectiveBankAccountNumber, "CLAIM-SNAPSHOT-ACCT");
    assert.equal(workspaceClaim.bankSource, "claim");
  });

  it("falls back to the employee profile for legacy claims missing bank details", async () => {
    const tenantId = "tenant-payment-bank-fallback";
    const emp = await createEmployee(tenantId, {
      employeeCode: "BK2",
      email: "bk2@example.com",
      bankAccountNumber: "EMP-PROFILE-ACCT",
      bankName: "Bank Muscat",
    });
    // Legacy claim: no bank details on the claim.
    const claim = await createEmployeeReimbursement(tenantId, emp.employeeId, "Bank Test Employee", {
      clinicId: "clinic_bk2",
      clinicName: "BK2 Clinic",
      amount: 200,
      description: "Legacy claim without bank",
    });
    await approveClaim(tenantId, claim.reimbursementId);
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    const result = await listPaymentOperations({ tenantId });
    const org = result.organizations.find((o) => o.tenantId === tenantId)!;
    const workspaceClaim = org.clinics[0]!.claims[0]!;

    assert.equal(workspaceClaim.bankSource, "employee_fallback");
    assert.equal(workspaceClaim.effectiveBankAccountNumber, "EMP-PROFILE-ACCT");
    assert.equal(workspaceClaim.effectiveBankName, "Bank Muscat");
  });

  it("marks bankSource missing when neither claim nor profile has bank details", async () => {
    const tenantId = "tenant-payment-bank-missing";
    const emp = await createEmployee(tenantId, {
      employeeCode: "BK3",
      email: "bk3@example.com",
    });
    const claim = await createEmployeeReimbursement(tenantId, emp.employeeId, "Bank Test Employee", {
      clinicId: "clinic_bk3",
      clinicName: "BK3 Clinic",
      amount: 300,
      description: "No bank anywhere",
    });
    await approveClaim(tenantId, claim.reimbursementId);
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    const result = await listPaymentOperations({ tenantId });
    const org = result.organizations.find((o) => o.tenantId === tenantId)!;
    const workspaceClaim = org.clinics[0]!.claims[0]!;

    assert.equal(workspaceClaim.bankSource, "missing");
    assert.ok(!workspaceClaim.effectiveBankAccountNumber);
  });
});

describe("Payment Service — listPaymentOperations (org-first workspace)", () => {
  it("groups queued claims by organization then clinic, with totals", async () => {
    const tenantId = "tenant-payment-ops";
    const claims = await Promise.all([
      createApprovedClaim(tenantId, "O1", 100, { clinicId: "clinic_o1", clinicName: "One Clinic" }),
      createApprovedClaim(tenantId, "O2", 200, { clinicId: "clinic_o1", clinicName: "One Clinic" }),
      createApprovedClaim(tenantId, "O3", 300, { clinicId: "clinic_o2", clinicName: "Two Clinic" }),
    ]);
    for (const claim of claims) {
      await queueForPayment(tenantId, claim.reimbursementId, ACTOR);
    }

    const result = await listPaymentOperations({ tenantId });
    assert.equal(result.summary.outstanding.count, 3);
    assert.equal(result.summary.outstanding.amount, 600);

    const org = result.organizations.find((o) => o.tenantId === tenantId);
    assert.ok(org, "organization must be present");
    assert.equal(org!.totalOutstanding, 600);
    assert.equal(org!.clinics.length, 2);

    const one = org!.clinics.find((c) => c.clinicId === "clinic_o1");
    assert.ok(one, "clinic_o1 group must exist");
    assert.equal(one!.count, 2);
    assert.equal(one!.totalAmount, 300);
    assert.equal(one!.claims.length, 2);
    assert.ok(one!.claims.every((c) => c.employeeName), "org-first claims carry employeeName");
  });

  it("reports paidToday and payment history after processing", async () => {
    const tenantId = "tenant-payment-ops-history";
    const claim = await createApprovedClaim(tenantId, "H1", 250, { clinicId: "clinic_h", clinicName: "H Clinic" });
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    const before = await listPaymentOperations({ tenantId });
    assert.equal(before.summary.paidToday.count, 0);

    await processPayments({ tenantId, actorId: ACTOR });

    const after = await listPaymentOperations({ tenantId });
    assert.equal(after.summary.outstanding.count, 0, "queue drains after processing");
    assert.equal(after.summary.paidToday.count, 1);
    assert.equal(after.summary.paidToday.amount, 250);

    assert.equal(after.paymentHistory.length, 1);
    assert.equal(after.paymentHistory[0]!.amount, 250);
    assert.equal(after.paymentHistory[0]!.status, "paid");
    assert.ok(after.paymentHistory[0]!.paymentReference, "history entry carries a payment reference");
  });

  it("captures the bank reference supplied at payout for reconciliation", async () => {
    const tenantId = "tenant-payment-ops-bankref";
    const claim = await createApprovedClaim(tenantId, "BR1", 120, { clinicId: "clinic_br", clinicName: "BR Clinic" });
    await queueForPayment(tenantId, claim.reimbursementId, ACTOR);

    await processPayments({ tenantId, actorId: ACTOR, bankReference: "TRF-2026-000123" });

    const after = await listPaymentOperations({ tenantId });
    assert.equal(after.paymentHistory.length, 1);
    assert.equal(after.paymentHistory[0]!.bankReference, "TRF-2026-000123");
  });

  it("links reconciliation history to the invoice that funded the payout", async () => {
    const tenantId = "tenant-payment-ops-invoice";
    const emp = await createEmployee(tenantId, {
      employeeCode: "PAY-INV-1",
      email: "pay-inv-1@example.com",
    });
    const claim = await createReimbursement(tenantId, {
      employeeId: emp.employeeId,
      employeeName: "Invoice Linked Employee",
      type: "medical",
      amount: 300,
      description: "Invoice-linked payout",
      serviceDate: "2026-07-12",
    });
    await approveClaim(tenantId, claim.reimbursementId);

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: ACTOR,
    });
    const issued = await issueInvoice(invoice.invoiceId, ACTOR);
    const paid = await markInvoicePaid(issued.invoiceId, ACTOR);
    assert.equal(paid.status, "paid");

    // Invoice settlement auto-queues the linked claim (`approved → to_be_paid`).
    const queued = await listPaymentOperations({ tenantId });
    assert.equal(queued.summary.outstanding.count, 1);
    // The workspace claim surfaces its funding invoice before payout.
    const queuedClaim = queued.organizations
      .flatMap((o) => o.clinics.flatMap((c) => c.claims))
      .find((c) => c.reimbursementId === claim.reimbursementId);
    assert.equal(queuedClaim?.invoiceId, invoice.invoiceId);
    assert.equal(queuedClaim?.invoiceNumber, invoice.invoiceNumber);

    // Payment detail returns the record + claim snapshot + funding invoice.
    const detail = await getPaymentDetail(claim.reimbursementId);
    assert.ok(detail.paymentRecord, "payment record present while queued");
    assert.equal(detail.paymentRecord!.status, "to_be_paid");
    assert.equal(detail.invoiceNumber, invoice.invoiceNumber);
    assert.equal(detail.claim?.amount, 300);

    await processPayments({ tenantId, actorId: ACTOR });

    const after = await listPaymentOperations({ tenantId });
    assert.equal(after.paymentHistory.length, 1);
    assert.equal(after.paymentHistory[0]!.invoiceId, invoice.invoiceId);
    assert.equal(after.paymentHistory[0]!.invoiceNumber, invoice.invoiceNumber);

    const paidDetail = await getPaymentDetail(claim.reimbursementId);
    assert.equal(paidDetail.paymentRecord!.status, "paid");
    assert.ok(paidDetail.paymentRecord!.paymentReference, "payment reference assigned on payment");
  });
});

