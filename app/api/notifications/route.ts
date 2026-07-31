import { NextRequest, NextResponse } from "next/server";
import { listForRecipient, unreadCount } from "@/src/server/services/notificationService";
import { resolveNotificationRecipient } from "./_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const resolved = await resolveNotificationRecipient(request);
  if (!resolved.success) {
    return resolved.response;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const { tenantId, recipientType, recipientId } = resolved.context;

  const [notifications, count] = await Promise.all([
    listForRecipient({ tenantId, recipientType, recipientId, unreadOnly, limit }),
    unreadCount(tenantId, recipientType, recipientId),
  ]);

  return NextResponse.json({ notifications, unreadCount: count }, { status: 200 });
}
