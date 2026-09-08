import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { ApiError } from "@/src/server/api/errors";
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
  getClaimInvoiceLinks,
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

describe("Invoice Generation", () => {
  it("generates one consolidated invoice from an explicit claim selection", async () => {
    const tenantId = "tenant-invoice-consolidated";
    const claimA = await createApprovedClaim(tenantId, "A", 100, "2026-07-05");
    const claimB = await createApprovedClaim(tenantId, "B", 250, "2026-07-10");
    const claimC = await createApprovedClaim(tenantId, "C", 150, "2026-07-15");

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [claimA.reimbursementId, claimB.reimbursementId, claimC.reimbursementId],
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.status, "draft");
    assert.equal(invoice.tenantId, tenantId);
    assert.equal(invoice.totalAmount, 500, "total must equal the sum of selected amounts");
    assert.equal(invoice.lineItems.length, 3);
    assert.equal(invoice.lineItems.length, new Set(invoice.lineItems.map((i) => i.claimId)).size);

    assert.deepEqual(
      new Set(invoice.lineItems.map((i) => i.claimId)),
      new Set([claimA.reimbursementId, claimB.reimbursementId, claimC.reimbursementId]),
      "selected claims must all become line items",
    );
    assert.ok(invoice.invoiceNumber.startsWith("INV-"), "invoice number must have INV- prefix");
  });

  it("derives the billing period from selected claims' service dates (no date inputs)", async () => {
    const tenantId = "tenant-invoice-period-derived";
    const early = await createApprovedClaim(tenantId, "E", 50, "2026-06-28");
    const late = await createApprovedClaim(tenantId, "L", 50, "2026-08-20");
    const mid = await createApprovedClaim(tenantId, "M", 50, "2026-07-12");

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [mid.reimbursementId, early.reimbursementId, late.reimbursementId],
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.period.from, "2026-06-28");
    assert.equal(invoice.period.to, "2026-08-20");
  });

  it("rejects non-approved claims atomically with a structured result", async () => {
    const tenantId = "tenant-invoice-status-filter";
    const approved = await createApprovedClaim(tenantId, "OK", 200, "2026-07-10");

    // Pending claim.
    const pendingEmp = await seedEmployee(tenantId, "PEND");
    const pending = await createReimbursement(tenantId, {
      employeeId: pendingEmp.employeeId,
      employeeName: "Pending Employee",
      type: "medical",
      amount: 999,
      description: "Pending claim",
      serviceDate: "2026-07-12",
    });

    // Rejected claim.
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

    await assert.rejects(
      () =>
        generateInvoice({
          tenantId,
          claimIds: [approved.reimbursementId, pending.reimbursementId, rejected.reimbursementId],
          generatedBy: GENERATED_BY,
        }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        const api = err as ApiError;
        assert.equal(api.code, "INVALID_CLAIMS");
        const rejectedIds = (api.details.rejected as Array<{ claimId: string }>).map((r) => r.claimId);
        assert.deepEqual(
          new Set(rejectedIds),
          new Set([pending.reimbursementId, rejected.reimbursementId]),
        );
        assert.deepEqual(api.details.validClaimIds, [approved.reimbursementId]);
        return true;
      },
    );

    // Atomicity: nothing was written — selecting only the valid claim now succeeds.
    const invoice = await generateInvoice({
      tenantId,
      claimIds: [approved.reimbursementId],
      generatedBy: GENERATED_BY,
    });
    assert.equal(invoice.lineItems.length, 1);
    assert.equal(invoice.lineItems[0]!.claimId, approved.reimbursementId);
    assert.equal(invoice.totalAmount, 200);
  });

  it("sessionCount is informational and does not affect the total", async () => {
    const tenantId = "tenant-invoice-sessions";
    const s1 = await createApprovedClaim(tenantId, "S1", 120, "2026-07-05", { sessionCount: 5 });
    const s2 = await createApprovedClaim(tenantId, "S2", 180, "2026-07-08", { sessionCount: 2 });
    const s3 = await createApprovedClaim(tenantId, "S3", 50, "2026-07-12");

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [s1.reimbursementId, s2.reimbursementId, s3.reimbursementId],
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.totalAmount, 350, "total must ignore sessionCount");
    const sessions = invoice.lineItems.find((i) => i.sessionCount === 5);
    assert.ok(sessions, "sessionCount must be carried on the line item for reporting");
    assert.equal(sessions!.amount, 120);
  });

  it("guards against double-invoicing — claims already on an invoice are rejected", async () => {
    const tenantId = "tenant-invoice-double-invoice";
    const d1 = await createApprovedClaim(tenantId, "D1", 100, "2026-07-05");
    const d2 = await createApprovedClaim(tenantId, "D2", 200, "2026-07-10");
    const d3 = await createApprovedClaim(tenantId, "D3", 300, "2026-07-15");

    const first = await generateInvoice({
      tenantId,
      claimIds: [d1.reimbursementId, d2.reimbursementId, d3.reimbursementId],
      generatedBy: GENERATED_BY,
    });
    assert.equal(first.lineItems.length, 3);
    assert.equal(first.totalAmount, 600);

    // Re-selecting an already-invoiced claim rejects the whole operation.
    await assert.rejects(
      () =>
        generateInvoice({
          tenantId,
          claimIds: [d1.reimbursementId, d2.reimbursementId, d3.reimbursementId],
          generatedBy: GENERATED_BY,
        }),
      (err: unknown) => (err as ApiError).code === "INVALID_CLAIMS",
    );

    // A newly approved claim invoices cleanly on its own.
    const d4 = await createApprovedClaim(tenantId, "D4", 400, "2026-07-20");
    const second = await generateInvoice({
      tenantId,
      claimIds: [d4.reimbursementId],
      generatedBy: GENERATED_BY,
    });
    assert.equal(second.lineItems.length, 1, "only the never-invoiced claim may be included");
    assert.equal(second.totalAmount, 400);
  });

  it("rejects claims that belong to a different organization", async () => {
    const tenantA = "tenant-invoice-wrong-org-a";
    const tenantB = "tenant-invoice-wrong-org-b";
    const claim = await createApprovedClaim(tenantA, "X", 100, "2026-07-05");

    await assert.rejects(
      () =>
        generateInvoice({
          tenantId: tenantB,
          claimIds: [claim.reimbursementId],
          generatedBy: GENERATED_BY,
        }),
      (err: unknown) => (err as ApiError).code === "INVALID_CLAIMS",
    );
  });

  it("rejects an empty selection and a missing tenant", async () => {
    await assert.rejects(
      () =>
        generateInvoice({
          tenantId: "tenant-invoice-empty",
          claimIds: [],
          generatedBy: GENERATED_BY,
        }),
      { code: "NO_CLAIMS_SELECTED" },
    );

    await assert.rejects(
      () => generateInvoice({ tenantId: "", claimIds: ["any"], generatedBy: GENERATED_BY }),
      { code: "MISSING_TENANT" },
    );
  });

  it("is date-independent: any serviceDate is eligible when explicitly selected", async () => {
    const tenantId = "tenant-invoice-date-independent";
    const ancient = await createApprovedClaim(tenantId, "OLD", 75, "2020-01-01");
    const future = await createApprovedClaim(tenantId, "NEW", 125, "2099-12-31");

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [ancient.reimbursementId, future.reimbursementId],
      generatedBy: GENERATED_BY,
    });

    assert.equal(invoice.lineItems.length, 2, "serviceDate must not restrict eligibility");
    assert.equal(invoice.period.from, "2020-01-01");
    assert.equal(invoice.period.to, "2099-12-31");
  });
});

