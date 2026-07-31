import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  decideClaimRequest,
  type ClaimRequestDecision,
} from "@/src/server/services/claimRequestService";
import { resolveChatParticipant } from "../../../messages/_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DECISIONS: ClaimRequestDecision[] = [
  "approved",
  "rejected",
  "more_info",
  "converted_to_chat",
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const resolved = await resolveChatParticipant(request);
  if (!resolved.success) {
    return resolved.response;
  }

  try {
    const { id, requestId } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (!VALID_DECISIONS.includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid decision. Use approved, rejected, more_info or converted_to_chat.", errorCode: "INVALID_DECISION" },
        { status: 400 },
      );
    }

    const updated = await decideClaimRequest(
      resolved.context,
      id,
      requestId,
      body.action as ClaimRequestDecision,
      typeof body.note === "string" ? body.note : undefined,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Request not found, not pending, or you cannot decide it." },
        { status: 404 },
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
