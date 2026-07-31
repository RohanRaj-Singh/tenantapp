import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallerRole = "super_admin" | "tenant_admin";

/**
 * Accepts either:
 * 1. An `x-admin-api-key` header matching the ADMIN_API_KEY env var (admin app server-to-server calls) → Super Admin
 * 2. A valid tenant dashboard session (for tenant-level access) → Tenant Admin
 */
async function authorizeRequest(request: NextRequest): Promise<{ authorized: boolean; callerRole?: CallerRole; response?: NextResponse }> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true, callerRole: "super_admin" };
  }

  const { requireTenantApiAuth } = await import("@/src/modules/tenant-auth/middleware/tenant-auth");
  const auth = await requireTenantApiAuth();
  if (auth.success) {
    return { authorized: true, callerRole: "tenant_admin" };
  }

  return { authorized: false, response: auth.response };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { id } = await context.params;
    const repositories = await getRepositoryContext();
    const claim = await repositories.reimbursements.findById(id);

    if (!claim) {
      return NextResponse.json(
        { error: "Reimbursement not found." },
        { status: 404 },
      );
    }

    // Resolve tenant name for display
    const tenant = await repositories.tenants.findByTenantId(claim.tenantId);
    const tenantName = tenant?.name ?? claim.tenantId;

    // Super Admin sees the full record incl. employeeName; Tenant Admin does not (anonymity layer)
    const mapped: Record<string, unknown> = {
      reimbursementId: claim.reimbursementId,
      claimNumber: claim.claimNumber,
      tenantId: claim.tenantId,
      tenantName,
      employeeId: claim.employeeId,
      clinicId: claim.clinicId,
      clinicName: claim.clinicName,
      type: claim.type,
      amount: claim.amount,
      description: claim.description,
      receiptUrl: claim.receiptUrl,
      receiptHash: claim.receiptHash,
      serviceDate: claim.serviceDate,
      sessionCount: claim.sessionCount,
      sessionTypes: claim.sessionTypes,
      sessionFor: claim.sessionFor,
      sessionForOther: claim.sessionForOther,
      contactCountryCode: claim.contactCountryCode,
      contactNumber: claim.contactNumber,
      bankAccountNumber: claim.bankAccountNumber,
      bankName: claim.bankName,
      status: claim.status,
      reviewedBy: claim.reviewedBy,
      reviewedAt: claim.reviewedAt,
      notes: claim.notes,
      history: claim.history,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };

    if (auth.callerRole === "super_admin") {
      mapped.employeeName = claim.employeeName;
    }

    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
