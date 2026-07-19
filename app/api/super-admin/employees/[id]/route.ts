import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  getEmployeeById,
} from "@/src/server/services/employeeService";
import { buildEmployeeDetail } from "@/app/api/super-admin/employees/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallerRole = "super_admin" | "tenant_admin";

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
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  const callerRole = auth.callerRole!;

  try {
    const { id } = await params;

    const employee = await getEmployeeById(id, callerRole);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found.", errorCode: "EMPLOYEE_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Super Admin — return full detail with tenant name
    if (callerRole === "super_admin") {
      const detail = await buildEmployeeDetail(employee);
      return NextResponse.json(detail, { status: 200 });
    }

    // Tenant Admin — return limited view
    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
