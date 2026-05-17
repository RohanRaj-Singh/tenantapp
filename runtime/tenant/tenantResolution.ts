export const RUNTIME_TENANT_QUERY_PARAM = "tenant";
export const RUNTIME_TENANT_STORAGE_KEY = "remedygcc-active-tenant";
export const DEFAULT_RUNTIME_TENANT_SLUG = "demo";
export const DEFAULT_ROOT_DOMAIN = "lvh.me";

export const RUNTIME_TENANT_HEADER_SLUG = "x-remedygcc-tenant-slug";
export const RUNTIME_TENANT_HEADER_SOURCE = "x-remedygcc-tenant-source";
export const RUNTIME_TENANT_HEADER_HOSTNAME = "x-remedygcc-tenant-hostname";
export const RUNTIME_TENANT_HEADER_ROOT_DOMAIN = "x-remedygcc-root-domain";
export const RUNTIME_TENANT_HEADER_QUERY = "x-remedygcc-tenant-query";
export const RUNTIME_TENANT_HEADER_FAILURE = "x-remedygcc-tenant-failure";

export type RuntimeTenantResolutionSource =
  | "hostname"
  | "query"
  | "stored"
  | "environment"
  | "none";

export type RuntimeTenantResolutionFailureReason =
  | "invalid_query_tenant"
  | "invalid_subdomain"
  | "local_hostname_missing_tenant"
  | "missing_hostname"
  | "root_domain_missing_subdomain"
  | "tenant_not_provided"
  | "unsupported_hostname";

export interface HostnameTenantResolutionResult {
  tenantSlug: string | null;
  hostname: string | null;
  rootDomain: string;
  canUseLocalFallback: boolean;
  failureReason: RuntimeTenantResolutionFailureReason | null;
}

export interface RuntimeTenantRequestResolution {
  tenantSlug: string | null;
  source: RuntimeTenantResolutionSource;
  hostname: string | null;
  rootDomain: string;
  hostTenantSlug: string | null;
  queryTenantSlug: string | null;
  failureReason: RuntimeTenantResolutionFailureReason | null;
}

function inferRootDomainFromHostname(hostname?: string | null) {
  const normalizedHostname = normalizeHostname(hostname);

  if (!normalizedHostname || isLocalHostname(normalizedHostname)) {
    return null;
  }

  const labels = normalizedHostname.split(".");
  if (labels.length < 2) {
    return null;
  }

  return labels.slice(-2).join(".");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTenantSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function stripPort(hostname: string) {
  if (hostname.startsWith("[") && hostname.includes("]")) {
    return hostname.slice(1, hostname.indexOf("]"));
  }

  if (hostname.includes(":") && hostname.split(":").length === 2) {
    return hostname.split(":")[0] ?? hostname;
  }

  return hostname;
}

export function normalizeHostname(hostname?: string | null) {
  if (!isNonEmptyString(hostname)) {
    return null;
  }

  return stripPort(hostname.trim().toLowerCase()).replace(/\.$/, "");
}

export function resolveRootDomain(rootDomain?: string | null, hostname?: string | null) {
  const configuredRootDomain =
    rootDomain ??
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.ROOT_DOMAIN;

  return (
    normalizeHostname(configuredRootDomain) ??
    inferRootDomainFromHostname(hostname) ??
    DEFAULT_ROOT_DOMAIN
  );
}

export function isLocalHostname(hostname?: string | null) {
  const normalizedHostname = normalizeHostname(hostname);

  if (!normalizedHostname) {
    return false;
  }

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".localhost")
  );
}

export function sanitizeTenantSlug(slug?: string | null) {
  if (!isNonEmptyString(slug)) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  return isValidTenantSlug(normalizedSlug) ? normalizedSlug : null;
}

export function normalizeTenantSlug(
  slug?: string | null,
  fallback = DEFAULT_RUNTIME_TENANT_SLUG,
) {
  return sanitizeTenantSlug(slug) ?? fallback;
}

export function resolveTenantSlugFromHostname(
  hostname?: string | null,
  rootDomain?: string | null,
) {
  return resolveHostnameTenant(hostname, rootDomain).tenantSlug;
}

