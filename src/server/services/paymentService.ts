import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { PaymentRecordDocument } from "@/src/server/db/documents";
import {
  payReimbursement as reimbPayReimbursement,
  queueForPayment as reimbQueueForPayment,
} from "@/src/server/services/reimbursementService";
import { PAYMENT_COUNTER_ID } from "@/src/server/repositories/paymentRecordsRepository";

/**
 * Payment Workflow (Phase 5).
 *
 * The claim state machine is: `approved → to_be_paid → paid`.
 * - `queueForPayment` moves an approved claim into the payment queue
 *   (`to_be_paid`) and writes a `PaymentRecord` ledger entry.
 * - `processPayments` moves `to_be_paid` claims to `paid` and finalizes the
 *   ledger entry with `paidAt`/`paidBy`.
 * - `listPaymentQueue` groups the pending (`to_be_paid`) claims by clinic using
 *   the claim's denormalized `clinicId`/`clinicName` for the payout hub.
 */

export interface PaymentQueueClaim {
  reimbursementId: string;
  claimNumber?: string;
  amount: number;
}

export interface PaymentQueueGroup {
  clinicId: string | null;
  clinicName: string | null;
  totalAmount: number;
  count: number;
  claims: PaymentQueueClaim[];
}

export interface PaymentQueueResult {
  groups: PaymentQueueGroup[];
  total: number;
}

/**
 * Generate a human-readable payment reference for a payout.
 *
 * Format: `PAY-YYYY-NNNNNN` (e.g. `PAY-2026-000042`), using the shared
 * paymentRecords counter. Kept lightweight for Version 1 — bank references are
 * captured separately on the PaymentRecord via `bankReference`.
 */
export async function generatePaymentReference(): Promise<string> {
  const repositories = await getRepositoryContext();
  const sequence = await repositories.paymentRecords.incrementCounter(PAYMENT_COUNTER_ID);
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(6, "0");
  return `PAY-${year}-${padded}`;
}

/**
 * Queue an approved claim for payment.
 *
 * Performs the state-machine transition (`approved → to_be_paid`, history entry,
 * notifications/system event) and ensures a `PaymentRecord` ledger entry exists
 * with `status: "to_be_paid"`. If a record already exists (e.g. re-queued after
 * an invoice), it is refreshed with the latest claim data.
 */
export async function queueForPayment(
  tenantId: string,
  reimbursementId: string,
  actorId: string,
  notes?: string,
  invoiceId?: string,
) {
  const repositories = await getRepositoryContext();
  const claim = await repositories.reimbursements.findById(reimbursementId);

  if (!claim || claim.tenantId !== tenantId) {
    return null;
  }

  const updated = await reimbQueueForPayment(tenantId, reimbursementId, actorId, notes);
  if (!updated) {
    return null;
  }

  const now = new Date().toISOString();
  const existingRecord = await repositories.paymentRecords.findByClaimId(reimbursementId);

  const record: PaymentRecordDocument = {
    ...(existingRecord ?? {
      paymentRecordId: `payrec_${randomUUID()}`,
      createdAt: now,
    }),
    tenantId,
    claimId: reimbursementId,
    amount: claim.amount,
    clinicId: claim.clinicId,
    clinicName: claim.clinicName,
    ...(invoiceId ? { invoiceId } : {}),
    status: "to_be_paid",
    updatedAt: now,
  };

  if (existingRecord) {
    await repositories.paymentRecords.update(existingRecord.paymentRecordId, record);
  } else {
    await repositories.paymentRecords.insert(record);
  }

  return updated;
}

/**
 * Process payouts for `to_be_paid` claims.
 *
 * With no `claimIds`, every `to_be_paid` claim (optionally scoped to a tenant)
 * is paid. Otherwise only the supplied claim IDs that are currently
 * `to_be_paid` are processed. Each claim transitions `to_be_paid → paid` via
 * `payReimbursement` and its `PaymentRecord` is finalized with `paidAt`/`paidBy`.
 */
