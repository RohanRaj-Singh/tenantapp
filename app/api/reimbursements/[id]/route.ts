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

    return NextResponse.json(reimbursement, { status: 200 });
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
      employeeId: body.employeeId,
      employeeName: body.employeeName,
      type: body.type,
      amount: body.amount,
      description: body.description,
      receiptUrl: body.receiptUrl,
      notes: body.notes,
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
