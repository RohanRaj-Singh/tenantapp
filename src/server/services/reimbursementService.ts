import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { generateClaimNumber } from "@/src/server/services/claimNumberService";
import { ApiError } from "@/src/server/api/errors";
import type {
  FindReimbursementsOptions,
  FindReimbursementsResult,
} from "@/src/server/repositories/contracts";
import type {
  ClaimHistoryEntry,
  NotificationRecipientType,
  NotificationType,
  ReimbursementDocument,
} from "@/src/server/db/documents";
import { notify, notifyTenantAdmins } from "@/src/server/services/notificationService";
import { postOfficialUpdate, postSystemMessage } from "@/src/server/services/claimMessageService";

type ClaimStatus = ReimbursementDocument["status"];

/**
 * Best-effort side-effect dispatch (notifications, chat system messages, official
 * update bridges). Failures must never block a claim transition, so errors are
 * logged and swallowed.
 */
async function fireSideEffect(dispatch: () => Promise<void>) {
  try {
    await dispatch();
  } catch (error) {
    console.error("[notifications] failed to create notification:", error);
  }
}

async function notifyClaimRecipient(
  claim: { tenantId: string; reimbursementId: string; claimNumber?: string },
  recipient: { recipientType: NotificationRecipientType; recipientId: string },
  input: { type: NotificationType; title: string; body: string },
  tenantIdOverride?: string,
) {
  await fireSideEffect(() =>
    notify({
      // Platform-wide recipients (super admin) use tenantId "" so they are
      // queryable across all tenants; tenant-scoped recipients use the claim's tenant.
      tenantId: tenantIdOverride ?? claim.tenantId,
      claimId: claim.reimbursementId,
      claimNumber: claim.claimNumber,
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      ...input,
    }),
  );
}

async function emitSystemEvent(
  claim: { tenantId: string; reimbursementId: string },
  body: string,
) {
  await fireSideEffect(async () => {
    await postSystemMessage({ tenantId: claim.tenantId, claimId: claim.reimbursementId, body });
  });
}

/**
 * Validates whether a status transition is allowed by the state machine.
 *
 * Rules (approved business workflow — see docs/CLAIM_STATE_MACHINE_AUDIT.md):
 *   pending    → in_progress, rejected
 *   in_progress → frozen, approved, rejected
 *   frozen     → in_progress, approved, rejected
 *   approved   → to_be_paid
 *   to_be_paid → paid
 *   paid       → (terminal — no transitions allowed)
 *   rejected   → (terminal in the table; resubmit to pending happens only via
 *                 employee edit/resubmission in updateReimbursement)
 */
function assertValidTransition(current: ClaimStatus, target: ClaimStatus) {
  const allowed: Record<ClaimStatus, ClaimStatus[]> = {
    pending: ["in_progress", "rejected"],
    in_progress: ["frozen", "approved", "rejected"],
    frozen: ["in_progress", "approved", "rejected"],
    approved: ["to_be_paid"],
    to_be_paid: ["paid"],
    paid: [],
    rejected: [],
  };

  const transitions = allowed[current];
  if (!transitions || !transitions.includes(target)) {
    throw new ApiError(
      400,
      "INVALID_STATUS_TRANSITION",
      `Cannot change status from "${current}" to "${target}". Allowed transitions from "${current}": ${(allowed[current] ?? []).join(", ") || "(none — terminal status)"}.`,
    );
  }
}

export async function listReimbursements(
  tenantId: string,
  options?: FindReimbursementsOptions,
): Promise<FindReimbursementsResult> {
  const repositories = await getRepositoryContext();
  return repositories.reimbursements.findByTenantId(tenantId, options);
}

export async function getReimbursement(
  tenantId: string,
  reimbursementId: string,
) {
  const repositories = await getRepositoryContext();
  const reimbursement = await repositories.reimbursements.findById(reimbursementId);

  if (!reimbursement || reimbursement.tenantId !== tenantId) {
    return null;
  }

  return reimbursement;
}