describe("Invoice Lifecycle", () => {
  it("transitions draft → issued → paid", async () => {
    const tenantId = "tenant-invoice-lifecycle";
    const claim = await createApprovedClaim(tenantId, "L1", 250, "2026-07-10");

    const draft = await generateInvoice({
      tenantId,
      claimIds: [claim.reimbursementId],
      generatedBy: GENERATED_BY,
    });
    assert.equal(draft.status, "draft");

    const issued = await issueInvoice(draft.invoiceId, GENERATED_BY);
    assert.equal(issued.status, "issued");
    assert.ok(issued.issuedAt, "issuedAt must be set");

    const paid = await markInvoicePaid(draft.invoiceId, GENERATED_BY);
    assert.equal(paid.status, "paid");
    assert.ok(paid.paidAt, "paidAt must be set");
  });

  it("rejects invalid lifecycle transitions", async () => {
    const tenantId = "tenant-invoice-lifecycle-invalid";
    const claim = await createApprovedClaim(tenantId, "LI", 100, "2026-07-10");

    const draft = await generateInvoice({
      tenantId,
      claimIds: [claim.reimbursementId],
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
    const claim2 = await createApprovedClaim(tenantId, "C2", 125, "2026-07-09");

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [claim.reimbursementId, claim2.reimbursementId],
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
      claimIds: [claim.reimbursementId],
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
      claimIds: [claim.reimbursementId],
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

describe("Claim → Invoice Traceability", () => {
  it("exposes the invoice relationship for a claim via read-time join across the lifecycle", async () => {
    const tenantId = "tenant-invoice-traceability";
    const claim = await createApprovedClaim(tenantId, "T1", 150, "2026-07-05");

    // Before invoicing: no link.
    const empty = await getClaimInvoiceLinks([claim.reimbursementId]);
    assert.equal(empty.size, 0);

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [claim.reimbursementId],
      generatedBy: GENERATED_BY,
    });

    const links = await getClaimInvoiceLinks([claim.reimbursementId]);
    const link = links.get(claim.reimbursementId);
    assert.ok(link, "claim must resolve to its invoice");
    assert.equal(link!.invoiceId, invoice.invoiceId);
    assert.equal(link!.invoiceNumber, invoice.invoiceNumber);
    assert.equal(link!.status, "draft");

    // The link persists across the lifecycle (draft → issued → paid).
    await issueInvoice(invoice.invoiceId, GENERATED_BY);
    await markInvoicePaid(invoice.invoiceId, GENERATED_BY);
    const paidLinks = await getClaimInvoiceLinks([claim.reimbursementId]);
    assert.equal(paidLinks.get(claim.reimbursementId)!.status, "paid");
  });
});

describe("Invoice A/R Ledger", () => {
  it("reports issued invoices as outstanding and paid invoices as cleared", async () => {
    const tenantId = "tenant-invoice-ledger";
    const a1 = await createApprovedClaim(tenantId, "A1", 100, "2026-07-05");
    const a2 = await createApprovedClaim(tenantId, "A2", 250, "2026-07-10");

    const invoice = await generateInvoice({
      tenantId,
      claimIds: [a1.reimbursementId, a2.reimbursementId],
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
      claimIds: [claim.reimbursementId],
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

    const claim = await createApprovedClaim(tenantA, "A1", 100, "2026-07-05");
    const invoiceA = await generateInvoice({
      tenantId: tenantA,
      claimIds: [claim.reimbursementId],
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