export async function processPayments(options: {
  tenantId?: string;
  claimIds?: string[];
  actorId: string;
  /** Optional bank/transfer reference supplied by finance at payout time (reconciliation). */
  bankReference?: string;
  /** Optional note for the payout run. */
  notes?: string;
}): Promise<{ processed: number }> {
  const { tenantId, claimIds, actorId, bankReference, notes } = options;
  const repositories = await getRepositoryContext();

  const targets: Array<{ tenantId: string; reimbursementId: string }> = [];

  if (claimIds && claimIds.length > 0) {
    for (const id of claimIds) {
      const claim = await repositories.reimbursements.findById(id);
      if (
        claim &&
        claim.status === "to_be_paid" &&
        (!tenantId || claim.tenantId === tenantId)
      ) {
        targets.push({ tenantId: claim.tenantId, reimbursementId: id });
      }
    }
  } else {
    const result = await repositories.reimbursements.findAll({
      status: "to_be_paid",
      tenantId,
      skip: 0,
      limit: 100_000,
    });
    for (const claim of result.reimbursements) {
      targets.push({ tenantId: claim.tenantId, reimbursementId: claim.reimbursementId });
    }
  }

  let processed = 0;
  for (const target of targets) {
    const updated = await reimbPayReimbursement(
      target.tenantId,
      target.reimbursementId,
      actorId,
    );
    if (!updated) {
      continue;
    }

    const now = new Date().toISOString();
    // Assign a human-readable payment reference for the lightweight
    // reconciliation trail (payment reference / bank reference / paid by / date).
    const paymentReference = await generatePaymentReference();
    const record = await repositories.paymentRecords.findByClaimId(target.reimbursementId);
    if (record) {
      await repositories.paymentRecords.update(record.paymentRecordId, {
        status: "paid",
        paymentReference: record.paymentReference ?? paymentReference,
        ...(bankReference !== undefined ? { bankReference } : {}),
        ...(notes !== undefined ? { notes } : {}),
        paidAt: now,
        paidBy: actorId,
        updatedAt: now,
      });
    } else {
      // Defensive: a claim reached `paid` without a ledger entry.
      await repositories.paymentRecords.insert({
        paymentRecordId: `payrec_${randomUUID()}`,
        tenantId: target.tenantId,
        claimId: target.reimbursementId,
        amount: updated.amount,
        clinicId: updated.clinicId,
        clinicName: updated.clinicName,
        status: "paid",
        paymentReference,
        ...(bankReference !== undefined ? { bankReference } : {}),
        ...(notes !== undefined ? { notes } : {}),
        paidAt: now,
        paidBy: actorId,
        createdAt: now,
        updatedAt: now,
      });
    }
    processed += 1;
  }

  return { processed };
}

export interface PaymentDetailResult {
  paymentRecord: PaymentRecordDocument | null;
  /** The claim this payment settles — the legal reimbursement record (snapshot). */
  claim: {
    reimbursementId: string;
    claimNumber?: string;
    employeeName?: string;
    clinicId?: string;
    clinicName?: string;
    amount?: number;
    sessionCount?: number;
    sessionTypes?: string[];
    serviceDate?: string;
    bankAccountNumber?: string;
    bankName?: string;
    status?: string;
  } | null;
  invoiceNumber?: string;
  tenantName?: string;
}

/**
 * Single-payment detail — the PaymentRecord for a claim plus the full claim
 * snapshot (clinic, employee, bank, sessions, service date) and the funding
 * invoice number. Keyed by claimId (a claim has at most one ledger entry), so
 * both queued (`to_be_paid`) and settled (`paid`) payments are inspectable.
 */
export async function getPaymentDetail(claimId: string): Promise<PaymentDetailResult> {
  const repositories = await getRepositoryContext();
  const record = await repositories.paymentRecords.findByClaimId(claimId);
  if (!record) {
    return { paymentRecord: null, claim: null };
  }

  const [claim, tenant] = await Promise.all([
    repositories.reimbursements.findById(claimId),
    repositories.tenants.findByTenantId(record.tenantId),
  ]);

  let invoiceNumber: string | undefined;
  if (record.invoiceId) {
    const invoice = await repositories.invoices.findById(record.invoiceId);
    invoiceNumber = invoice?.invoiceNumber;
  }

  return {
    paymentRecord: record,
    claim: claim
      ? {
          reimbursementId: claim.reimbursementId,
          claimNumber: claim.claimNumber,
          employeeName: claim.employeeName,
          clinicId: claim.clinicId,
          clinicName: claim.clinicName,
          amount: claim.amount,
          sessionCount: claim.sessionCount,
          sessionTypes: claim.sessionTypes,
          serviceDate: claim.serviceDate,
          bankAccountNumber: claim.bankAccountNumber,
          bankName: claim.bankName,
          status: claim.status,
        }
      : null,
    invoiceNumber,
    tenantName: tenant?.name,
  };
}

