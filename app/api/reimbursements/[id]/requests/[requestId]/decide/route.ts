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

/**
 * The organization (tenant admin) responds to a pending Request (FR-074):
 * approve, reject, ask for more info, or convert the discussion to chat.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const resolved = await resolveChatParticipant(request);
    if (!resolved.success) {
      return resolved.response;
    }

    // Only a tenant admin may decide a request.
    if (resolved.context.participant.role !== "tenantAdmin") {
      return NextResponse.json(
        { error: "Only the organization can respond to requests." },
        { status: 403 },
      );
    }

    const { requestId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { decision, notes } = body ?? {};

    if (!VALID_DECISIONS.includes(decision as ClaimRequestDecision)) {
      return NextResponse.json(
        { error: "Invalid decision.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const updated = await decideClaimRequest(
      resolved.context,
      requestId,
      decision as ClaimRequestDecision,
      typeof notes === "string" ? notes : undefined,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Request not found or already decided." },
        { status: 404 },
      );
    }

    return NextResponse.json({ request: updated }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}