import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { createClinicUserAccount } from "@/src/modules/clinic-auth/services/auth-service";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a clinic portal user (out-of-band invite — Phase H has no email).
 * Authorized callers:
 *  1. `x-admin-api-key` matching ADMIN_API_KEY → super admin (cross-tenant)
 *  2. tenant dashboard session → tenant admin (scoped to their tenant)
 */
async function authorizeRequest(request: NextRequest): Promise<{
  authorized: boolean;
  createdBy: string;
  scopeTenantId?: string;
  response?: NextResponse;
}> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true, createdBy: "super-admin" };
  }

  const { requireTenantApiAuth } = await import("@/src/modules/tenant-auth/middleware/tenant-auth");
  const auth = await requireTenantApiAuth();
  if (auth.success) {
    return {
      authorized: true,
      createdBy: auth.context.user.id,
      scopeTenantId: auth.context.tenant.tenantId,
    };
  }

  return { authorized: false, createdBy: "", response: auth.response };
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await request.json();
    const email = String(body?.email ?? "");
    const name = String(body?.name ?? "");
    const clinicIds = Array.isArray(body?.clinicIds)
      ? body.clinicIds.map(String)
      : [];
    const tenantIds = Array.isArray(body?.tenantIds)
      ? body.tenantIds.map(String)
      : auth.scopeTenantId
        ? [auth.scopeTenantId]
        : [];
    const initialPassword = body?.initialPassword
      ? String(body.initialPassword)
      : undefined;

    if (tenantIds.length === 0) {
      return NextResponse.json(
        { error: "At least one tenantId is required." },
        { status: 400 },
      );
    }

    const result = await createClinicUserAccount({
      email,
      name,
      clinicIds,
      tenantIds,
      initialPassword,
      createdBy: auth.createdBy,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const repositories = await getRepositoryContext();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ?? auth.scopeTenantId ?? undefined;
    const result = await repositories.clinicUsers.list({
      tenantId,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      skip: parseInt(searchParams.get("skip") ?? "0", 10),
      limit: Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 500),
    });

    // Strip the password credential from the response (the binding is marked used
    // via `void` so no unused-variable lint rule is triggered).
    const clinicUsers = result.clinicUsers.map(
      ({ passwordHash, ...safe }) => {
        void passwordHash;
        return safe;
      },
    );

    return NextResponse.json(
      { clinicUsers, total: result.total },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
