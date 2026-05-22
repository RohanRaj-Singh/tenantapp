import { headers } from "next/headers";

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

type RequestHeadersLike = Pick<Headers, "get">;

type TenantAuthCookieRequestLike =
  | RequestHeadersLike
  | { headers: RequestHeadersLike }
  | { url: string; headers?: RequestHeadersLike };

function normalizeProtocolValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:$/, "");

  return normalized === "http" || normalized === "https"
    ? normalized
    : null;
}

function getRequestHeaders(
  request?: TenantAuthCookieRequestLike | null,
): RequestHeadersLike | null {
  if (!request) {
    return null;
  }

  if ("get" in request && typeof request.get === "function") {
    return request;
  }

  return "headers" in request ? request.headers ?? null : null;
}

function getForwardedProtocol(headersLike: RequestHeadersLike | null) {
  if (!headersLike) {
    return null;
  }

  const directProtocol =
    normalizeProtocolValue(headersLike.get("x-forwarded-proto")) ??
    normalizeProtocolValue(headersLike.get("x-forwarded-protocol")) ??
    normalizeProtocolValue(headersLike.get("x-url-scheme")) ??
    normalizeProtocolValue(headersLike.get("x-scheme"));

  if (directProtocol) {
    return directProtocol;
  }

  const forwarded = headersLike.get("forwarded");
  if (!forwarded) {
    return null;
  }

  const protoMatch = forwarded.match(/proto=([^;,\s]+)/i);
  return normalizeProtocolValue(protoMatch?.[1] ?? null);
}

function getRequestUrlProtocol(
  request?: TenantAuthCookieRequestLike | null,
) {
  if (!request || !("url" in request) || typeof request.url !== "string") {
    return null;
  }

  try {
    return normalizeProtocolValue(new URL(request.url).protocol);
  } catch {
    return null;
  }
}

function getOriginProtocol(headersLike: RequestHeadersLike | null) {
  const originCandidate = headersLike?.get("origin") ?? headersLike?.get("referer");
  if (!originCandidate) {
    return null;
  }

  try {
    return normalizeProtocolValue(new URL(originCandidate).protocol);
  } catch {
    return null;
  }
}

export function shouldUseSecureTenantAuthCookies(
  request?: TenantAuthCookieRequestLike | null,
) {
  const requestHeaders = getRequestHeaders(request);
  const protocol =
    getForwardedProtocol(requestHeaders) ??
    getRequestUrlProtocol(request) ??
    getOriginProtocol(requestHeaders);

  if (protocol) {
    return protocol === "https";
  }

  return process.env.NODE_ENV === "production";
}

export function getTenantAuthCookieBaseOptions(
  request?: TenantAuthCookieRequestLike | null,
) {
  const domain = getTenantAuthCookieDomain();

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureTenantAuthCookies(request),
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export async function getTenantAuthCookieBaseOptionsForCurrentRequest() {
  return getTenantAuthCookieBaseOptions(await headers());
}