/**
 * List the payment queue (`to_be_paid` claims) grouped by clinic.
 *
 * Grouping uses the claim's denormalized `clinicId`/`clinicName`; claims without
 * a clinic are grouped under a `null` clinicId so the super admin can still see
 * them and process the payout.
 */
export async function listPaymentQueue(
  options: { tenantId?: string } = {},
): Promise<PaymentQueueResult> {
  const { tenantId } = options;
  const repositories = await getRepositoryContext();

  const result = await repositories.reimbursements.findAll({
    status: "to_be_paid",
    tenantId,
    skip: 0,
    limit: 100_000,
  });

  const groups = new Map<string, PaymentQueueGroup>();
  let total = 0;

  for (const claim of result.reimbursements) {
    const key = claim.clinicId ?? "__no_clinic__";
    let group = groups.get(key);
    if (!group) {
      group = {
        clinicId: claim.clinicId ?? null,
        clinicName: claim.clinicName ?? null,
        totalAmount: 0,
        count: 0,
        claims: [],
      };
      groups.set(key, group);
    }
    group.totalAmount += claim.amount;
    group.count += 1;
    group.claims.push({
      reimbursementId: claim.reimbursementId,
      claimNumber: claim.claimNumber,
      amount: claim.amount,
    });
    total += 1;
  }

  return {
    groups: Array.from(groups.values()),
    total,
  };
}

// ── Payment Operations Workspace (org-first) ────────────────────────────────

export interface PaymentWorkspaceClaim {
  reimbursementId: string;
  claimNumber?: string;
  employeeName: string;
  amount: number;
  serviceDate?: string;
  queuedAt: string;
  /** Funding invoice (set when the claim was auto-queued by `markInvoicePaid`). */
  invoiceId?: string;
  invoiceNumber?: string;
  /** Claim's immutable bank snapshot — the source of truth for payouts. */
  bankAccountNumber?: string;
  bankName?: string;
  /**
   * Effective payout bank details after legacy fallback resolution.
   * `bankSource === "claim"` → used the claim snapshot.
   * `bankSource === "employee_fallback"` → claim lacked bank; fell back to the
   *   employee profile (legacy compatibility only — new claims never need this).
   */
  effectiveBankAccountNumber?: string;
  effectiveBankName?: string;
  bankSource?: "claim" | "employee_fallback" | "missing";
}

export interface PaymentWorkspaceClinic {
  clinicId: string | null;
  clinicName: string | null;
  totalAmount: number;
  count: number;
  claims: PaymentWorkspaceClaim[];
}

export interface PaymentWorkspaceOrg {
  tenantId: string;
  tenantName: string;
  totalOutstanding: number;
  lastPaymentDate: string | null;
  clinics: PaymentWorkspaceClinic[];
}

export interface PaymentWorkspaceHistoryEntry {
  paymentRecordId: string;
  claimId: string;
  claimNumber?: string;
  /** Invoice that funded this payout (linked when claims are auto-queued by `markInvoicePaid`). */
  invoiceId?: string;
  invoiceNumber?: string;
  tenantName: string;
  clinicName: string | null;
  amount: number;
  paymentReference?: string;
  bankReference?: string;
  paidAt?: string;
  paidBy?: string;
  status: PaymentRecordDocument["status"];
}

export interface PaymentWorkspaceResult {
  summary: {
    outstanding: { count: number; amount: number };
    overdue: { count: number; amount: number };
    paidToday: { count: number; amount: number };
  };
  organizations: PaymentWorkspaceOrg[];
  paymentHistory: PaymentWorkspaceHistoryEntry[];
}

const OVERDUE_DAYS = 14;

/**
 * Build the org-first Payment Operations workspace:
 * `Organizations → Clinics → Claims`.
 *
 * The default view surfaces organizations with totals; clinics and claims are
 * progressively disclosed on drill-down. Payment history (with payment
 * reference / bank reference / paid by / paid date) powers the reconciliation
 * trail. Payment batches are intentionally NOT part of Version 1 — the data
 * model keeps the extension point, but no batch workflows exist yet.
 */
