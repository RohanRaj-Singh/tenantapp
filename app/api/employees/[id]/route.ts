import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  getEmployeeAccessDetail,
  updateEmployee,
  disableEmployee,
  hashPin,
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
    const employee = await getEmployeeAccessDetail(id, auth.context.tenant.tenantId);

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

    const updateData: {
      employeeCode?: string;
      name?: string;
      email?: string;
      status?: "active" | "inactive";
    } = {
      employeeCode: body.employeeCode,
      name: body.name,
      email: body.email,
      status: body.status,
    };

    const employee = await updateEmployee(auth.context.tenant.tenantId, id, updateData);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    // If a new PIN was provided, hash and update it directly via repository
    if (body.pin && typeof body.pin === "string" && body.pin.trim().length >= 4) {
      const { getRepositoryContext } = await import("@/src/server/repositories/context");
      const repositories = await getRepositoryContext();
      await repositories.employees.update(id, {
        pinHash: hashPin(body.pin.trim()),
        updatedAt: new Date().toISOString(),
      });
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

    return NextResponse.json(
      { error: "Invalid status value." },
      { status: 400 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