export async function createReimbursement(
  tenantId: string,
  data: {
    employeeId: string;
    employeeName: string;
    type: string;
    amount: number;
    description: string;
    receiptUrl?: string;
    receiptHash?: string;
    serviceDate?: string;
    sessionCount?: number;
    sessionTypes?: string[];
    sessionFor?: string;
    sessionForOther?: string;
    contactCountryCode?: string;
    contactNumber?: string;
    bankAccountNumber?: string;
    bankName?: string;
  },
) {
  const now = new Date().toISOString();
  const claimNumber = await generateClaimNumber();
  const firstEntry: ClaimHistoryEntry = {
    status: "pending",
    actorId: data.employeeId,
    actorRole: "employee",
    timestamp: now,
  };
  const reimbursement = {
    reimbursementId: `reimb_${randomUUID()}`,
    claimNumber,
    tenantId,
    employeeId: data.employeeId,
    employeeName: data.employeeName.trim(),
    type: data.type.trim(),
    amount: data.amount,
    description: data.description.trim(),
    receiptUrl: data.receiptUrl?.trim(),
    ...(data.receiptHash ? { receiptHash: data.receiptHash } : {}),
    ...(data.serviceDate ? { serviceDate: data.serviceDate } : {}),
    ...(data.sessionCount !== undefined ? { sessionCount: data.sessionCount } : {}),
    ...(data.sessionTypes !== undefined ? { sessionTypes: data.sessionTypes } : {}),
    ...(data.sessionFor !== undefined ? { sessionFor: data.sessionFor } : {}),
    ...(data.sessionForOther !== undefined ? { sessionForOther: data.sessionForOther } : {}),
    ...(data.contactCountryCode !== undefined ? { contactCountryCode: data.contactCountryCode } : {}),
    ...(data.contactNumber !== undefined ? { contactNumber: data.contactNumber } : {}),
    ...(data.bankAccountNumber !== undefined ? { bankAccountNumber: data.bankAccountNumber } : {}),
    ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
    status: "pending" as const,
    history: [firstEntry],
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.reimbursements.insert(reimbursement);

  // Notify the employee that a claim was created (e.g. on their behalf by the tenant admin)
  await fireSideEffect(() =>
    notify({
      tenantId,
      claimId: reimbursement.reimbursementId,
      claimNumber: reimbursement.claimNumber,
      recipientType: "employee",
      recipientId: reimbursement.employeeId,
      type: "claim_submitted",
      title: "Claim submitted",
      body: `Your claim ${reimbursement.claimNumber ?? reimbursement.reimbursementId} has been submitted for review.`,
    }),
  );
  await emitSystemEvent(reimbursement, "Claim submitted");
  if (reimbursement.receiptUrl) {
    await emitSystemEvent(reimbursement, "Receipt uploaded");
  }

  return reimbursement;
}

export async function updateReimbursement(
  tenantId: string,
  reimbursementId: string,
  data: {
    employeeId?: string;
    employeeName?: string;
    type?: string;
    amount?: number;
    description?: string;
    receiptUrl?: string;
    notes?: string;
    sessionCount?: number;
    sessionTypes?: string[];
    sessionFor?: string;
    sessionForOther?: string;
    contactCountryCode?: string;
    contactNumber?: string;
    bankAccountNumber?: string;
    bankName?: string;
  },
  options?: { resubmit?: boolean },
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  // Paid claims are read-only: no field edits (amount/receipt/sessions) and no
  // resubmission. History stays viewable, but the claim itself is terminal.
  if (existing.status === "paid") {
    throw new ApiError(
      400,
      "CLAIM_READ_ONLY",
      "Paid claims are read-only and cannot be edited.",
    );
  }

  const updates: Partial<typeof existing> = {};
  if (data.employeeId !== undefined) updates.employeeId = data.employeeId;
  if (data.employeeName !== undefined) updates.employeeName = data.employeeName.trim();
  if (data.type !== undefined) updates.type = data.type.trim();
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.description !== undefined) updates.description = data.description.trim();
  if (data.receiptUrl !== undefined) updates.receiptUrl = data.receiptUrl.trim();
  if (data.notes !== undefined) updates.notes = data.notes.trim();
  if (data.sessionCount !== undefined) updates.sessionCount = data.sessionCount;
  if (data.sessionTypes !== undefined) updates.sessionTypes = data.sessionTypes;
  if (data.sessionFor !== undefined) updates.sessionFor = data.sessionFor;
  if (data.sessionForOther !== undefined) updates.sessionForOther = data.sessionForOther;
  if (data.contactCountryCode !== undefined) updates.contactCountryCode = data.contactCountryCode;
  if (data.contactNumber !== undefined) updates.contactNumber = data.contactNumber;
  if (data.bankAccountNumber !== undefined) updates.bankAccountNumber = data.bankAccountNumber;
  if (data.bankName !== undefined) updates.bankName = data.bankName;

  const now = new Date().toISOString();
  updates.updatedAt = now;

  // Only an employee resubmission (options.resubmit === true) may move a
  // rejected claim back to pending. Tenant-admin edits must NOT resubmit —
  // rejected → pending is reserved for the employee path (approved workflow).
  let resubmitted = false;
  if (existing.status === "rejected" && options?.resubmit === true) {
    resubmitted = true;
    updates.status = "pending";
    const historyEntry: ClaimHistoryEntry = {
      status: "pending",
      actorId: data.employeeId ?? tenantId,
      actorRole: "employee",
      note: data.notes?.trim() ? `Resubmitted: ${data.notes.trim()}` : "Resubmitted after rejection",
      timestamp: now,
    };
    updates.history = [...(existing.history ?? []), historyEntry];
  }

  const updated = await repositories.reimbursements.update(reimbursementId, updates);

  if (updated && resubmitted) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    // Confirm to the employee that their edit went back into the queue…
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_resubmitted",
        title: "Claim resubmitted",
        body: `Your claim ${reference} has been resubmitted for review.`,
      },
    );
    // …and alert the tenant admin (reviewer) that it needs review again.
    await fireSideEffect(() =>
      notifyTenantAdmins({
        tenantId: existing.tenantId,
        claimId: existing.reimbursementId,
        claimNumber: existing.claimNumber,
        type: "claim_resubmitted",
        title: "Claim resubmitted",
        body: `${existing.employeeName} resubmitted claim ${reference} for review.`,
      }),
    );
    await emitSystemEvent(existing, "Claim resubmitted");
  }

  return updated;
}

