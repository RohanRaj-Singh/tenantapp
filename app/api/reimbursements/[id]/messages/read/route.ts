import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { markThreadRead } from "@/src/server/services/claimMessageService";
import { resolveChatParticipant } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveChatParticipant(request);
  if (!resolved.success) {
    return resolved.response;
  }

  try {
    const { id } = await context.params;
    const count = await markThreadRead(resolved.context, id);
    if (count === null) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
