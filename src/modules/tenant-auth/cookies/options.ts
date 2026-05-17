function normalizeCookieDomain(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function getTenantAuthCookieDomain() {
  return normalizeCookieDomain(process.env.TENANT_AUTH_COOKIE_DOMAIN);
}

export function getTenantAuthCookieBaseOptions() {
  const domain = getTenantAuthCookieDomain();

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