export async function approveReimbursement(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
  notes?: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  assertValidTransition(existing.status, "approved");

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = { status: "approved", actorId: reviewerId, actorRole: "tenantAdmin", ...(notes ? { note: notes.trim() } : {}), timestamp: now };
  const updated = await repositories.reimbursements.update(reimbursementId, {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      { type: "claim_approved", title: "Claim approved", body: `Your claim ${reference} has been approved.` },
    );
    // Super Admin sees approved claims as "ready for payout" (platform-wide, tenantId "")
    await notifyClaimRecipient(
      existing,
      { recipientType: "superAdmin", recipientId: "super-admin" },
      { type: "claim_approved", title: "Claim approved", body: `Claim ${reference} is approved and ready for payout.` },
      "",
    );
    await emitSystemEvent(existing, "Claim approved");
  }

  return updated;
}

export async function rejectReimbursement(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
  notes?: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  assertValidTransition(existing.status, "rejected");

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = { status: "rejected", actorId: reviewerId, actorRole: "tenantAdmin", ...(notes ? { note: notes.trim() } : {}), timestamp: now };
  const updated = await repositories.reimbursements.update(reimbursementId, {
    status: "rejected",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    const reason = notes?.trim();
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_rejected",
        title: "Claim rejected",
        body: reason
          ? `Your claim ${reference} was not approved. Reason: ${reason}`
          : `Your claim ${reference} was not approved.`,
      },
    );
    await emitSystemEvent(existing, "Claim rejected");
  }

  return updated;
}

export async function freezeReimbursement(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
  notes?: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  assertValidTransition(existing.status, "frozen");

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = { status: "frozen", actorId: reviewerId, actorRole: "tenantAdmin", ...(notes ? { note: notes.trim() } : {}), timestamp: now };
  const updated = await repositories.reimbursements.update(reimbursementId, {
    status: "frozen",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_frozen",
        title: "Claim frozen",
        body: `Your claim ${reference} is temporarily on hold${notes?.trim() ? `: ${notes.trim()}` : ""}.`,
      },
    );
    await emitSystemEvent(existing, "Claim frozen");
  }

  return updated;
}

