import { NextRequest, NextResponse } from "next/server";
import {
  clearTenantAuthCookiesOnResponse,
} from "@/src/modules/tenant-auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "";
  const message = searchParams.get("message") ?? "";

  const redirectUrl = new URL("/login", request.url);
  if (next) redirectUrl.searchParams.set("next", next);
  if (message) redirectUrl.searchParams.set("message", message);

  let response = NextResponse.redirect(redirectUrl);
  // Pass request headers so cookie options (secure, domain) are derived from the actual request
  response = await clearTenantAuthCookiesOnResponse(response, request);
  return response;
}