export async function listPaymentOperations(
  options: { tenantId?: string } = {},
): Promise<PaymentWorkspaceResult> {
  const { tenantId } = options;
  const repositories = await getRepositoryContext();

  const queue = await repositories.reimbursements.findAll({
    status: "to_be_paid",
    tenantId,
    skip: 0,
    limit: 100_000,
  });

  // Resolve tenant display names once.
  const tenantIds = [...new Set(queue.reimbursements.map((c) => c.tenantId))];
  const tenantLookup = new Map<string, string>();
  for (const tid of tenantIds) {
    const tenant = await repositories.tenants.findByTenantId(tid);
    tenantLookup.set(tid, tenant?.name ?? tid);
  }

  // Resolve the funding invoice per queued claim (the PaymentRecord carries the
  // invoiceId from `markInvoicePaid`). Surfaced on the workspace so finance can
  // see which invoice funded each payout before processing.
  const queuedRecords = await repositories.paymentRecords.listByStatus("to_be_paid");
  const invoiceByRecord = new Map<string, { invoiceId?: string; invoiceNumber?: string }>();
  const fundingInvoiceIds = [...new Set(queuedRecords.map((r) => r.invoiceId).filter(Boolean) as string[])];
  const fundingInvoiceNumberById = new Map<string, string | undefined>();
  for (const invoiceId of fundingInvoiceIds) {
    const invoice = await repositories.invoices.findById(invoiceId);
    if (invoice) fundingInvoiceNumberById.set(invoiceId, invoice.invoiceNumber);
  }
  for (const record of queuedRecords) {
    invoiceByRecord.set(record.claimId, {
      invoiceId: record.invoiceId,
      invoiceNumber: record.invoiceId ? fundingInvoiceNumberById.get(record.invoiceId) : undefined,
    });
  }

  const orgMap = new Map<string, PaymentWorkspaceOrg>();
  const clinicMap = new Map<string, PaymentWorkspaceClinic>();

  for (const claim of queue.reimbursements) {
    const orgKey = claim.tenantId;
    let org = orgMap.get(orgKey);
    if (!org) {
      org = {
        tenantId: orgKey,
        tenantName: tenantLookup.get(orgKey) ?? orgKey,
        totalOutstanding: 0,
        lastPaymentDate: null,
        clinics: [],
      };
      orgMap.set(orgKey, org);
    }
    org.totalOutstanding += claim.amount;

    const clinicKey = `${orgKey}::${claim.clinicId ?? "__no_clinic__"}`;
    let clinic = clinicMap.get(clinicKey);
    if (!clinic) {
      clinic = {
        clinicId: claim.clinicId ?? null,
        clinicName: claim.clinicName ?? null,
        totalAmount: 0,
        count: 0,
        claims: [],
      };
      clinicMap.set(clinicKey, clinic);
      org.clinics.push(clinic);
    }
    clinic.totalAmount += claim.amount;
    clinic.count += 1;
    const funding = invoiceByRecord.get(claim.reimbursementId);
    clinic.claims.push({
      reimbursementId: claim.reimbursementId,
      claimNumber: claim.claimNumber,
      employeeName: claim.employeeName,
      amount: claim.amount,
      serviceDate: claim.serviceDate,
      queuedAt: claim.updatedAt,
      invoiceId: funding?.invoiceId,
      invoiceNumber: funding?.invoiceNumber,
      bankAccountNumber: claim.bankAccountNumber,
      bankName: claim.bankName,
    });
  }

  // Resolve effective payout bank per claim. The claim's own bank snapshot is
  // the source of truth. For legacy claims that predate bank capture on claims,
  // fall back to the employee profile (marked `employee_fallback`) so payout is
  // not blocked by historical data. New claims always carry their own snapshot.
  {
    const employeeIds = new Set<string>();
    for (const org of orgMap.values()) {
      for (const clinic of org.clinics) {
        for (const c of clinic.claims) {
          if (!c.bankAccountNumber && !c.bankName && c.employeeName) {
            const claimDoc = queue.reimbursements.find((r) => r.reimbursementId === c.reimbursementId);
            if (claimDoc?.employeeId) employeeIds.add(claimDoc.employeeId);
          }
        }
      }
    }
    const employeeById = new Map<string, { bankAccountNumber?: string; bankName?: string }>();
    for (const empId of employeeIds) {
      const emp = await repositories.employees.findById(empId);
      if (emp) employeeById.set(empId, { bankAccountNumber: emp.bankAccountNumber, bankName: emp.bankName });
    }
    for (const org of orgMap.values()) {
      for (const clinic of org.clinics) {
        for (const c of clinic.claims) {
          const hasClaimBank = Boolean(c.bankAccountNumber && c.bankName);
          if (hasClaimBank) {
            c.effectiveBankAccountNumber = c.bankAccountNumber;
            c.effectiveBankName = c.bankName;
            c.bankSource = "claim";
            continue;
          }
          const claimDoc = queue.reimbursements.find((r) => r.reimbursementId === c.reimbursementId);
          const emp = claimDoc?.employeeId ? employeeById.get(claimDoc.employeeId) : undefined;
          if (emp?.bankAccountNumber && emp.bankName) {
            c.effectiveBankAccountNumber = emp.bankAccountNumber;
            c.effectiveBankName = emp.bankName;
            c.bankSource = "employee_fallback";
          } else {
            c.bankSource = "missing";
          }
        }
      }
    }
  }

  // Attach last payment date per org from paid ledger entries.
  const paidRecords = await repositories.paymentRecords.listByStatus("paid");
  const paidByTenant = new Map<string, string | null>();
  for (const record of paidRecords) {
    const current = paidByTenant.get(record.tenantId) ?? null;
    if (record.paidAt && (!current || record.paidAt > current)) {
      paidByTenant.set(record.tenantId, record.paidAt);
    }
  }
  for (const org of orgMap.values()) {
    org.lastPaymentDate = paidByTenant.get(org.tenantId) ?? null;
  }

  // Summary KPIs.
  const now = Date.now();
  let overdueCount = 0;
  let overdueAmount = 0;
  for (const claim of queue.reimbursements) {
    const queuedMs = new Date(claim.updatedAt).getTime();
    if (now - queuedMs > OVERDUE_DAYS * 86400000) {
      overdueCount += 1;
      overdueAmount += claim.amount;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const paidToday = paidRecords.filter((r) =>
    r.paidAt?.slice(0, 10) === today && (!tenantId || r.tenantId === tenantId));
  const paidTodayAmount = paidToday.reduce((sum, r) => sum + r.amount, 0);

  // Payment history (lightweight reconciliation trail).
  // Resolve invoice numbers for per-payout invoice linkage (which invoice funded each payout).
  const invoiceIds = [...new Set(paidRecords.map((r) => r.invoiceId).filter(Boolean) as string[])];
  const invoiceNumberById = new Map<string, string | undefined>();
  for (const invoiceId of invoiceIds) {
    const invoice = await repositories.invoices.findById(invoiceId);
    if (invoice) invoiceNumberById.set(invoiceId, invoice.invoiceNumber);
  }

  const history: PaymentWorkspaceHistoryEntry[] = [];
  for (const record of paidRecords) {
    if (tenantId && record.tenantId !== tenantId) continue;
    const claim = await repositories.reimbursements.findById(record.claimId);
    history.push({
      paymentRecordId: record.paymentRecordId,
      claimId: record.claimId,
      claimNumber: claim?.claimNumber,
      invoiceId: record.invoiceId,
      invoiceNumber: record.invoiceId ? invoiceNumberById.get(record.invoiceId) : undefined,
      tenantName: tenantLookup.get(record.tenantId) ?? record.tenantId,
      clinicName: record.clinicName ?? claim?.clinicName ?? null,
      amount: record.amount,
      paymentReference: record.paymentReference,
      bankReference: record.bankReference,
      paidAt: record.paidAt,
      paidBy: record.paidBy,
      status: record.status,
    });
  }
  history.sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));

  return {
    summary: {
      outstanding: {
        count: queue.reimbursements.length,
        amount: queue.reimbursements.reduce((sum, c) => sum + c.amount, 0),
      },
      overdue: { count: overdueCount, amount: overdueAmount },
      paidToday: { count: paidToday.length, amount: paidTodayAmount },
    },
    organizations: Array.from(orgMap.values()),
    paymentHistory: history,
  };
}
