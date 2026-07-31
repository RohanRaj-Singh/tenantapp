import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  createClaimRequest,
  listClaimRequests,
} from "@/src/server/services/claimRequestService";
import { resolveChatParticipant } from "../messages/_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveChatParticipant(request);
  if (!resolved.success) {
    return resolved.response;
  }

  try {
    const { id } = await context.params;
    const requests = await listClaimRequests(resolved.context, id);
    if (!requests) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveChatParticipant(request);
  if (!resolved.success) {
    return resolved.response;
  }

  try {
    if (!resolved.context.canPost) {
      return NextResponse.json(
        { error: "Forbidden. You cannot create requests on this claim." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (
      !body.subject || typeof body.subject !== "string" || !body.subject.trim() ||
      !body.details || typeof body.details !== "string" || !body.details.trim()
    ) {
      return NextResponse.json(
        { error: "Subject and details are required.", errorCode: "REQUEST_FIELDS_REQUIRED" },
        { status: 400 },
      );
    }

    const created = await createClaimRequest(resolved.context, id, {
      subject: body.subject,
      details: body.details,
    });
    if (!created) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
