const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const BYPASS_FLAG_VALUES = new Set(["1", "true", "yes", "on"]);

function normalizeHostname(hostname?: string | null) {
  return hostname?.split(":")[0]?.trim().toLowerCase() ?? "";
}

function getConfiguredLocalRootDomains() {
  const configured = [
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    process.env.ROOT_DOMAIN,
  ]
    .map((value) => normalizeHostname(value))
    .filter((value): value is string => Boolean(value));

  return new Set(["lvh.me", ...configured]);
}

export function isLocalTenantAuthBypassEnabled(hostname?: string | null) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const bypassFlag = process.env.TENANT_AUTH_BYPASS_LOCAL?.trim().toLowerCase() ?? "";
  if (!BYPASS_FLAG_VALUES.has(bypassFlag)) {
    return false;
  }

  const normalizedHostname = normalizeHostname(hostname);
  const localRootDomains = getConfiguredLocalRootDomains();

  const matchesLocalRootDomain = Array.from(localRootDomains).some((rootDomain) => {
    return (
      normalizedHostname === rootDomain ||
      normalizedHostname.endsWith(`.${rootDomain}`)
    );
  });

  return (
    LOCAL_HOSTNAMES.has(normalizedHostname) ||
    normalizedHostname.endsWith(".localhost") ||
    matchesLocalRootDomain
  );
}
