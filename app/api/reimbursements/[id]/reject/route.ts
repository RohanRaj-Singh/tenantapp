import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { rejectReimbursement } from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (!body.notes || typeof body.notes !== "string" || body.notes.trim() === "") {
      return NextResponse.json(
        { error: "A reason is required when rejecting a claim.", errorCode: "REASON_REQUIRED" },
        { status: 400 },
      );
    }

    const reimbursement = await rejectReimbursement(
      auth.context.tenant.tenantId,
      id,
      auth.context.user.id,
      body.notes,
    );

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
