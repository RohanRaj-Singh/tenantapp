import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { generateClaimNumber } from "@/src/server/services/claimNumberService";
import type {
  FindReimbursementsOptions,
  FindReimbursementsResult,
} from "@/src/server/repositories/contracts";
import type { ClaimHistoryEntry } from "@/src/server/db/documents";

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
  updates.updatedAt = new Date().toISOString();

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

  // Only approved claims can be marked as paid
  if (existing.status !== "approved") {
    throw new Error("Only approved claims can be marked as paid.");
  }

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
