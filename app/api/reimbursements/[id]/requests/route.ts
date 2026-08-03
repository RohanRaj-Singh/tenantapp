import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  createClaimRequest,
  listClaimRequests,
} from "@/src/server/services/claimRequestService";
import { resolveChatParticipant } from "../messages/_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List and create Requests on a claim (FR-073). A request is a question about
 * whether something is possible; the organization answers it via the
 * `/[requestId]/decide` route. Access mirrors claim chat: employees/clinics may
 * create; any authorized participant may list; tenant admins decide.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await resolveChatParticipant(request);
    if (!resolved.success) {
      return resolved.response;
    }

    const { id } = await context.params;
    const result = await listClaimRequests(resolved.context, id);

    if (!result) {
      return NextResponse.json(
        { error: "Claim not found or not accessible." },
        { status: 404 },
      );
    }

    return NextResponse.json({ requests: result.requests }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const resolved = await resolveChatParticipant(request);
    if (!resolved.success) {
      return resolved.response;
    }

    // Only employees and clinics (not super admin, and a tenant admin answers
    // requests rather than creating them).
    if (!resolved.context.canPost) {
      return NextResponse.json(
        { error: "Only employees can create requests." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const { subject, body: reqBody } = payload ?? {};

    const subjectText = typeof subject === "string" ? subject : "";
    const bodyText = typeof reqBody === "string" ? reqBody : "";

    if (!subjectText.trim()) {
      return NextResponse.json(
        { error: "Subject is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    if (!bodyText.trim()) {
      return NextResponse.json(
        { error: "Description is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const requestDoc = await createClaimRequest(resolved.context, id, {
      subject: subjectText,
      body: bodyText,
    });

    if (!requestDoc) {
      return NextResponse.json(
        { error: "Unable to create request. Check the claim or your permissions." },
        { status: 400 },
      );
    }

    return NextResponse.json({ request: requestDoc }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}