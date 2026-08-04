import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { createEmployee } from "@/src/server/services/employeeService";
import {
  createReimbursement,
  approveReimbursement,
  markInProgress,
  rejectReimbursement,
} from "@/src/server/services/reimbursementService";
import {
  archiveInvoice,
  exportInvoiceCsv,
  generateInvoice,
  getArLedger,
  getInvoice,
  issueInvoice,
  listInvoices,
  markInvoicePaid,
} from "@/src/server/services/invoiceService";

const GENERATED_BY = "super-admin-test";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function seedEmployee(tenantId: string, suffix: string) {
  return createEmployee(tenantId, {
    employeeCode: `INV-${suffix}`,
    email: `inv-${suffix.toLowerCase()}@example.com`,
  });
}

async function createApprovedClaim(
  tenantId: string,
  suffix: string,
  amount: number,
  serviceDate: string,
  extras: { sessionCount?: number } = {},
) {
  const emp = await seedEmployee(tenantId, suffix);
  const claim = await createReimbursement(tenantId, {
    employeeId: emp.employeeId,
    employeeName: "Invoice Test Employee",
    type: "medical",
    amount,
    description: `Invoice test claim ${suffix}`,
    serviceDate,
    ...(extras.sessionCount !== undefined ? { sessionCount: extras.sessionCount } : {}),
  });
  await markInProgress(tenantId, claim.reimbursementId, GENERATED_BY);
  await approveReimbursement(tenantId, claim.reimbursementId, GENERATED_BY);
  return claim;
}

describe("Invoice Generation — Phase 4", () => {
  it("generates one consolidated invoice per organization with total = Σ approved amounts", async () => {
    const tenantId = "tenant-invoice-consolidated";
    const claimA = await createApprovedClaim(tenantId, "A", 100, "2026-07-05");
    const claimB = await createApprovedClaim(tenantId, "B", 250, "2026-07-10");
    const claimC = await createApprovedClaim(tenantId, "C", 150, "2026-07-15");

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.status, "draft");
    assert.equal(invoice.tenantId, tenantId);
    assert.equal(invoice.period.from, "2026-07-01");
    assert.equal(invoice.period.to, "2026-07-31");
    assert.equal(invoice.totalAmount, 500, "total must equal the sum of approved amounts");
    assert.equal(invoice.lineItems.length, 3);
    assert.equal(invoice.lineItems.length, new Set(invoice.lineItems.map((i) => i.claimId)).size);

    const claimIds = new Set([claimA.reimbursementId, claimB.reimbursementId, claimC.reimbursementId]);
    assert.deepEqual(
      new Set(invoice.lineItems.map((i) => i.claimId)),
      claimIds,
      "all approved claims in the period must be line items",
    );
    assert.ok(invoice.invoiceNumber.startsWith("INV-"), "invoice number must have INV- prefix");
  });

  it("only approved claims are included (pending and rejected excluded)", async () => {
    const tenantId = "tenant-invoice-status-filter";
    const approved = await createApprovedClaim(tenantId, "OK", 200, "2026-07-10");

    // Pending claim in the same period.
    const pendingEmp = await seedEmployee(tenantId, "PEND");
    const pending = await createReimbursement(tenantId, {
      employeeId: pendingEmp.employeeId,
      employeeName: "Pending Employee",
      type: "medical",
      amount: 999,
      description: "Pending claim",
      serviceDate: "2026-07-12",
    });

    // Rejected claim in the same period.
    const rejectedEmp = await seedEmployee(tenantId, "REJ");
    const rejected = await createReimbursement(tenantId, {
      employeeId: rejectedEmp.employeeId,
      employeeName: "Rejected Employee",
      type: "medical",
      amount: 888,
      description: "Rejected claim",
      serviceDate: "2026-07-14",
    });
    await rejectReimbursement(tenantId, rejected.reimbursementId, GENERATED_BY);

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.lineItems.length, 1, "only the approved claim may be invoiced");
    assert.equal(invoice.lineItems[0]!.claimId, approved.reimbursementId);
    assert.equal(invoice.totalAmount, 200);
    assert.ok(!invoice.lineItems.some((i) => i.claimId === pending.reimbursementId));
    assert.ok(!invoice.lineItems.some((i) => i.claimId === rejected.reimbursementId));
  });

  it("sessionCount is informational and does not affect the total", async () => {
    const tenantId = "tenant-invoice-sessions";
    await createApprovedClaim(tenantId, "S1", 120, "2026-07-05", { sessionCount: 5 });
    await createApprovedClaim(tenantId, "S2", 180, "2026-07-08", { sessionCount: 2 });
    await createApprovedClaim(tenantId, "S3", 50, "2026-07-12");

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.totalAmount, 350, "total must ignore sessionCount");
    const sessions = invoice.lineItems.find((i) => i.sessionCount === 5);
    assert.ok(sessions, "sessionCount must be carried on the line item for reporting");
    assert.equal(sessions!.amount, 120);
  });

  it("guards against double-invoicing — claims on an existing invoice are excluded", async () => {
    const tenantId = "tenant-invoice-double-invoice";
    await createApprovedClaim(tenantId, "D1", 100, "2026-07-05");
    await createApprovedClaim(tenantId, "D2", 200, "2026-07-10");
    await createApprovedClaim(tenantId, "D3", 300, "2026-07-15");

    const first = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    assert.equal(first.lineItems.length, 3);
    assert.equal(first.totalAmount, 600);

    // Re-generating for the same period must fail — every claim is already invoiced.
    await assert.rejects(
      () =>
        generateInvoice({
          tenantId,
          from: "2026-07-01",
          to: "2026-07-31",
          generatedBy: GENERATED_BY,
        }),
      { code: "NO_CLAIMS_TO_INVOICE" },
    );

    // A newly approved claim becomes the only eligible line item.
    await createApprovedClaim(tenantId, "D4", 400, "2026-07-20");
    const second = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    assert.equal(second.lineItems.length, 1, "only the never-invoiced claim may be included");
    assert.equal(second.totalAmount, 400);
    assert.ok(
      second.lineItems.every((i) => i.claimId !== first.lineItems[0]!.claimId),
      "claims already on an existing invoice must be excluded",
    );
  });

  it("rejects an empty period and throws when no eligible claims exist", async () => {
    const tenantId = "tenant-invoice-empty";

    await assert.rejects(
      () =>
        generateInvoice({
          tenantId,
          from: "2026-07-20",
          to: "2026-07-01",
          generatedBy: GENERATED_BY,
        }),
      { code: "INVALID_PERIOD" },
    );

    await assert.rejects(
      () =>
        generateInvoice({
          tenantId,
          from: "2026-07-01",
          to: "2026-07-31",
          generatedBy: GENERATED_BY,
        }),
      { code: "NO_CLAIMS_TO_INVOICE" },
    );
  });
});

