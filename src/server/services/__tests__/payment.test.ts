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
} from "@/src/server/services/paymentService";

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
});

