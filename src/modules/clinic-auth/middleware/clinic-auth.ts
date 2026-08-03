import { NextResponse } from "next/server";
import { validateClinicSession } from "../services/auth-service";
import { clearClinicSessionCookieOnResponse, getClinicSessionCookie } from "../cookies";
import type { ClinicSessionValidationResult } from "../contracts/types";

export interface ClinicApiAuthGuardOptions {
  allowPasswordChange?: boolean;
}

export async function getCurrentClinicAuthValidation(): Promise<ClinicSessionValidationResult> {
  const sessionToken = await getClinicSessionCookie();
  return validateClinicSession(sessionToken ?? "");
}

export async function getCurrentClinicAuthContext() {
  const validation = await getCurrentClinicAuthValidation();
  return validation.success ? validation.context ?? null : null;
}

export async function requireClinicApiAuth(
  options: ClinicApiAuthGuardOptions = {},
): Promise<
  | { success: true; context: NonNullable<Awaited<ReturnType<typeof getCurrentClinicAuthContext>>> }
  | { success: false; response: NextResponse }
> {
  const validation = await getCurrentClinicAuthValidation();

  if (!validation.success || !validation.context) {
    const status =
      validation.reason === "USER_DISABLED" || validation.reason === "USER_ARCHIVED"
        ? 403
        : 401;

    const response = NextResponse.json(
      {
        authenticated: false,
        error: validation.error ?? "Clinic authentication required.",
      },
      { status },
    );

    return {
      success: false,
      response: validation.clearCookies
        ? await clearClinicSessionCookieOnResponse(response)
        : response,
    };
  }

  if (validation.context.user.mustChangePassword && !options.allowPasswordChange) {
    return {
      success: false,
      response: NextResponse.json(
        {
          authenticated: false,
          error: "Password change is required before accessing the clinic portal.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    success: true,
    context: validation.context,
  };
}
