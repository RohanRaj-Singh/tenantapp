import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  listChatMessages,
  postChatMessage,
} from "@/src/server/services/claimMessageService";
import { resolveChatParticipant } from "./_helpers";

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
    const result = await listChatMessages(resolved.context, id);
    if (!result) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    return NextResponse.json(result, { status: 200 });
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
        { error: "Forbidden. You cannot post messages to this claim." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json(
        { error: "Message is required.", errorCode: "MESSAGE_REQUIRED" },
        { status: 400 },
      );
    }

    const message = await postChatMessage(resolved.context, id, body.body);
    if (!message) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
