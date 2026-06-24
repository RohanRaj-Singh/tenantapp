import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { freezeReimbursement } from "@/src/server/services/reimbursementService";

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
    const reimbursement = await freezeReimbursement(
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
