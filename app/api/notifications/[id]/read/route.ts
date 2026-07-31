import { NextRequest, NextResponse } from "next/server";
import { markRead } from "@/src/server/services/notificationService";
import { resolveNotificationRecipient } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveNotificationRecipient(request);
  if (!resolved.success) {
    return resolved.response;
  }

  const { id } = await context.params;
  const { tenantId, recipientType, recipientId } = resolved.context;

  const notification = await markRead(id, tenantId, recipientType, recipientId);

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(notification, { status: 200 });
}
