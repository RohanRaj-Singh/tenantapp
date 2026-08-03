import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  getEmployee,
  updateEmployee,
  disableEmployee,
  archiveEmployee,
} from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const employee = await getEmployee(id, auth.context.tenant.tenantId, "tenant_admin");

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    // Only employeeCode, email, and status can be updated by Tenant Admin
    // name, phoneNumber, passwordHash — CANNOT be updated
    const updateData: {
      employeeCode?: string;
      email?: string;
      status?: "active" | "inactive";
    } = {
      ...(body.employeeCode !== undefined ? { employeeCode: body.employeeCode } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    };

    // Allow reactivation from PATCH too (status: "active" via updateEmployee)
    const employee = await updateEmployee(auth.context.tenant.tenantId, id, updateData);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    if (body.status === "inactive") {
      const employee = await disableEmployee(auth.context.tenant.tenantId, id);

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found." },
          { status: 404 },
        );
      }

      return NextResponse.json(employee, { status: 200 });
    }

    // Allow reactivation via PATCH with status: "active"
    if (body.status === "active") {
      const employee = await updateEmployee(auth.context.tenant.tenantId, id, { status: "active" });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found." },
          { status: 404 },
        );
      }

      return NextResponse.json(employee, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid status value. Use 'active' or 'inactive'.", errorCode: "VALIDATION_ERROR" },
      { status: 400 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const employee = await archiveEmployee(
      auth.context.tenant.tenantId,
      id,
      auth.context.user.id,
    );

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
