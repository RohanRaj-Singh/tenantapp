import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TENANT_AUTH_CONFIG } from "../contracts/types";
import {
  getTenantAuthCookieBaseOptions,
  getTenantAuthCookieBaseOptionsForCurrentRequest,
} from "./options";

export const TENANT_SESSION_COOKIE = TENANT_AUTH_CONFIG.sessionCookieName;
export const TENANT_PASSWORD_CHANGE_COOKIE =
  TENANT_AUTH_CONFIG.passwordChangeCookieName;

export async function getTenantSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_SESSION_COOKIE)?.value;
}

export async function hasTenantPasswordChangeCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_PASSWORD_CHANGE_COOKIE)?.value === "1";
}

export async function setTenantAuthCookies(
  sessionToken: string,
  requiresPasswordChange: boolean,
): Promise<void> {
  const cookieStore = await cookies();
  const maxAge = TENANT_AUTH_CONFIG.sessionExpiryDays * 24 * 60 * 60;
  const baseOptions = await getTenantAuthCookieBaseOptionsForCurrentRequest();

  cookieStore.set(TENANT_SESSION_COOKIE, sessionToken, {
    ...baseOptions,
    maxAge,
  });
  cookieStore.set(
    TENANT_PASSWORD_CHANGE_COOKIE,
    requiresPasswordChange ? "1" : "0",
    {
      ...baseOptions,
      maxAge,
    },
  );
}

export async function clearTenantAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  const baseOptions = await getTenantAuthCookieBaseOptionsForCurrentRequest();

  cookieStore.set(TENANT_SESSION_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
  });
  cookieStore.set(TENANT_PASSWORD_CHANGE_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
  });
}

export async function setTenantAuthCookiesOnResponse(
  response: NextResponse,
  sessionToken: string,
  requiresPasswordChange: boolean,
  request?: Request | Headers | { headers: Headers } | null,
): Promise<NextResponse> {
  const maxAge = TENANT_AUTH_CONFIG.sessionExpiryDays * 24 * 60 * 60;
  const baseOptions = request
    ? getTenantAuthCookieBaseOptions(request)
    : await getTenantAuthCookieBaseOptionsForCurrentRequest();

  response.cookies.set(TENANT_SESSION_COOKIE, sessionToken, {
    ...baseOptions,
    maxAge,
  });
  response.cookies.set(
    TENANT_PASSWORD_CHANGE_COOKIE,
    requiresPasswordChange ? "1" : "0",
    {
      ...baseOptions,
      maxAge,
    },
  );

  return response;
}

export async function clearTenantAuthCookiesOnResponse(
  response: NextResponse,
  request?: Request | Headers | { headers: Headers } | null,
): Promise<NextResponse> {
  const baseOptions = request
    ? getTenantAuthCookieBaseOptions(request)
    : await getTenantAuthCookieBaseOptionsForCurrentRequest();

  response.cookies.set(TENANT_SESSION_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
  });
  response.cookies.set(TENANT_PASSWORD_CHANGE_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
  });

  return response;
}
