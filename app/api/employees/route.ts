import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  listEmployees,
  createEmployee,
} from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);

    const result = await listEmployees(auth.context.tenant.tenantId, {
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      skip: parseInt(url.searchParams.get("skip") ?? "0", 10),
      limit: parseInt(url.searchParams.get("limit") ?? "20", 10),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();

    if (!body.name || !body.email || !body.employeeCode) {
      return NextResponse.json(
        { error: "name, email, and employeeCode are required." },
        { status: 400 },
      );
    }

    const employee = await createEmployee(auth.context.tenant.tenantId, {
      employeeCode: body.employeeCode,
      name: body.name,
      email: body.email,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
