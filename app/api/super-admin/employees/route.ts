import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";
import {
  listAllEmployees,
  type SafeEmployee,
  type SuperAdminEmployeeListItem,
} from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallerRole = "super_admin" | "tenant_admin";

/**
 * Accepts either:
 * 1. An `x-admin-api-key` header matching the ADMIN_API_KEY env var → Super Admin
 * 2. A valid tenant dashboard session → Tenant Admin (limited access)
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

async function resolveTenantNames(employees: SafeEmployee[]): Promise<Map<string, string>> {
  const repositories = await getRepositoryContext();
  const tenantLookup = new Map<string, string>();
  const seen = new Set<string>();

  for (const emp of employees) {
    if (!seen.has(emp.tenantId)) {
      seen.add(emp.tenantId);
      const tenant = await repositories.tenants.findByTenantId(emp.tenantId);
      tenantLookup.set(emp.tenantId, tenant?.name ?? emp.tenantId);
    }
  }

  return tenantLookup;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  const callerRole = auth.callerRole!;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const tenantId = searchParams.get("tenantId") ?? undefined;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const result = await listAllEmployees(
      { search, status, tenantId, skip, limit: Math.min(limit, 500) },
      callerRole,
    );

    const safeEmployees: SafeEmployee[] = result.employees;

    // If Tenant Admin is calling, return limited view directly
    if (callerRole === "tenant_admin") {
      return NextResponse.json(
        { employees: safeEmployees, total: result.total },
        { status: 200 },
      );
    }

    // Super Admin — resolve tenant names and build full list items
    const tenantLookup = await resolveTenantNames(safeEmployees);

    const employees: SuperAdminEmployeeListItem[] = safeEmployees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      email: emp.email,
      name: emp.name ?? "",
      phoneNumber: emp.phoneNumber ?? null,
      status: emp.status,
      tenantId: emp.tenantId,
      tenantName: tenantLookup.get(emp.tenantId) ?? emp.tenantId,
      failedLoginAttempts: emp.failedLoginAttempts,
      lockedUntil: emp.lockedUntil,
      lastAccessAt: emp.lastAccessAt,
      mustChangePassword: emp.mustChangePassword,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));

    return NextResponse.json({ employees, total: result.total }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
