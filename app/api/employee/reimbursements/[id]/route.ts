import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeEmployeeApiRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorizeEmployeeApiRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const employeeCode = searchParams.get("employeeCode");

    const repositories = await getRepositoryContext();
    const reimbursement = await repositories.reimbursements.findById(id);

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    // If tenantId+employeeCode provided, verify ownership
    if (tenantId && employeeCode) {
      if (reimbursement.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Claim not found for this tenant." },
          { status: 404 },
        );
      }

      const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode.trim());
      if (!employee || reimbursement.employeeId !== employee.employeeId) {
        return NextResponse.json(
          { error: "Claim not found." },
          { status: 404 },
        );
      }

      // ── Verify employee is active ──────────────────────────────────────
      if (employee.status !== "active") {
        return NextResponse.json(
          { error: "Employee account is not active." },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(reimbursement, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