describe("Invoice Lifecycle", () => {
  it("transitions draft → generated → issued → paid", async () => {
    const tenantId = "tenant-invoice-lifecycle";
    await createApprovedClaim(tenantId, "L1", 250, "2026-07-10");

    const draft = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    assert.equal(draft.status, "draft");

    const repositories = await getRepositoryContext();

    // Draft → generated (finalizing a draft for issue).
    const generated = await repositories.invoices.update(draft.invoiceId, {
      status: "generated",
      updatedAt: new Date().toISOString(),
    });
    assert.equal(generated!.status, "generated");

    // Generated → issued.
    const issued = await issueInvoice(draft.invoiceId, GENERATED_BY);
    assert.equal(issued.status, "issued");
    assert.ok(issued.issuedAt, "issuedAt must be set");

    // Issued → paid.
    const paid = await markInvoicePaid(draft.invoiceId, GENERATED_BY);
    assert.equal(paid.status, "paid");
    assert.ok(paid.paidAt, "paidAt must be set");
  });

  it("rejects invalid lifecycle transitions", async () => {
    const tenantId = "tenant-invoice-lifecycle-invalid";
    await createApprovedClaim(tenantId, "LI", 100, "2026-07-10");

    const draft = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });

    // Cannot pay a draft.
    await assert.rejects(
      () => markInvoicePaid(draft.invoiceId, GENERATED_BY),
      { code: "INVALID_INVOICE_STATUS" },
    );

    const issued = await issueInvoice(draft.invoiceId, GENERATED_BY);
    // Cannot issue an already-issued invoice.
    await assert.rejects(
      () => issueInvoice(issued.invoiceId, GENERATED_BY),
      { code: "INVALID_INVOICE_STATUS" },
    );

    const paid = await markInvoicePaid(issued.invoiceId, GENERATED_BY);
    // Terminal state — no further transitions.
    await assert.rejects(
      () => markInvoicePaid(paid.invoiceId, GENERATED_BY),
      { code: "INVALID_INVOICE_STATUS" },
    );
  });

  it("exportInvoiceCsv renders claim number, clinic, service date, sessions, amount", async () => {
    const tenantId = "tenant-invoice-csv";
    const claim = await createApprovedClaim(tenantId, "C1", 75, "2026-07-06", {
      sessionCount: 3,
    });
    await createApprovedClaim(tenantId, "C2", 125, "2026-07-09");

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });

    const csv = await exportInvoiceCsv(invoice.invoiceId, { role: "superAdmin" });

    assert.ok(csv.startsWith("Claim Number,Clinic,Service Date,Sessions,Amount"), "CSV header mismatch");
    assert.ok(csv.includes(claim.claimNumber ?? ""), "CSV must include the claim number");
    assert.ok(csv.includes("2026-07-06"), "CSV must include the service date");
    assert.ok(csv.includes("3"), "CSV must include the session count");
    assert.ok(csv.includes("75.000"), "CSV must include the amount");
  });
});

