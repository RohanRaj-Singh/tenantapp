import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { addInvitationsToCampaign } from "@/src/server/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const result = await addInvitationsToCampaign(
      body.campaignId,
      body.employees ?? [],
    );

    if (!result.success) {
      const status = result.errorCode === "CAMPAIGN_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status },
      );
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
