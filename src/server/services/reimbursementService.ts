import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type {
  FindReimbursementsOptions,
  FindReimbursementsResult,
} from "@/src/server/repositories/contracts";

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
  },
) {
  const now = new Date().toISOString();
  const reimbursement = {
    reimbursementId: `reimb_${randomUUID()}`,
    tenantId,
    employeeId: data.employeeId,
    employeeName: data.employeeName.trim(),
    type: data.type.trim(),
    amount: data.amount,
    description: data.description.trim(),
    receiptUrl: data.receiptUrl?.trim(),
    status: "pending" as const,
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
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const now = new Date().toISOString();
  return repositories.reimbursements.update(reimbursementId, {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
  });
}

export async function rejectReimbursement(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const now = new Date().toISOString();
  return repositories.reimbursements.update(reimbursementId, {
    status: "rejected",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
  });
}

export async function freezeReimbursement(
  tenantId: string,
  reimbursementId: string,
  reviewerId: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.reimbursements.findById(reimbursementId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const now = new Date().toISOString();
  return repositories.reimbursements.update(reimbursementId, {
    status: "frozen",
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
  });
}
