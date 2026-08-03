import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  getReimbursement,
  updateReimbursement,
} from "@/src/server/services/reimbursementService";

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
    const reimbursement = await getReimbursement(auth.context.tenant.tenantId, id);

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Reimbursement not found." },
        { status: 404 },
      );
    }

    // Tenant Admin callers must not see employeeName
    const { employeeName: _name, ...rest } = reimbursement;

    return NextResponse.json(rest, { status: 200 });
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

    const reimbursement = await updateReimbursement(auth.context.tenant.tenantId, id, {
      // Only reassign the claim's employee when the edit body explicitly says so.
      // Falling back to the tenant-admin's user id here would overwrite the real
      // owner with the reviewer, making the claim vanish from the employee portal
      // (the employee list filters by the claim's employeeId).
      employeeId: typeof body.employeeId === "string" ? body.employeeId : undefined,
      employeeName: body.employeeName,
      type: body.type,
      amount: body.amount,
      description: body.description,
      receiptUrl: body.receiptUrl,
      notes: body.notes,
      sessionCount: body.sessionCount !== undefined ? Number(body.sessionCount) : undefined,
      sessionTypes: Array.isArray(body.sessionTypes) ? body.sessionTypes : undefined,
      sessionFor: body.sessionFor,
      sessionForOther: body.sessionForOther,
      contactCountryCode: body.contactCountryCode,
      contactNumber: body.contactNumber,
      bankAccountNumber: body.bankAccountNumber,
      bankName: body.bankName,
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Reimbursement not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(reimbursement, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
