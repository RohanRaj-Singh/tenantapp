import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  RUNTIME_TENANT_HEADER_FAILURE,
  RUNTIME_TENANT_HEADER_HOSTNAME,
  RUNTIME_TENANT_HEADER_QUERY,
  RUNTIME_TENANT_HEADER_ROOT_DOMAIN,
  RUNTIME_TENANT_HEADER_SLUG,
  RUNTIME_TENANT_HEADER_SOURCE,
  RUNTIME_TENANT_QUERY_PARAM,
  resolveRuntimeTenantRequest,
} from "@/runtime/tenant/tenantResolution";
import { TENANT_AUTH_CONFIG } from "@/src/modules/tenant-auth/contracts/types";
import {
  buildTenantLoginRedirectPath,
  isTenantProtectedPath,
  isValidTenantSessionTokenFormat,
} from "@/src/modules/tenant-auth/guards/route-protection";
import { getTenantAuthCookieBaseOptions } from "@/src/modules/tenant-auth/cookies/options";
import { isLocalTenantAuthBypassEnabled } from "@/src/modules/tenant-auth/utils/local-auth-bypass-config";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const tenantResolution = resolveRuntimeTenantRequest({
    hostname:
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host,
    queryTenant: request.nextUrl.searchParams.get(RUNTIME_TENANT_QUERY_PARAM),
  });
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set(RUNTIME_TENANT_HEADER_SOURCE, tenantResolution.source);
  requestHeaders.set(
    RUNTIME_TENANT_HEADER_HOSTNAME,
    tenantResolution.hostname ?? "",
  );
  requestHeaders.set(
    RUNTIME_TENANT_HEADER_ROOT_DOMAIN,
    tenantResolution.rootDomain,
  );
  requestHeaders.set(
    RUNTIME_TENANT_HEADER_SLUG,
    tenantResolution.tenantSlug ?? "",
  );
  requestHeaders.set(
    RUNTIME_TENANT_HEADER_QUERY,
    tenantResolution.queryTenantSlug ?? "",
  );
  requestHeaders.set(
    RUNTIME_TENANT_HEADER_FAILURE,
    tenantResolution.failureReason ?? "",
  );

  const sessionCookie = request.cookies.get(TENANT_AUTH_CONFIG.sessionCookieName)?.value;
  const nextPath = `${pathname}${request.nextUrl.search}`;
  const localAuthBypassEnabled = isLocalTenantAuthBypassEnabled(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host,
  );

  if (
    isTenantProtectedPath(pathname) &&
    !localAuthBypassEnabled &&
    !isValidTenantSessionTokenFormat(sessionCookie)
  ) {
    const response = NextResponse.redirect(
      new URL(
        buildTenantLoginRedirectPath(
          nextPath,
          undefined,
          tenantResolution.source === "hostname" ? null : tenantResolution.tenantSlug,
        ),
        request.url,
      ),
      { status: 307 },
    );
    response.cookies.set(TENANT_AUTH_CONFIG.sessionCookieName, "", {
      ...getTenantAuthCookieBaseOptions(request),
      maxAge: 0,
    });
    response.cookies.set(TENANT_AUTH_CONFIG.passwordChangeCookieName, "", {
      ...getTenantAuthCookieBaseOptions(request),
      maxAge: 0,
    });
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (sessionCookie && !isValidTenantSessionTokenFormat(sessionCookie)) {
    response.cookies.set(TENANT_AUTH_CONFIG.sessionCookieName, "", {
      ...getTenantAuthCookieBaseOptions(request),
      maxAge: 0,
    });
    response.cookies.set(TENANT_AUTH_CONFIG.passwordChangeCookieName, "", {
      ...getTenantAuthCookieBaseOptions(request),
      maxAge: 0,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)",
  ],
};
