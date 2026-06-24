import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getSafeEmployee } from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("tenantSlug");
    const employeeCode = searchParams.get("employeeCode");

    if (!tenantSlug || !employeeCode) {
      return NextResponse.json(
        { error: "tenantSlug and employeeCode are required." },
        { status: 400 },
      );
    }

    // Resolve tenant
    const repositories = await getRepositoryContext();
    const tenant = await repositories.tenants.findBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found." },
        { status: 404 },
      );
    }

    // Find employee by tenantId + employeeCode
    const employee = await repositories.employees.findByEmployeeCode(
      tenant.tenantId,
      employeeCode,
    );

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    // Return safe profile (no pinHash)
    const safe = await getSafeEmployee(employee.employeeId, tenant.tenantId);

    if (!safe) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ employee: safe }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