/**
 * Queue an approved claim for payment: `approved → to_be_paid`.
 *
 * Approved claims enter the payment queue (Phase 5). Paying is a separate,
 * later event performed by the super admin once the money is actually sent.
 */
export async function queueForPayment(
  tenantId: string,
  reimbursementId: string,
  actorId: string,
  notes?: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  assertValidTransition(existing.status, "to_be_paid");

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = { status: "to_be_paid", actorId, actorRole: "tenantAdmin", ...(notes ? { note: notes.trim() } : {}), timestamp: now };
  const updated = await repositories.reimbursements.update(reimbursementId, {
    status: "to_be_paid",
    reviewedBy: actorId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_payment_queued",
        title: "Claim queued for payment",
        body: `Your claim ${reference} has been approved for payout and is queued for payment.`,
      },
    );
    await notifyClaimRecipient(
      existing,
      { recipientType: "superAdmin", recipientId: "super-admin" },
      {
        type: "claim_payment_queued",
        title: "Claim queued for payment",
        body: `Claim ${reference} is queued for payment and awaiting payout.`,
      },
      "",
    );
    await emitSystemEvent(existing, "Claim queued for payment");
  }

  return updated;
}

export async function payReimbursement(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
  notes?: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  assertValidTransition(existing.status, "paid");

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = { status: "paid", actorId: reviewerId, actorRole: "tenantAdmin", ...(notes ? { note: notes.trim() } : {}), timestamp: now };
  const updated = await repositories.reimbursements.update(reimbursementId, {
    status: "paid",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_paid",
        title: "Claim paid",
        body: `Your claim ${reference} has been paid.`,
      },
    );
    await emitSystemEvent(existing, "Claim paid");
  }

  return updated;
}

export async function markInProgress(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
  notes?: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  assertValidTransition(existing.status, "in_progress");

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = { status: "in_progress", actorId: reviewerId, actorRole: "tenantAdmin", ...(notes ? { note: notes.trim() } : {}), timestamp: now };
  const updated = await repositories.reimbursements.update(reimbursementId, {
    status: "in_progress",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_in_progress",
        title: "Claim in progress",
        body: `Your claim ${reference} is now being reviewed.`,
      },
    );
    await emitSystemEvent(existing, "Claim in progress");
  }

  return updated;
}

// ── Employee-Facing Claim Creation ──────────────────────────────────────────

