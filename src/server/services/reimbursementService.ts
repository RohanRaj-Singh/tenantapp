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
import { postOfficialUpdate } from "@/src/server/services/claimMessageService";

type ClaimStatus = ReimbursementDocument["status"];

/**
 * Best-effort notification dispatch. Notification failures must never block a
 * claim transition, so errors are logged and swallowed.
 */
async function fireNotification(dispatch: () => Promise<void>) {
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
  await fireNotification(() =>
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

/**
 * Validates whether a status transition is allowed by the state machine.
 *
 * Rules:
 *   pending    → in_progress, frozen, approved, rejected
 *   in_progress → frozen, approved, rejected
 *   frozen     → in_progress, approved, rejected
 *   approved   → paid
 *   paid       → (terminal — no transitions allowed)
 *   rejected   → (terminal — no transitions allowed; editing still possible via update)
 */
function assertValidTransition(current: ClaimStatus, target: ClaimStatus) {
  const allowed: Record<ClaimStatus, ClaimStatus[]> = {
    pending: ["in_progress", "frozen", "approved", "rejected"],
    in_progress: ["frozen", "approved", "rejected"],
    frozen: ["in_progress", "approved", "rejected"],
    approved: ["paid"],
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
  await fireNotification(() =>
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
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
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

  // When a rejected claim is edited, resubmit it for review
  let resubmitted = false;
  if (existing.status === "rejected") {
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
    await notifyClaimRecipient(
      existing,
      { recipientType: "employee", recipientId: existing.employeeId },
      {
        type: "claim_resubmitted",
        title: "Claim resubmitted",
        body: `Your claim ${reference} has been resubmitted for review.`,
      },
    );
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
  await fireNotification(() =>
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
  await fireNotification(() =>
    notifyTenantAdmins({
      tenantId,
      claimId: reimbursement.reimbursementId,
      claimNumber: reimbursement.claimNumber,
      type: "claim_submitted",
      title: "New claim submitted",
      body: `${employeeName} submitted claim ${reimbursement.claimNumber ?? reimbursement.reimbursementId} for review.`,
    }),
  );

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
    await fireNotification(() =>
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
