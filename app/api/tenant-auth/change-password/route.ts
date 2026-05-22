import { NextRequest, NextResponse } from "next/server";
import { setTenantAuthCookiesOnResponse } from "@/src/modules/tenant-auth/cookies";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { changeTenantPassword } from "@/src/modules/tenant-auth/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireTenantApiAuth({ allowPasswordChange: true });
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    const user = await changeTenantPassword(auth.context.user.id, {
      currentPassword,
      newPassword,
    });

    const response = NextResponse.json({
      success: true,
      user,
      redirectTo: "/dashboard",
    });

    return await setTenantAuthCookiesOnResponse(
      response,
      auth.context.session.sessionToken,
      false,
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
