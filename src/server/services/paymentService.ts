import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { PaymentRecordDocument } from "@/src/server/db/documents";
import {
  payReimbursement as reimbPayReimbursement,
  queueForPayment as reimbQueueForPayment,
} from "@/src/server/services/reimbursementService";

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
}): Promise<{ processed: number }> {
  const { tenantId, claimIds, actorId } = options;
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
    const record = await repositories.paymentRecords.findByClaimId(target.reimbursementId);
    if (record) {
      await repositories.paymentRecords.update(record.paymentRecordId, {
        status: "paid",
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