describe("Invoice Financial Flow — paid invoice triggers payout queue", () => {
  it("does NOT move approved claims to to_be_paid at generation", async () => {
    const tenantId = "tenant-invoice-flow-gen";
    const claim = await createApprovedClaim(tenantId, "F1", 120, "2026-07-05");

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    assert.equal(invoice.status, "draft");

    const repositories = await getRepositoryContext();
    const claimDoc = await repositories.reimbursements.findById(claim.reimbursementId);
    assert.equal(claimDoc!.status, "approved", "claims stay approved on generation");
  });

  it("queues linked claims for payment when the invoice is marked paid", async () => {
    const tenantId = "tenant-invoice-flow-pay";
    const claim = await createApprovedClaim(tenantId, "F2", 200, "2026-07-05");

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    const issued = await issueInvoice(invoice.invoiceId, GENERATED_BY);
    assert.equal(issued.status, "issued");

    const repositories = await getRepositoryContext();
    const beforePay = await repositories.reimbursements.findById(claim.reimbursementId);
    assert.equal(beforePay!.status, "approved", "still approved while invoice is issued");

    const paid = await markInvoicePaid(invoice.invoiceId, GENERATED_BY);
    assert.equal(paid.status, "paid");

    const afterPay = await repositories.reimbursements.findById(claim.reimbursementId);
    assert.equal(afterPay!.status, "to_be_paid", "claim enters payout queue after org pays");

    const record = await repositories.paymentRecords.findByClaimId(claim.reimbursementId);
    assert.ok(record, "a PaymentRecord links the claim to the invoice");
    assert.equal(record!.invoiceId, invoice.invoiceId);
  });
});

describe("Invoice A/R Ledger", () => {
  it("reports issued invoices as outstanding and paid invoices as cleared", async () => {
    const tenantId = "tenant-invoice-ledger";
    await createApprovedClaim(tenantId, "A1", 100, "2026-07-05");
    await createApprovedClaim(tenantId, "A2", 250, "2026-07-10");

    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    const issued = await issueInvoice(invoice.invoiceId, GENERATED_BY);
    assert.equal(issued.status, "issued");

    const ledger = await getArLedger({});
    const org = ledger.organizations.find((o) => o.orgId === tenantId);
    assert.ok(org, "org must appear in the ledger");
    assert.equal(org!.totalOutstanding, 350);
    assert.equal(org!.invoiceCount, 1);

    // Pay the invoice → outstanding clears.
    await markInvoicePaid(invoice.invoiceId, GENERATED_BY);
    const paidLedger = await getArLedger({});
    const paidOrg = paidLedger.organizations.find((o) => o.orgId === tenantId);
    assert.equal(paidOrg!.totalOutstanding, 0);
  });

  it("archives a paid invoice (terminal state)", async () => {
    const tenantId = "tenant-invoice-archive";
    const claim = await createApprovedClaim(tenantId, "AR1", 80, "2026-07-05");
    const invoice = await generateInvoice({
      tenantId,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });
    const issued = await issueInvoice(invoice.invoiceId, GENERATED_BY);
    const paid = await markInvoicePaid(issued.invoiceId, GENERATED_BY);
    const archived = await archiveInvoice(paid.invoiceId, GENERATED_BY);
    assert.equal(archived.status, "archived");

    // Cannot pay or re-archive an archived invoice.
    await assert.rejects(
      () => markInvoicePaid(archived.invoiceId, GENERATED_BY),
      { code: "INVALID_INVOICE_STATUS" },
    );
  });
});

describe("Invoice Scoping", () => {
  it("tenant admin sees only their own tenant's invoices", async () => {
    const tenantA = "tenant-invoice-scope-a";
    const tenantB = "tenant-invoice-scope-b";

    await createApprovedClaim(tenantA, "A1", 100, "2026-07-05");
    const invoiceA = await generateInvoice({
      tenantId: tenantA,
      from: "2026-07-01",
      to: "2026-07-31",
      generatedBy: GENERATED_BY,
    });

    // Tenant admin from tenant B cannot see tenant A's invoice by id.
    const blocked = await getInvoice(invoiceA.invoiceId, {
      role: "tenantAdmin",
      tenantId: tenantB,
    });
    assert.equal(blocked, null, "tenant admin must not see another tenant's invoice");

    // Tenant admin from tenant A can see it.
    const allowed = await getInvoice(invoiceA.invoiceId, {
      role: "tenantAdmin",
      tenantId: tenantA,
    });
    assert.equal(allowed!.invoiceId, invoiceA.invoiceId);

    // Super admin can see any tenant's invoice.
    const superAdminView = await getInvoice(invoiceA.invoiceId, { role: "superAdmin" });
    assert.equal(superAdminView!.invoiceId, invoiceA.invoiceId);

    // List scoping.
    const listB = await listInvoices({ role: "tenantAdmin", tenantId: tenantB }, {});
    assert.ok(
      !listB.invoices.some((i) => i.invoiceId === invoiceA.invoiceId),
      "tenant B list must not leak tenant A invoices",
    );

    const listA = await listInvoices({ role: "tenantAdmin", tenantId: tenantA }, {});
    assert.ok(listA.invoices.some((i) => i.invoiceId === invoiceA.invoiceId));
  });
});
