import {
  RUNTIME_TENANT_QUERY_PARAM,
  sanitizeTenantSlug,
} from "@/runtime/tenant/tenantResolution";

export const TENANT_LOGIN_PATH = "/login";
export const TENANT_DASHBOARD_HOME_PATH = "/dashboard";
export const TENANT_PASSWORD_CHANGE_PATH = "/change-password";
export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";

const TENANT_PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/reports",
  "/settings",
  TENANT_PASSWORD_CHANGE_PATH,
] as const;

export function isTenantProtectedPath(pathname: string): boolean {
  return TENANT_PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isTenantPublicPath(pathname: string): boolean {
  return pathname === TENANT_LOGIN_PATH || pathname.startsWith(`${TENANT_LOGIN_PATH}/`);
}

export function isValidTenantSessionTokenFormat(token?: string | null): boolean {
  return typeof token === "string" && /^tds_[a-f0-9]{64}$/.test(token);
}

export function getSafeTenantRedirectPath(nextPath?: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return TENANT_DASHBOARD_HOME_PATH;
  }

  return nextPath;
}

export function getTenantSlugFromRedirectPath(nextPath?: string | null): string | null {
  const safeNextPath = getSafeTenantRedirectPath(nextPath);

  try {
    const url = new URL(safeNextPath, "http://tenant.local");
    return sanitizeTenantSlug(url.searchParams.get(RUNTIME_TENANT_QUERY_PARAM));
  } catch {
    return null;
  }
}

export function appendTenantSlugToPath(
  path: string,
  tenantSlug?: string | null,
): string {
  const safeTenantSlug = sanitizeTenantSlug(tenantSlug);

  if (!safeTenantSlug) {
    return path;
  }

  try {
    const url = new URL(path, "http://tenant.local");

    if (!url.searchParams.has(RUNTIME_TENANT_QUERY_PARAM)) {
      url.searchParams.set(RUNTIME_TENANT_QUERY_PARAM, safeTenantSlug);
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
}

export function buildTenantLoginRedirectPath(
  nextPath?: string | null,
  message?: string | null,
  tenantSlug?: string | null,
): string {
  const params = new URLSearchParams();
  const safeNextPath = getSafeTenantRedirectPath(nextPath);

  if (safeNextPath !== TENANT_DASHBOARD_HOME_PATH) {
    params.set("next", safeNextPath);
  }

  if (message?.trim()) {
    params.set("message", message.trim());
  }

  const safeTenantSlug = sanitizeTenantSlug(tenantSlug);
  if (safeTenantSlug) {
    params.set(RUNTIME_TENANT_QUERY_PARAM, safeTenantSlug);
  }

  const query = params.toString();
  return query ? `${TENANT_LOGIN_PATH}?${query}` : TENANT_LOGIN_PATH;
}
