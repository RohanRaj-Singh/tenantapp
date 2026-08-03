import { NextRequest, NextResponse } from "next/server";
import { setClinicSessionCookieOnResponse } from "@/src/modules/clinic-auth/cookies";
import { requireClinicApiAuth } from "@/src/modules/clinic-auth/middleware/clinic-auth";
import { changeClinicPassword } from "@/src/modules/clinic-auth/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireClinicApiAuth({ allowPasswordChange: true });
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    const user = await changeClinicPassword(auth.context.user.clinicUserId, {
      currentPassword,
      newPassword,
    });

    const response = NextResponse.json({
      success: true,
      user,
    });

    return await setClinicSessionCookieOnResponse(
      response,
      auth.context.session.sessionToken,
      request,
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Password change failed.",
      },
      { status: 400 },
    );
  }
}
