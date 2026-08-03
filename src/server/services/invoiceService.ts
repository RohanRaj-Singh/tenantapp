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
  from: string;
  to: string;
  generatedBy: string;
}

export interface ListInvoicesParams extends ListInvoicesOptions {
  /** Optional tenant filter used by super-admin callers. */
  tenantId?: string;
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

function assertValidPeriod(from: string, to: string) {
  if (!from || !to) {
    throw new ApiError(400, "INVALID_PERIOD", "from and to dates are required.");
  }
  if (from > to) {
    throw new ApiError(400, "INVALID_PERIOD", "from must be on or before to.");
  }
}

/**
 * Generate a consolidated invoice for an organization from approved claims whose
 * service date falls within `[from, to]`. Claims already referenced by any
 * existing invoice line item are excluded (double-invoicing guard).
 *
 * The invoice is created in `draft` status. `sessionCount` is carried on line
 * items for reporting only and never affects `totalAmount`.
 */
export async function generateInvoice(
  input: GenerateInvoiceInput,
): Promise<InvoiceDocument> {
  const { tenantId, from, to, generatedBy } = input;
  assertValidPeriod(from, to);

  const repositories = await getRepositoryContext();

  // Double-invoicing guard: collect claimIds already present on any existing
  // invoice for this tenant (we never modify the claim documents).
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

  const approved = await repositories.reimbursements.findAll({
    tenantId,
    status: "approved",
    skip: 0,
    limit: 100_000,
  });

  const eligible = approved.reimbursements.filter((claim) => {
    if (!claim.serviceDate) {
      return false;
    }
    if (claim.serviceDate < from || claim.serviceDate > to) {
      return false;
    }
    if (invoicedClaimIds.has(claim.reimbursementId)) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    throw new ApiError(
      400,
      "NO_CLAIMS_TO_INVOICE",
      "No approved claims found in the selected period that are not already invoiced.",
    );
  }

  const lineItems: InvoiceLineItem[] = eligible.map((claim) => ({
    claimId: claim.reimbursementId,
    claimNumber: claim.claimNumber,
    clinicName: claim.clinicName,
    amount: claim.amount,
    sessionCount: claim.sessionCount,
    serviceDate: claim.serviceDate,
  }));

  const totalAmount = eligible.reduce((sum, claim) => sum + claim.amount, 0);
  const now = new Date().toISOString();

  const invoice: InvoiceDocument = {
    invoiceId: `invoice_${randomUUID()}`,
    tenantId,
    invoiceNumber: buildInvoiceNumber(tenantId),
    period: { from, to },
    status: "draft",
    generatedBy,
    generatedAt: now,
    lineItems,
    totalAmount,
    createdAt: now,
    updatedAt: now,
  };

  await repositories.invoices.insert(invoice);

  // Phase 5 — invoicing an approved claim marks it `to_be_paid`: the claim
  // enters the payment queue so the super admin can run the payout. Each queue
  // transition also writes a PaymentRecord ledger entry linked to this invoice.
  for (const claim of eligible) {
    await queueForPayment(
      tenantId,
      claim.reimbursementId,
      generatedBy,
      undefined,
      invoice.invoiceId,
    );
  }

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

function assertInvoiceTransition(
  invoice: InvoiceDocument,
  from: InvoiceStatus[],
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

/** Issue an invoice: `draft`/`generated` → `issued`. */
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

/** Mark an issued invoice as paid: `issued` → `paid`. */
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

  const now = new Date().toISOString();
  const updated = await repositories.invoices.update(id, {
    status: "paid",
    paidAt: now,
    updatedAt: now,
  });
  return updated!;
}

function csvEscape(value: string | number | undefined): string {
  const raw = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
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
