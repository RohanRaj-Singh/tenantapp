import { NextRequest, NextResponse } from "next/server";
import {
  clearTenantAuthCookiesOnResponse,
  getTenantSessionCookie,
} from "@/src/modules/tenant-auth/cookies";
import { invalidateTenantSession } from "@/src/modules/tenant-auth/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sessionToken = await getTenantSessionCookie();

  if (sessionToken) {
    await invalidateTenantSession(sessionToken);
  }

  const acceptsJson = request.headers.get("accept")?.includes("application/json");
  const response = acceptsJson
    ? NextResponse.json({ success: true })
    : NextResponse.redirect(new URL("/login", request.url), { status: 303 });

  return await clearTenantAuthCookiesOnResponse(response, request);
}
