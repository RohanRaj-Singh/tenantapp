import { NextRequest, NextResponse } from "next/server";
import { markAllRead } from "@/src/server/services/notificationService";
import { resolveNotificationRecipient } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const resolved = await resolveNotificationRecipient(request);
  if (!resolved.success) {
    return resolved.response;
  }

  const { tenantId, recipientType, recipientId } = resolved.context;
  const count = await markAllRead(tenantId, recipientType, recipientId);

  return NextResponse.json({ count }, { status: 200 });
}
