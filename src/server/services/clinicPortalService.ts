import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { generateClaimNumber } from "@/src/server/services/claimNumberService";
import { notify, notifyTenantAdmins } from "@/src/server/services/notificationService";
import { postSystemMessage } from "@/src/server/services/claimMessageService";
import type {
  ClaimMessageParticipant,
  ClaimHistoryEntry,
  ReimbursementDocument,
} from "@/src/server/db/documents";
import type { ClinicAuthContext } from "@/src/modules/clinic-auth/contracts/types";
import type { FindReimbursementsOptions } from "@/src/server/repositories/contracts";

/**
 * Anonymous clinic-facing claim shape. Clinics never see employee names,
 * bank details, or contact numbers — only the employee code.
 */
export type ClinicReimbursementView = Omit<
  ReimbursementDocument,
  | "employeeName"
  | "bankAccountNumber"
  | "bankName"
  | "contactCountryCode"
  | "contactNumber"
> & {
  employeeCode: string | null;
};

function stripPiiForClinic(
  claim: ReimbursementDocument,
  employeeCode: string | null,
): ClinicReimbursementView {
  const {
    employeeName: _employeeName,
    bankAccountNumber: _bankAccountNumber,
    bankName: _bankName,
    contactCountryCode: _contactCountryCode,
    contactNumber: _contactNumber,
    ...rest
  } = claim;

  return {
    ...rest,
    employeeCode,
  };
}

export async function resolveEmployeeCode(
  employeeId: string,
): Promise<string | null> {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);
  return employee?.employeeCode ?? null;
}

/**
 * True when the clinic user may access a claim: the claim's tenant is in the
 * user's `tenantIds` AND the claim's clinic is in the user's `clinicIds`.
 */
export function canClinicAccessClaim(
  user: ClinicAuthContext["user"],
  claim: ReimbursementDocument,
): boolean {
  if (!user.tenantIds.includes(claim.tenantId)) {
    return false;
  }

  if (!claim.clinicId || !user.clinicIds.includes(claim.clinicId)) {
    return false;
  }

  return true;
}

export async function listClinicReimbursements(
  user: ClinicAuthContext["user"],
  options: Omit<FindReimbursementsOptions, "tenantId" | "clinicId"> = {},
): Promise<{ claims: ClinicReimbursementView[]; total: number }> {
  const repositories = await getRepositoryContext();

  const results = await Promise.all(
    user.tenantIds.flatMap((tenantId) =>
      user.clinicIds.map((clinicId) =>
        repositories.reimbursements.findByTenantId(tenantId, {
          ...options,
          clinicId,
          limit: 1000,
        }),
      ),
    ),
  );

  // Merge, de-duplicate, and apply the combined scoping in memory.
  const seen = new Set<string>();
  const merged: ReimbursementDocument[] = [];
  for (const result of results) {
    for (const claim of result.reimbursements) {
      if (!canClinicAccessClaim(user, claim)) {
        continue;
      }
      if (seen.has(claim.reimbursementId)) {
        continue;
      }
      seen.add(claim.reimbursementId);
      merged.push(claim);
    }
  }

  // Sort newest-first by default.
  merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const skip = options.skip ?? 0;
  const limit = options.limit ?? 200;
  const page = merged.slice(skip, skip + limit);

  const claims = await Promise.all(
    page.map(async (claim) => {
      const employeeCode = await resolveEmployeeCode(claim.employeeId);
      return stripPiiForClinic(claim, employeeCode);
    }),
  );

  return { claims, total: merged.length };
}

export async function getClinicReimbursement(
  user: ClinicAuthContext["user"],
  reimbursementId: string,
): Promise<ClinicReimbursementView | null> {
  const repositories = await getRepositoryContext();
  const claim = await repositories.reimbursements.findById(reimbursementId);

  if (!claim || !canClinicAccessClaim(user, claim)) {
    return null;
  }

  const employeeCode = await resolveEmployeeCode(claim.employeeId);
  return stripPiiForClinic(claim, employeeCode);
}

