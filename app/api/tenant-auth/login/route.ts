import { NextRequest, NextResponse } from "next/server";
import { setTenantAuthCookiesOnResponse } from "@/src/modules/tenant-auth/cookies";
import {
  TENANT_PASSWORD_CHANGE_PATH,
  getSafeTenantRedirectPath,
} from "@/src/modules/tenant-auth/guards/route-protection";
import { loginTenantUser } from "@/src/modules/tenant-auth/services/auth-service";
import { resolveRuntimeTenantRequestFromRequest } from "@/src/server/runtime/requestTenantResolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIpAddress(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function getFailureStatus(reason?: string): number {
  switch (reason) {
    case "RATE_LIMITED":
      return 429;
    case "TENANT_DRAFT":
    case "TENANT_DISABLED":
    case "TENANT_ARCHIVED":
    case "USER_DISABLED":
      return 403;
    case "TENANT_UNAVAILABLE":
      return 404;
    case "INVALID_CREDENTIALS":
    default:
      return 401;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const requestedNext = String(body?.next ?? "").trim();
    const requestTenant = resolveRuntimeTenantRequestFromRequest(request);

    if (!requestTenant.tenantSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "Tenant dashboard access is unavailable.",
        },
        { status: 404 },
      );
    }

    const result = await loginTenantUser(
      requestTenant.tenantSlug,
      {
        identifier,
        password,
      },
      {
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent"),
      },
    );

    if (!result.success || !result.user || !result.session) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Tenant login failed.",
          retryAfterSeconds: result.retryAfterSeconds ?? 0,
        },
        { status: getFailureStatus(result.reason) },
      );
    }

    const redirectTo = result.requiresPasswordChange
      ? TENANT_PASSWORD_CHANGE_PATH
      : getSafeTenantRedirectPath(requestedNext);

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: result.user,
      requiresPasswordChange: result.requiresPasswordChange ?? false,
    });

    return setTenantAuthCookiesOnResponse(
      response,
      result.session.sessionToken,
      Boolean(result.requiresPasswordChange),
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Tenant login failed.",
      },
      { status: 500 },
    );
  }
}
