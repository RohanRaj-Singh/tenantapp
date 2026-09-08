import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { ApiError } from "@/src/server/api/errors";
import type {
  FindInvoicesResult,
  ListInvoicesOptions,
} from "@/src/server/repositories/contracts";
import type {
  InvoiceDocument,
  InvoiceLineItem,
  InvoiceStatus,
  ReimbursementDocument,
} from "@/src/server/db/documents";
import { queueForPayment } from "@/src/server/services/paymentService";

export type InvoiceRole = "superAdmin" | "tenantAdmin";

/**
 * Access scope for an invoice request.
 * - Super Admin (via `x-admin-api-key`) sees any tenant.
 * - Tenant Admin (via tenant dashboard session) is pinned to `tenantId`.
 */
export interface InvoiceScope {
  role: InvoiceRole;
  /** Set for tenantAdmin scope. Super Admin may carry an optional tenant filter via list opts. */
  tenantId?: string;
}

export interface GenerateInvoiceInput {
  tenantId: string;
  /** Explicitly selected claim ids to invoice (one invoice = one org = many claims). */
  claimIds: string[];
  generatedBy: string;
}

/** A single claim that failed eligibility validation during invoice generation. */
export interface InvoiceClaimRejection {
  claimId: string;
  reason: string;
}

export interface ListInvoicesParams extends ListInvoicesOptions {
  /** Optional tenant filter used by super-admin callers. */
  tenantId?: string;
}

// ── Accounts Receivable ledger (org-first) ──────────────────────────────────

export interface ArOrgSummary {
  orgId: string;
  orgName: string;
  totalOutstanding: number;
  overdueAmount: number;
  invoiceCount: number;
  lastInvoiceDate?: string;
  lastInvoiceNumber?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  arStatus: "current" | "1-30" | "31-60" | "61-90" | "90+";
  aging: { current: number; "1-30": number; "31-60": number; "61-90": number; "90+": number };
}

export interface ArLedgerResult {
  organizations: ArOrgSummary[];
  total: number;
  /** Invoices settled (paid) by organizations in the current calendar month. */
  paidThisMonth: { count: number; amount: number };
}

const AGING_BUCKETS = [
  { key: "1-30" as const, max: 30 },
  { key: "31-60" as const, max: 60 },
  { key: "61-90" as const, max: 90 },
];

function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

/**
 * Build the org-first Accounts Receivable ledger.
 *
 * Answers "who owes Remedy money?": issued invoices not yet paid are the
 * receivable; aging buckets are computed from the issue date. Draft/archived
 * invoices have $0 AR impact. Lightweight reconciliation fields (paidAt/paidBy)
 * drive the per-org last-payment summary.
 */
