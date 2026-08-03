import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireClinicApiAuth } from "@/src/modules/clinic-auth/middleware/clinic-auth";
import { getClinicReimbursement } from "@/src/server/services/clinicPortalService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireClinicApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const claim = await getClinicReimbursement(auth.context.user, id);

    if (!claim) {
      return NextResponse.json(
        { error: "Reimbursement not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ claim }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