export async function createEmployeeReimbursement(
  tenantId: string,
  employeeId: string,
  employeeName: string,
  data: {
    clinicId: string;
    clinicName: string;
    amount: number;
    description: string;
    receiptUrl?: string;
    receiptHash?: string;
    serviceDate?: string;
    sessionCount?: number;
    sessionTypes?: string[];
    sessionFor?: string;
    sessionForOther?: string;
    contactCountryCode?: string;
    contactNumber?: string;
    bankAccountNumber?: string;
    bankName?: string;
  },
) {
  const now = new Date().toISOString();
  const claimNumber = await generateClaimNumber();
  const firstEntry: ClaimHistoryEntry = {
    status: "pending",
    actorId: employeeId,
    actorRole: "employee",
    timestamp: now,
  };
  const reimbursement = {
    reimbursementId: `reimb_${randomUUID()}`,
    claimNumber,
    tenantId,
    employeeId,
    employeeName: employeeName.trim(),
    type: "reimbursement",
    amount: data.amount,
    description: data.description.trim(),
    receiptUrl: data.receiptUrl?.trim(),
    ...(data.receiptHash ? { receiptHash: data.receiptHash } : {}),
    ...(data.serviceDate ? { serviceDate: data.serviceDate } : {}),
    ...(data.sessionCount !== undefined ? { sessionCount: data.sessionCount } : {}),
    ...(data.sessionTypes !== undefined ? { sessionTypes: data.sessionTypes } : {}),
    ...(data.sessionFor !== undefined ? { sessionFor: data.sessionFor } : {}),
    ...(data.sessionForOther !== undefined ? { sessionForOther: data.sessionForOther } : {}),
    ...(data.contactCountryCode !== undefined ? { contactCountryCode: data.contactCountryCode } : {}),
    ...(data.contactNumber !== undefined ? { contactNumber: data.contactNumber } : {}),
    ...(data.bankAccountNumber !== undefined ? { bankAccountNumber: data.bankAccountNumber } : {}),
    ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
    clinicId: data.clinicId,
    clinicName: data.clinicName.trim(),
    status: "pending" as const,
    history: [firstEntry],
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.reimbursements.insert(reimbursement);

  // Notify the employee (submission confirmation) and the tenant admin (awaiting review)
  await fireSideEffect(() =>
    notify({
      tenantId,
      claimId: reimbursement.reimbursementId,
      claimNumber: reimbursement.claimNumber,
      recipientType: "employee",
      recipientId: reimbursement.employeeId,
      type: "claim_submitted",
      title: "Claim submitted",
      body: `Your claim ${reimbursement.claimNumber ?? reimbursement.reimbursementId} has been submitted for review.`,
    }),
  );
  await fireSideEffect(() =>
    notifyTenantAdmins({
      tenantId,
      claimId: reimbursement.reimbursementId,
      claimNumber: reimbursement.claimNumber,
      type: "claim_submitted",
      title: "New claim submitted",
      body: `${employeeName} submitted claim ${reimbursement.claimNumber ?? reimbursement.reimbursementId} for review.`,
    }),
  );
  await emitSystemEvent(reimbursement, "Claim submitted");
  if (reimbursement.receiptUrl) {
    await emitSystemEvent(reimbursement, "Receipt uploaded");
  }

  return reimbursement;
}

// ── Progress Update ──────────────────────────────────────────────────────────

/**
 * Post a progress update message to a claim's history without changing its status.
 * Used for sending updates like "Currently with finance" or "Almost done."
 * The message is appended to the claim history so it's visible to the employee/clinic.
 */
export async function postProgressUpdate(
  tenantId: string,
  reimbursementId: string,
  message: string,
  actorId: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const now = new Date().toISOString();
  const entry: ClaimHistoryEntry = {
    status: existing.status,
    actorId,
    actorRole: "tenantAdmin",
    note: message.trim(),
    timestamp: now,
  };

  const updated = await repositories.reimbursements.update(reimbursementId, {
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });

  if (updated) {
    const reference = existing.claimNumber ?? existing.reimbursementId;
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "progress_update_sent",
        title: "New update on your claim",
        body: `Update on ${reference}: ${message.trim()}`,
      },
    );
    // Bridge into the claim chat as an official update (best-effort)
    await fireSideEffect(() =>
      postOfficialUpdate({
        tenantId: existing.tenantId,
        claimId: existing.reimbursementId,
        actorId,
        message,
      }),
    );
  }

  return updated;
}

// ── Bulk Progress Update ─────────────────────────────────────────────────────

/**
 * Post a progress update message to many claims at once (FR-046).
 *
 * For each claim ID the claim is looked up, verified to belong to `tenantId`,
 * then `postProgressUpdate` is called (which appends a history entry, bridges an
 * `official_update` chat message, and notifies the employee). Claims that are
 * not found or belong to another tenant are skipped — they do not fail the batch.
 *
 * Any non-terminal claim can receive a progress update, consistent with the
 * existing single-claim behavior (`postProgressUpdate` does not restrict status).
 *
 * @returns `{ updated, skipped }` where `updated` is the number of claims that
 *          received the update and `skipped` is the number that were not found
 *          / not owned by the tenant.
 */
export async function bulkPostProgressUpdate(
  tenantId: string,
  claimIds: string[],
  message: string,
  actorId: string,
): Promise<{ updated: number; skipped: number }> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new ApiError(400, "MESSAGE_REQUIRED", "Message is required.");
  }

  let updated = 0;
  let skipped = 0;

  for (const claimId of claimIds) {
    const result = await postProgressUpdate(tenantId, claimId, trimmed, actorId);
    if (result) {
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  return { updated, skipped };
}
