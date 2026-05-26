import { NextResponse } from "next/server";
import { TENANT_PASSWORD_CHANGE_PATH } from "../guards/route-protection";
import { validateTenantSession } from "../services/auth-service";
import { clearTenantAuthCookiesOnResponse, getTenantSessionCookie } from "../cookies";
import { getCurrentTenantRequestScope } from "../utils/request-tenant";
import { getLocalTenantBypassAuthContext } from "../utils/local-auth-bypass";
import type { TenantSessionValidationResult } from "../contracts/types";

export interface TenantApiAuthGuardOptions {
  allowPasswordChange?: boolean;
}

export async function getCurrentTenantAuthValidation(): Promise<TenantSessionValidationResult> {
  const bypassContext = await getLocalTenantBypassAuthContext();
  if (bypassContext) {
    return {
      success: true,
      context: bypassContext,
    };
  }

  const sessionToken = await getTenantSessionCookie();
  const scope = await getCurrentTenantRequestScope();

  return validateTenantSession(sessionToken ?? "", scope.tenant?.slug ?? scope.resolution.tenantSlug);
}

export async function getCurrentTenantAuthContext() {
  const validation = await getCurrentTenantAuthValidation();
  return validation.success ? validation.context ?? null : null;
}

export async function requireTenantApiAuth(
  options: TenantApiAuthGuardOptions = {},
): Promise<
  | { success: true; context: NonNullable<Awaited<ReturnType<typeof getCurrentTenantAuthContext>>> }
  | { success: false; response: NextResponse }
> {
  const validation = await getCurrentTenantAuthValidation();

  if (!validation.success || !validation.context) {
    const status =
      validation.reason === "TENANT_DRAFT" ||
      validation.reason === "TENANT_DISABLED" ||
      validation.reason === "TENANT_ARCHIVED" ||
      validation.reason === "USER_DISABLED"
        ? 403
        : 401;

    const response = NextResponse.json(
      {
        authenticated: false,
        error: validation.error ?? "Tenant authentication required.",
        redirectTo: "/login",
      },
      { status },
    );

    return {
      success: false,
      response: validation.clearCookies
        ? await clearTenantAuthCookiesOnResponse(response)
        : response,
    };
  }

  if (validation.context.user.mustChangePassword && !options.allowPasswordChange) {
    return {
      success: false,
      response: NextResponse.json(
        {
          authenticated: false,
          error: "Password change is required before accessing the dashboard.",
          redirectTo: TENANT_PASSWORD_CHANGE_PATH,
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
