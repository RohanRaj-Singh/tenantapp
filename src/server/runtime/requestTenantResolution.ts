import {
  RUNTIME_TENANT_HEADER_FAILURE,
  RUNTIME_TENANT_HEADER_HOSTNAME,
  RUNTIME_TENANT_HEADER_QUERY,
  RUNTIME_TENANT_HEADER_ROOT_DOMAIN,
  RUNTIME_TENANT_HEADER_SLUG,
  RUNTIME_TENANT_HEADER_SOURCE,
  RUNTIME_TENANT_QUERY_PARAM,
  resolveRuntimeTenantRequest,
  sanitizeTenantSlug,
  type RuntimeTenantRequestResolution,
  type RuntimeTenantResolutionFailureReason,
  type RuntimeTenantResolutionSource,
} from "@/runtime/tenant/tenantResolution";

function readHeaderValue(headers: Headers, headerName: string) {
  const headerValue = headers.get(headerName);
  return headerValue && headerValue.trim().length > 0 ? headerValue : null;
}

function parseRuntimeTenantResolutionSource(
  value: string | null,
): RuntimeTenantResolutionSource | null {
  if (
    value === "hostname" ||
    value === "query" ||
    value === "stored" ||
    value === "environment" ||
    value === "none"
  ) {
    return value;
  }

  return null;
}

function parseRuntimeTenantFailureReason(
  value: string | null,
): RuntimeTenantResolutionFailureReason | null {
  if (
    value === "invalid_query_tenant" ||
    value === "invalid_subdomain" ||
    value === "local_hostname_missing_tenant" ||
    value === "missing_hostname" ||
    value === "root_domain_missing_subdomain" ||
    value === "tenant_not_provided" ||
    value === "unsupported_hostname"
  ) {
    return value;
  }

  return null;
}

function readRuntimeTenantResolutionFromHeaders(
  headers: Headers,
): RuntimeTenantRequestResolution | null {
  const source = parseRuntimeTenantResolutionSource(
    readHeaderValue(headers, RUNTIME_TENANT_HEADER_SOURCE),
  );
  const rootDomain = readHeaderValue(
    headers,
    RUNTIME_TENANT_HEADER_ROOT_DOMAIN,
  );

  if (!source || !rootDomain) {
    return null;
  }

  const headerTenantSlug = sanitizeTenantSlug(
    readHeaderValue(headers, RUNTIME_TENANT_HEADER_SLUG),
  );

  return {
    tenantSlug: headerTenantSlug,
    source,
    hostname: readHeaderValue(headers, RUNTIME_TENANT_HEADER_HOSTNAME),
    rootDomain,
    hostTenantSlug: source === "hostname" ? headerTenantSlug : null,
    queryTenantSlug: sanitizeTenantSlug(
      readHeaderValue(headers, RUNTIME_TENANT_HEADER_QUERY),
    ),
    failureReason: parseRuntimeTenantFailureReason(
      readHeaderValue(headers, RUNTIME_TENANT_HEADER_FAILURE),
    ),
  };
}

export function resolveRuntimeTenantRequestFromRequest(
  request: Request,
): RuntimeTenantRequestResolution {
  const middlewareResolution = readRuntimeTenantResolutionFromHeaders(request.headers);

  if (middlewareResolution) {
    return middlewareResolution;
  }

  const url = new URL(request.url);

  return resolveRuntimeTenantRequest({
    hostname: request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host,
    queryTenant: url.searchParams.get(RUNTIME_TENANT_QUERY_PARAM),
  });
}