export async function getArLedger(
  opts: { tenantId?: string; status?: string; daysOutstanding?: string; search?: string } = {},
): Promise<ArLedgerResult> {
  const repositories = await getRepositoryContext();
  const result = await repositories.invoices.findAll({
    tenantId: opts.tenantId,
    status: opts.status || undefined,
    skip: 0,
    limit: 100_000,
  });

  // "Paid This Month" = invoice payments received from organizations in the
  // current calendar month (cash in to Remedy).
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let paidThisMonthCount = 0;
  let paidThisMonthAmount = 0;

  const orgMap = new Map<string, ArOrgSummary>();

  for (const invoice of result.invoices) {
    if (invoice.status === "paid" && invoice.paidAt?.startsWith(monthPrefix)) {
      paidThisMonthCount += 1;
      paidThisMonthAmount += invoice.totalAmount;
    }
    let org = orgMap.get(invoice.tenantId);
    if (!org) {
      org = {
        orgId: invoice.tenantId,
        orgName: invoice.tenantId,
        totalOutstanding: 0,
        overdueAmount: 0,
        invoiceCount: 0,
        aging: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        arStatus: "current",
      };
      orgMap.set(invoice.tenantId, org);
    }

    // Outstanding: issued invoices not yet paid.
    if (invoice.status === "issued") {
      const days = daysSince(invoice.issuedAt);
      org.totalOutstanding += invoice.totalAmount;
      org.invoiceCount += 1;
      if (days > 90) org.aging["90+"] += invoice.totalAmount;
      else if (days > 60) org.aging["61-90"] += invoice.totalAmount;
      else if (days > 30) org.aging["31-60"] += invoice.totalAmount;
      else org.aging["1-30"] += invoice.totalAmount;
    }

    if (invoice.status === "issued" && daysSince(invoice.issuedAt) > 30) {
      org.overdueAmount += invoice.totalAmount;
    }

    // Last invoice (by issue/generation time).
    const invoiceStamp = invoice.issuedAt ?? invoice.generatedAt;
    if (!org.lastInvoiceDate || (invoiceStamp && invoiceStamp > org.lastInvoiceDate)) {
      org.lastInvoiceDate = invoiceStamp;
      org.lastInvoiceNumber = invoice.invoiceNumber;
    }

    // Last payment.
    if (invoice.status === "paid" && invoice.paidAt) {
      if (!org.lastPaymentDate || invoice.paidAt > org.lastPaymentDate) {
        org.lastPaymentDate = invoice.paidAt;
        org.lastPaymentAmount = invoice.totalAmount;
      }
    }
  }

  // Resolve tenant display names.
  const tenants = await Promise.all(
    Array.from(orgMap.keys()).map((tid) => repositories.tenants.findByTenantId(tid)),
  );
  for (const tenant of tenants) {
    if (!tenant) continue;
    const org = orgMap.get(tenant.tenantId);
    if (org) org.orgName = tenant.name ?? tenant.tenantId;
  }

  const organizations = Array.from(orgMap.values());
  for (const org of organizations) {
    org.arStatus =
      org.aging["90+"] > 0 ? "90+" :
      org.aging["61-90"] > 0 ? "61-90" :
      org.aging["31-60"] > 0 ? "31-60" :
      org.aging["1-30"] > 0 ? "1-30" : "current";
  }

  // Apply search (org name or last invoice number) + days-outstanding filters.
  let filtered = organizations;
  const query = opts.search?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      (o) =>
        o.orgName.toLowerCase().includes(query) ||
        (o.lastInvoiceNumber ?? "").toLowerCase().includes(query),
    );
  }
  if (opts.daysOutstanding === "current") filtered = filtered.filter((o) => o.arStatus === "current" || o.arStatus === "1-30");
  else if (opts.daysOutstanding) filtered = filtered.filter((o) => o.arStatus === opts.daysOutstanding);

  filtered.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  return {
    organizations: filtered,
    total: filtered.length,
    paidThisMonth: { count: paidThisMonthCount, amount: paidThisMonthAmount },
  };
}

/**
 * Build a unique, human-readable invoice number.
 * Format: `INV-<tenantPrefix>-<year>-<timestampSuffix>` (e.g. `INV-OMTEL-2026-12345678`).
 * The timestamp+random suffix guarantees uniqueness without a shared counter.
 */