export interface ClinicSubmitClaimInput {
  tenantId: string;
  clinicId: string;
  employeeCode: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptHash?: string;
  serviceDate?: string;
  sessionCount?: number;
  sessionTypes?: string[];
  sessionFor?: string;
  sessionForOther?: string;
}

/**
 * Clinic-side claim submission. The target employee is chosen by `employeeCode`
 * (never by name). Validates that the employee belongs to the clinic's tenant.
 */
export async function createClinicReimbursement(
  user: ClinicAuthContext["user"],
  clinicName: string,
  data: ClinicSubmitClaimInput,
): Promise<ReimbursementDocument> {
  if (!user.tenantIds.includes(data.tenantId)) {
    throw new Error("You are not authorized to submit claims for this organization.");
  }

  if (!user.clinicIds.includes(data.clinicId)) {
    throw new Error("You are not authorized to submit claims for this clinic.");
  }

  if (!data.employeeCode.trim()) {
    throw new Error("Employee code is required.");
  }

  if (!data.amount || data.amount <= 0) {
    throw new Error("A positive amount is required.");
  }

  if (!data.description.trim()) {
    throw new Error("Description is required.");
  }

  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findByEmployeeCode(
    data.tenantId,
    data.employeeCode.trim(),
  );

  if (!employee) {
    throw new Error("Employee not found for this organization.");
  }

  const now = new Date().toISOString();
  const claimNumber = await generateClaimNumber();
  const firstEntry: ClaimHistoryEntry = {
    status: "pending",
    actorId: user.clinicUserId,
    actorRole: "employee",
    timestamp: now,
  };

  const reimbursement: ReimbursementDocument = {
    reimbursementId: `reimb_clinic_${randomUUID()}`,
    claimNumber,
    tenantId: data.tenantId,
    employeeId: employee.employeeId,
    employeeName: employee.name ?? employee.employeeCode,
    type: "reimbursement",
    amount: data.amount,
    description: data.description.trim(),
    ...(data.receiptUrl ? { receiptUrl: data.receiptUrl.trim() } : {}),
    ...(data.receiptHash ? { receiptHash: data.receiptHash } : {}),
    ...(data.serviceDate ? { serviceDate: data.serviceDate } : {}),
    ...(data.sessionCount !== undefined ? { sessionCount: data.sessionCount } : {}),
    ...(data.sessionTypes !== undefined ? { sessionTypes: data.sessionTypes } : {}),
    ...(data.sessionFor !== undefined ? { sessionFor: data.sessionFor } : {}),
    ...(data.sessionForOther !== undefined ? { sessionForOther: data.sessionForOther } : {}),
    clinicId: data.clinicId,
    clinicName: clinicName.trim(),
    status: "pending",
    history: [firstEntry],
    createdAt: now,
    updatedAt: now,
  };

  await repositories.reimbursements.insert(reimbursement);

  // Best-effort notifications: confirm to the employee + alert the tenant admin.
  await notify({
    tenantId: data.tenantId,
    claimId: reimbursement.reimbursementId,
    claimNumber: reimbursement.claimNumber,
    recipientType: "employee",
    recipientId: employee.employeeId,
    type: "claim_submitted",
    title: "Claim submitted",
    body: `Your claim ${reimbursement.claimNumber ?? reimbursement.reimbursementId} has been submitted for review.`,
  }).catch(() => undefined);

  await notifyTenantAdmins({
    tenantId: data.tenantId,
    claimId: reimbursement.reimbursementId,
    claimNumber: reimbursement.claimNumber,
    type: "claim_submitted",
    title: "New claim submitted",
    body: `${clinicName} submitted claim ${reimbursement.claimNumber ?? reimbursement.reimbursementId} for review.`,
  }).catch(() => undefined);

  await postSystemMessage({
    tenantId: data.tenantId,
    claimId: reimbursement.reimbursementId,
    body: "Claim submitted",
  }).catch(() => undefined);

  return reimbursement;
}

export function resolveClinicParticipant(user: ClinicAuthContext["user"]): ClaimMessageParticipant {
  return {
    role: "clinic",
    id: user.clinicUserId,
    name: user.name,
    key: `clinic:${user.clinicUserId}`,
  };
}