export function resolveHostnameTenant(
  hostname?: string | null,
  rootDomain?: string | null,
): HostnameTenantResolutionResult {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedRootDomain = resolveRootDomain(rootDomain, normalizedHostname);

  if (!normalizedHostname) {
    return {
      tenantSlug: null,
      hostname: null,
      rootDomain: normalizedRootDomain,
      canUseLocalFallback: true,
      failureReason: "missing_hostname",
    };
  }

  if (isLocalHostname(normalizedHostname)) {
    return {
      tenantSlug: null,
      hostname: normalizedHostname,
      rootDomain: normalizedRootDomain,
      canUseLocalFallback: true,
      failureReason: "local_hostname_missing_tenant",
    };
  }

  if (normalizedHostname === normalizedRootDomain) {
    return {
      tenantSlug: null,
      hostname: normalizedHostname,
      rootDomain: normalizedRootDomain,
      canUseLocalFallback: true,
      failureReason: "root_domain_missing_subdomain",
    };
  }

  if (!normalizedHostname.endsWith(`.${normalizedRootDomain}`)) {
    return {
      tenantSlug: null,
      hostname: normalizedHostname,
      rootDomain: normalizedRootDomain,
      canUseLocalFallback: false,
      failureReason: "unsupported_hostname",
    };
  }

  const subdomain = normalizedHostname.slice(
    0,
    normalizedHostname.length - normalizedRootDomain.length - 1,
  );

  if (!isNonEmptyString(subdomain) || subdomain.includes(".")) {
    return {
      tenantSlug: null,
      hostname: normalizedHostname,
      rootDomain: normalizedRootDomain,
      canUseLocalFallback: false,
      failureReason: "invalid_subdomain",
    };
  }

  const tenantSlug = sanitizeTenantSlug(subdomain);

  if (!tenantSlug || tenantSlug === "www") {
    return {
      tenantSlug: null,
      hostname: normalizedHostname,
      rootDomain: normalizedRootDomain,
      canUseLocalFallback: false,
      failureReason: "invalid_subdomain",
    };
  }

  return {
    tenantSlug,
    hostname: normalizedHostname,
    rootDomain: normalizedRootDomain,
    canUseLocalFallback: false,
    failureReason: null,
  };
}

interface ResolveRuntimeTenantRequestInput {
  hostname?: string | null;
  queryTenant?: string | null;
  storedTenant?: string | null;
  envTenantSlug?: string | null;
  rootDomain?: string | null;
}

export function resolveRuntimeTenantRequest(
  input: ResolveRuntimeTenantRequestInput,
): RuntimeTenantRequestResolution {
  const hostnameResolution = resolveHostnameTenant(
    input.hostname,
    input.rootDomain,
  );
  const queryTenantSlug = sanitizeTenantSlug(input.queryTenant);
  const storedTenantSlug = sanitizeTenantSlug(input.storedTenant);
  const envTenantSlug = sanitizeTenantSlug(input.envTenantSlug);
  const hasQueryTenant = isNonEmptyString(input.queryTenant);

  if (hostnameResolution.tenantSlug) {
    return {
      tenantSlug: hostnameResolution.tenantSlug,
      source: "hostname",
      hostname: hostnameResolution.hostname,
      rootDomain: hostnameResolution.rootDomain,
      hostTenantSlug: hostnameResolution.tenantSlug,
      queryTenantSlug,
      failureReason: null,
    };
  }

  if (hostnameResolution.canUseLocalFallback) {
    if (hasQueryTenant && !queryTenantSlug) {
      return {
        tenantSlug: null,
        source: "none",
        hostname: hostnameResolution.hostname,
        rootDomain: hostnameResolution.rootDomain,
        hostTenantSlug: null,
        queryTenantSlug: null,
        failureReason: "invalid_query_tenant",
      };
    }

    if (queryTenantSlug) {
      return {
        tenantSlug: queryTenantSlug,
        source: "query",
        hostname: hostnameResolution.hostname,
        rootDomain: hostnameResolution.rootDomain,
        hostTenantSlug: null,
        queryTenantSlug,
        failureReason: null,
      };
    }

    if (storedTenantSlug) {
      return {
        tenantSlug: storedTenantSlug,
        source: "stored",
        hostname: hostnameResolution.hostname,
        rootDomain: hostnameResolution.rootDomain,
        hostTenantSlug: null,
        queryTenantSlug,
        failureReason: null,
      };
    }

    if (envTenantSlug) {
      return {
        tenantSlug: envTenantSlug,
        source: "environment",
        hostname: hostnameResolution.hostname,
        rootDomain: hostnameResolution.rootDomain,
        hostTenantSlug: null,
        queryTenantSlug,
        failureReason: null,
      };
    }
  }

  return {
    tenantSlug: null,
    source: "none",
    hostname: hostnameResolution.hostname,
    rootDomain: hostnameResolution.rootDomain,
    hostTenantSlug: null,
    queryTenantSlug,
    failureReason:
      hostnameResolution.failureReason ?? (hasQueryTenant ? "invalid_query_tenant" : "tenant_not_provided"),
  };
}

export function resolveRuntimeTenantRequestFromWindow() {
  if (typeof window === "undefined") {
    return resolveRuntimeTenantRequest({
      hostname: undefined,
      envTenantSlug: process.env.NEXT_PUBLIC_TENANT_SLUG,
    });
  }

  const url = new URL(window.location.href);

  return resolveRuntimeTenantRequest({
    hostname: window.location.hostname,
    queryTenant: url.searchParams.get(RUNTIME_TENANT_QUERY_PARAM),
    storedTenant: window.localStorage.getItem(RUNTIME_TENANT_STORAGE_KEY),
    envTenantSlug: process.env.NEXT_PUBLIC_TENANT_SLUG,
  });
}
