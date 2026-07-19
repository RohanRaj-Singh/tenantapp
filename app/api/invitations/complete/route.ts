import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { completeInvitation } from "@/src/server/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { error: "Invitation token is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const result = await completeInvitation(body.token);

    if (!result.success) {
      const status = result.errorCode === "INVITATION_NOT_FOUND" ? 404 : 400;
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
