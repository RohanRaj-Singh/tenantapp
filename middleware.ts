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

export function middleware(request: NextRequest) {
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

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)",
  ],
};
