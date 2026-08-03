import { NextRequest, NextResponse } from "next/server";
import { setClinicSessionCookieOnResponse } from "@/src/modules/clinic-auth/cookies";
import { loginClinicUser } from "@/src/modules/clinic-auth/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIpAddress(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function getFailureStatus(reason?: string): number {
  switch (reason) {
    case "USER_LOCKED":
      return 423;
    case "USER_DISABLED":
    case "USER_ARCHIVED":
      return 403;
    case "INVALID_CREDENTIALS":
    default:
      return 401;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    const result = await loginClinicUser(
      { email, password },
      {
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent"),
      },
    );

    if (!result.success || !result.user || !result.session) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Clinic login failed.",
          retryAfterSeconds: result.retryAfterSeconds ?? 0,
          lockedUntil: result.lockedUntil ?? null,
        },
        { status: getFailureStatus(result.reason) },
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      requiresPasswordChange: result.requiresPasswordChange ?? false,
    });

    return await setClinicSessionCookieOnResponse(
      response,
      result.session.sessionToken,
      request,
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? "Clinic login failed."
            : error instanceof Error
              ? error.message
              : "Clinic login failed.",
      },
      { status: 500 },
    );
  }
}