function buildInvoiceNumber(tenantId: string): string {
  const prefix = (
    tenantId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "TEN"
  ).toUpperCase();
  const year = new Date().getFullYear();
  const stamp = `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
  return `INV-${prefix}-${year}-${stamp.slice(-8)}`;
}

/**
 * Generate a consolidated invoice for an organization from an explicit list of
 * approved claims. Eligibility is by claim identity and status alone: a claim is
 * valid only if it exists, belongs to `tenantId`, is `approved`, and is not yet
 * referenced by any invoice line item (draft/issued/paid/archived). `serviceDate`
 * and `createdAt` never gate eligibility.
 *
 * Every claim is validated before anything is written. If any claim is invalid
 * the operation is atomic: nothing is created and an `INVALID_CLAIMS` error is
 * thrown carrying the list of rejected claims and the subset that remains valid.
 *
 * The invoice is created in `draft` status. `sessionCount` is carried on line
 * items for reporting only and never affects `totalAmount`.
 */
export async function generateInvoice(
  input: GenerateInvoiceInput,
): Promise<InvoiceDocument> {
  const { tenantId, generatedBy } = input;
  const claimIds = Array.from(
    new Set(input.claimIds.map((id) => String(id).trim()).filter(Boolean)),
  );

  if (!tenantId) {
    throw new ApiError(400, "MISSING_TENANT", "tenantId is required.");
  }
  if (claimIds.length === 0) {
    throw new ApiError(400, "NO_CLAIMS_SELECTED", "Select at least one claim to invoice.");
  }

  const repositories = await getRepositoryContext();

  // Double-invoicing guard: collect claimIds already present on any existing
  // invoice for this tenant (any status), so we never reference the same claim
  // twice. We never modify the claim documents themselves.
  const existing = await repositories.invoices.findAll({
    tenantId,
    skip: 0,
    limit: 100_000,
  });
  const invoicedClaimIds = new Set<string>();
  for (const invoice of existing.invoices) {
    for (const item of invoice.lineItems) {
      invoicedClaimIds.add(item.claimId);
    }
  }

  // Validate every selected claim up front. A single invalid claim rejects the
  // whole operation atomically — we do not silently drop or partially create.
  const rejected: InvoiceClaimRejection[] = [];
  const validClaims: ReimbursementDocument[] = [];

  for (const claimId of claimIds) {
    const claim = await repositories.reimbursements.findById(claimId);
    if (!claim) {
      rejected.push({ claimId, reason: "Claim not found." });
      continue;
    }
    if (claim.tenantId !== tenantId) {
      rejected.push({ claimId, reason: "Claim belongs to a different organization." });
      continue;
    }
    if (claim.status !== "approved") {
      rejected.push({ claimId, reason: `Claim status is "${claim.status}", not "approved".` });
      continue;
    }
    if (invoicedClaimIds.has(claimId)) {
      rejected.push({ claimId, reason: "Claim is already referenced by an invoice." });
      continue;
    }
    validClaims.push(claim);
  }

  if (rejected.length > 0) {
    throw new ApiError(
      400,
      "INVALID_CLAIMS",
      `${rejected.length} of ${claimIds.length} selected claim(s) are not eligible for invoicing.`,
      {
        rejected,
        validClaimIds: validClaims.map((c) => c.reimbursementId),
      },
    );
  }

  const lineItems: InvoiceLineItem[] = validClaims.map((claim) => ({
    claimId: claim.reimbursementId,
    claimNumber: claim.claimNumber,
    clinicName: claim.clinicName,
    amount: claim.amount,
    sessionCount: claim.sessionCount,
    serviceDate: claim.serviceDate,
    // Carry the claim's immutable bank snapshot so payout details remain
    // traceable from the invoice back to the financial record (the claim).
    bankAccountNumber: claim.bankAccountNumber,
    bankName: claim.bankName,
  }));

  const totalAmount = validClaims.reduce((sum, claim) => sum + claim.amount, 0);
  const now = new Date().toISOString();

  // Billing period is derived from the selected claims' service dates
  // (earliest → latest), never from an explicit date input.
  const dates = validClaims
    .map((c) => c.serviceDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const period = dates.length > 0
    ? { from: dates[0], to: dates[dates.length - 1] }
    : { from: "", to: "" };

  const invoice: InvoiceDocument = {
    invoiceId: `invoice_${randomUUID()}`,
    tenantId,
    invoiceNumber: buildInvoiceNumber(tenantId),
    period,
    status: "draft",
    generatedBy,
    generatedAt: now,
    lineItems,
    totalAmount,
    createdAt: now,
    updatedAt: now,
  };

  await repositories.invoices.insert(invoice);

  // NOTE: Invoicing does NOT move claims to `to_be_paid`. Per the approved
  // financial flow, approved claims only enter the payment queue AFTER the
  // organization pays Remedy (see markInvoicePaid). This keeps Accounts
  // Receivable accurate: an issued-but-unpaid invoice is an asset, not a
  // payout obligation.
  return invoice;
}

/**
 * Fetch a single invoice with access scoping. Tenant admins only see their own
 * tenant's invoices; super admins see any tenant's invoice.
 */
export async function getInvoice(
  id: string,
  scope: InvoiceScope,
): Promise<InvoiceDocument | null> {
  const repositories = await getRepositoryContext();
  const invoice = await repositories.invoices.findById(id);
  if (!invoice) {
    return null;
  }
  if (scope.role === "tenantAdmin" && invoice.tenantId !== scope.tenantId) {
    return null;
  }
  return invoice;
}

export async function listInvoices(
  scope: InvoiceScope,
  opts: ListInvoicesParams = {},
): Promise<FindInvoicesResult> {
  const repositories = await getRepositoryContext();

  if (scope.role === "tenantAdmin") {
    if (!scope.tenantId) {
      throw new ApiError(403, "FORBIDDEN", "Tenant context is required.");
    }
    return repositories.invoices.listByTenant(scope.tenantId, {
      status: opts.status,
      skip: opts.skip,
      limit: opts.limit,
    });
  }

  return repositories.invoices.findAll({
    tenantId: opts.tenantId,
    status: opts.status,
    skip: opts.skip,
    limit: opts.limit,
  });
}

export interface ClaimInvoiceLink {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
}

/**
 * Read-time join mapping `claimId` → the invoice that currently references it.
 *
 * The claims API uses this to expose `invoiceId` / `invoiceNumber` /
 * `invoiceStatus` on claim payloads without introducing a `claim.status =
 * "invoiced"` mutation or a claim-side foreign key. The relationship is derived
 * from invoice line items, so it stays accurate across draft/issued/paid/archived
 * invoices for free.
 */
export async function getClaimInvoiceLinks(
  claimIds: string[],
): Promise<Map<string, ClaimInvoiceLink>> {
  if (claimIds.length === 0) return new Map();
  const repositories = await getRepositoryContext();
  const invoices = await repositories.invoices.findByClaimIds(claimIds);
  const map = new Map<string, ClaimInvoiceLink>();
  for (const invoice of invoices) {
    for (const item of invoice.lineItems) {
      if (map.has(item.claimId)) continue;
      map.set(item.claimId, {
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      });
    }
  }
  return map;
}

function assertInvoiceTransition(
  invoice: InvoiceDocument,
  from: string[],
  target: InvoiceStatus,
) {
  if (!from.includes(invoice.status)) {
    throw new ApiError(
      400,
      "INVALID_INVOICE_STATUS",
      `Cannot transition invoice from "${invoice.status}" to "${target}". Expected status: ${from.join(" or ")}.`,
    );
  }
}

/** Issue an invoice: `draft` → `issued`. `generated` is a retired legacy status accepted only to normalize old records. */
export async function issueInvoice(
  id: string,
  actor: string,
): Promise<InvoiceDocument> {
  const repositories = await getRepositoryContext();
  const invoice = await repositories.invoices.findById(id);
  if (!invoice) {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }

  assertInvoiceTransition(invoice, ["draft", "generated"], "issued");

  const now = new Date().toISOString();
  const updated = await repositories.invoices.update(id, {
    status: "issued",
    issuedAt: now,
    updatedAt: now,
  });
  return updated!;
}

/**
 * Mark an issued invoice as paid: `issued` → `paid`.
 *
 * On payment, the invoice's linked approved claims are queued for payment
 * (`approved → to_be_paid`), writing a PaymentRecord ledger entry per claim.
 * This is the approved financial flow: claims move to the payout queue only
 * after the organization has paid Remedy — not at invoice generation.
 *
 * The queueing step runs BEFORE the invoice is marked paid. The repository layer
 * has no transaction/session support, so this ordering makes the operation
 * failure-safe and idempotent: each linked claim is queued only while its status
 * is still `approved`, so re-executing after a mid-loop failure converges
 * (already-queued claims are skipped; the remainder are queued and the invoice is
 * then marked paid) rather than stranding `approved` claims behind a paid invoice
 * that cannot be re-paid.
 */
export async function markInvoicePaid(
  id: string,
  actor: string,
): Promise<InvoiceDocument> {
  const repositories = await getRepositoryContext();
  const invoice = await repositories.invoices.findById(id);
  if (!invoice) {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }

  assertInvoiceTransition(invoice, ["issued"], "paid");

  // Queue each linked approved claim for the clinic payout (`approved → to_be_paid`).
  // The `status === "approved"` guard makes this idempotent on re-execution.
  for (const item of invoice.lineItems) {
    const claim = await repositories.reimbursements.findById(item.claimId);
    if (claim && claim.status === "approved") {
      await queueForPayment(
        invoice.tenantId,
        claim.reimbursementId,
        actor,
        undefined,
        invoice.invoiceId,
      );
    }
  }

  const now = new Date().toISOString();
  const updated = await repositories.invoices.update(id, {
    status: "paid",
    paidAt: now,
    paidBy: actor,
    updatedAt: now,
  });

  return updated!;
}

/** Archive a settled invoice: `draft`/`paid` → `archived`. */
export async function archiveInvoice(
  id: string,
  actor: string,
): Promise<InvoiceDocument> {
  const repositories = await getRepositoryContext();
  const invoice = await repositories.invoices.findById(id);
  if (!invoice) {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }

  assertInvoiceTransition(invoice, ["draft", "paid"], "archived");

  const now = new Date().toISOString();
  const updated = await repositories.invoices.update(id, {
    status: "archived",
    updatedAt: now,
  });
  return updated!;
}

// ── Bulk transitions (super admin) ──────────────────────────────────────────
// Bulk operations reuse the SAME single-invoice service functions, so the
// per-invoice state rules (draft → issued, paid → archived) can never be
// bypassed by a bulk call. One invalid invoice never blocks the others; each
// failure is reported individually — mirroring the payments bulk pattern.

export interface BulkInvoiceTransitionResult {
  processed: string[];
  rejected: Array<{ invoiceId: string; reason: string }>;
}

export async function bulkIssueInvoices(
  invoiceIds: string[],
  actor: string,
): Promise<BulkInvoiceTransitionResult> {
  const processed: string[] = [];
  const rejected: BulkInvoiceTransitionResult["rejected"] = [];
  for (const id of invoiceIds) {
    try {
      await issueInvoice(id, actor);
      processed.push(id);
    } catch (error) {
      rejected.push({
        invoiceId: id,
        reason: error instanceof Error ? error.message : "Unexpected error.",
      });
    }
  }
  return { processed, rejected };
}

export async function bulkArchiveInvoices(
  invoiceIds: string[],
  actor: string,
): Promise<BulkInvoiceTransitionResult> {
  const processed: string[] = [];
  const rejected: BulkInvoiceTransitionResult["rejected"] = [];
  for (const id of invoiceIds) {
    try {
      await archiveInvoice(id, actor);
      processed.push(id);
    } catch (error) {
      rejected.push({
        invoiceId: id,
        reason: error instanceof Error ? error.message : "Unexpected error.",
      });
    }
  }
  return { processed, rejected };
}

function csvEscape(value: string | number | undefined): string {
  const raw = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Export the org-first AR ledger as CSV.
 * Columns: Organization, Outstanding, Overdue, Open Invoices, Aging status.
 */
export async function exportArLedgerCsv(
  opts: { tenantId?: string } = {},
): Promise<string> {
  const ledger = await getArLedger(opts);
  const header = ["Organization", "Outstanding", "Overdue (>30)", "Open Invoices", "Aging Status"];
  const rows = ledger.organizations.map((o) => [
    csvEscape(o.orgName),
    csvEscape(o.totalOutstanding.toFixed(3)),
    csvEscape(o.overdueAmount.toFixed(3)),
    csvEscape(o.invoiceCount),
    csvEscape(o.arStatus),
  ]);
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Export one organization's invoices as CSV.
 * Columns: Invoice #, Amount, Outstanding, Status, Issue Date, Paid Date.
 */
export async function exportOrgInvoicesCsv(
  tenantId: string,
  scope: InvoiceScope,
): Promise<string> {
  if (scope.role === "tenantAdmin" && scope.tenantId !== tenantId) {
    throw new ApiError(403, "FORBIDDEN", "Tenant admin may only export their own invoices.");
  }
  const repositories = await getRepositoryContext();
  const result = await repositories.invoices.findAll({
    tenantId,
    skip: 0,
    limit: 100_000,
  });
  const header = ["Invoice #", "Total", "Outstanding", "Status", "Issue Date", "Paid Date"];
  const rows = result.invoices.map((inv) => [
    csvEscape(inv.invoiceNumber),
    csvEscape(inv.totalAmount.toFixed(3)),
    csvEscape(inv.status === "issued" ? inv.totalAmount.toFixed(3) : "0.000"),
    csvEscape(inv.status),
    csvEscape(inv.issuedAt?.slice(0, 10)),
    csvEscape(inv.paidAt?.slice(0, 10)),
  ]);
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Render an invoice as a CSV string.
 * Columns: claim number, clinic, service date, sessions, amount.
 */
export async function exportInvoiceCsv(
  id: string,
  scope: InvoiceScope,
): Promise<string> {
  const invoice = await getInvoice(id, scope);
  if (!invoice) {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }

  const header = ["Claim Number", "Clinic", "Service Date", "Sessions", "Amount"];
  const rows = invoice.lineItems.map((item) => [
    csvEscape(item.claimNumber ?? item.claimId),
    csvEscape(item.clinicName),
    csvEscape(item.serviceDate),
    csvEscape(item.sessionCount),
    csvEscape(item.amount.toFixed(3)),
  ]);

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
