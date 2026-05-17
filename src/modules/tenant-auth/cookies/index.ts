import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TENANT_AUTH_CONFIG } from "../contracts/types";

export const TENANT_SESSION_COOKIE = TENANT_AUTH_CONFIG.sessionCookieName;
export const TENANT_PASSWORD_CHANGE_COOKIE =
  TENANT_AUTH_CONFIG.passwordChangeCookieName;

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

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

  cookieStore.set(TENANT_SESSION_COOKIE, sessionToken, {
    ...getCookieBaseOptions(),
    maxAge,
  });
  cookieStore.set(
    TENANT_PASSWORD_CHANGE_COOKIE,
    requiresPasswordChange ? "1" : "0",
    {
      ...getCookieBaseOptions(),
      maxAge,
    },
  );
}

export async function clearTenantAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TENANT_SESSION_COOKIE, "", {
    ...getCookieBaseOptions(),
    maxAge: 0,
  });
  cookieStore.set(TENANT_PASSWORD_CHANGE_COOKIE, "", {
    ...getCookieBaseOptions(),
    maxAge: 0,
  });
}

export function setTenantAuthCookiesOnResponse(
  response: NextResponse,
  sessionToken: string,
  requiresPasswordChange: boolean,
): NextResponse {
  const maxAge = TENANT_AUTH_CONFIG.sessionExpiryDays * 24 * 60 * 60;

  response.cookies.set(TENANT_SESSION_COOKIE, sessionToken, {
    ...getCookieBaseOptions(),
    maxAge,
  });
  response.cookies.set(
    TENANT_PASSWORD_CHANGE_COOKIE,
    requiresPasswordChange ? "1" : "0",
    {
      ...getCookieBaseOptions(),
      maxAge,
    },
  );

  return response;
}

export function clearTenantAuthCookiesOnResponse(
  response: NextResponse,
): NextResponse {
  response.cookies.set(TENANT_SESSION_COOKIE, "", {
    ...getCookieBaseOptions(),
    maxAge: 0,
  });
  response.cookies.set(TENANT_PASSWORD_CHANGE_COOKIE, "", {
    ...getCookieBaseOptions(),
    maxAge: 0,
  });

  return response;
}
