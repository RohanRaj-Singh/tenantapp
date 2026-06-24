import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accepts either:
 * 1. An `x-admin-api-key` header matching the ADMIN_API_KEY env var (for admin app server-to-server calls)
 * 2. A valid tenant dashboard session (for tenant-level access)
 */
async function authorizeRequest(request: NextRequest): Promise<{ authorized: boolean; response?: NextResponse }> {
  // Check admin API key first (server-to-server from admin app)
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true };
  }

  // Fall back to tenant dashboard session
  const { requireTenantApiAuth } = await import("@/src/modules/tenant-auth/middleware/tenant-auth");
  const auth = await requireTenantApiAuth();
  if (auth.success) {
    return { authorized: true };
  }

  return { authorized: false, response: auth.response };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const tenantId = searchParams.get("tenantId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "25", 10);

    const repositories = await getRepositoryContext();

    // Fetch claims with filtering, search, and pagination
    const result = await repositories.reimbursements.findAll({
      status,
      tenantId,
      search,
      skip,
      limit: Math.min(limit, 500),
    });

    let claims = result.reimbursements;

    // Apply date range filter (post-query since the repo doesn't support it natively)
    if (dateFrom) {
      const from = new Date(dateFrom).toISOString();
      claims = claims.filter((c) => c.createdAt >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).toISOString();
      claims = claims.filter((c) => c.createdAt <= to);
    }

    // Resolve tenant names for display
    const tenantLookup = new Map<string, string>();
    for (const claim of claims) {
      if (!tenantLookup.has(claim.tenantId)) {
        const tenant = await repositories.tenants.findByTenantId(claim.tenantId);
        tenantLookup.set(claim.tenantId, tenant?.name ?? claim.tenantId);
      }
    }

    // Map response with tenant name
    const mapped = claims.map((c) => ({
      reimbursementId: c.reimbursementId,
      claimNumber: c.claimNumber,
      tenantId: c.tenantId,
      tenantName: tenantLookup.get(c.tenantId) ?? c.tenantId,
      employeeId: c.employeeId,
      employeeName: c.employeeName,
      clinicId: c.clinicId,
      clinicName: c.clinicName,
      amount: c.amount,
      description: c.description,
      receiptUrl: c.receiptUrl,
      receiptHash: c.receiptHash,
      serviceDate: c.serviceDate,
      status: c.status,
      reviewedBy: c.reviewedBy,
      reviewedAt: c.reviewedAt,
      notes: c.notes,
      history: c.history,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({ claims: mapped, total: result.total }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
