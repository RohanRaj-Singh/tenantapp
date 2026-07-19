import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { generateClaimNumber } from "@/src/server/services/claimNumberService";
import { ApiError } from "@/src/server/api/errors";
import type {
  FindReimbursementsOptions,
  FindReimbursementsResult,
} from "@/src/server/repositories/contracts";
import type { ClaimHistoryEntry, ReimbursementDocument } from "@/src/server/db/documents";

type ClaimStatus = ReimbursementDocument["status"];

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
  if (existing.status === "rejected") {
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

  return repositories.reimbursements.update(reimbursementId, updates);
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
  return repositories.reimbursements.update(reimbursementId, {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });
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
  return repositories.reimbursements.update(reimbursementId, {
    status: "rejected",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });
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
  return repositories.reimbursements.update(reimbursementId, {
    status: "frozen",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });
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
  return repositories.reimbursements.update(reimbursementId, {
    status: "paid",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });
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

  return repositories.reimbursements.update(reimbursementId, {
    updatedAt: now,
    history: [...(existing.history ?? []), entry],
  });
}
