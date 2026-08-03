import { NextRequest, NextResponse } from "next/server";
import {
  clearClinicSessionCookieOnResponse,
  getClinicSessionCookie,
} from "@/src/modules/clinic-auth/cookies";
import { invalidateClinicSession } from "@/src/modules/clinic-auth/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sessionToken = await getClinicSessionCookie();

  if (sessionToken) {
    await invalidateClinicSession(sessionToken);
  }

  const response = NextResponse.json({ success: true });
  return await clearClinicSessionCookieOnResponse(response, request);
}
