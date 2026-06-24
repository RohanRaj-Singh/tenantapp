import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { resetEmployeePin } from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const tenantId = auth.context.tenant.tenantId;
    const performedBy = auth.context.user.id;

    const result = await resetEmployeePin(tenantId, id, performedBy);

    if (!result) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        employee: result.employee,
        newPin: result.newPin,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Cannot reset PIN for an inactive employee.") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}
