import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  suspendEmployeeById,
} from "@/src/server/services/employeeService";
import { buildEmployeeDetail } from "@/app/api/super-admin/employees/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizeSuperAdmin(request: NextRequest): Promise<{ authorized: boolean; response?: NextResponse }> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { success: false, error: "Authentication required. Use x-admin-api-key header.", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    ),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { id } = await params;

    const employee = await suspendEmployeeById(id, "super_admin");
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found.", errorCode: "EMPLOYEE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const detail = await buildEmployeeDetail(employee);
    return NextResponse.json({ success: true, employee: detail }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
