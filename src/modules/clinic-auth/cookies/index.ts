import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CLINIC_AUTH_CONFIG } from "../contracts/types";
import {
  getClinicAuthCookieBaseOptions,
  getClinicAuthCookieBaseOptionsForCurrentRequest,
} from "./options";

export const CLINIC_SESSION_COOKIE = CLINIC_AUTH_CONFIG.sessionCookieName;

export async function getClinicSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CLINIC_SESSION_COOKIE)?.value;
}

export async function setClinicSessionCookieOnResponse(
  response: NextResponse,
  sessionToken: string,
  request?: Request | Headers | { headers: Headers } | null,
): Promise<NextResponse> {
  const maxAge = CLINIC_AUTH_CONFIG.sessionExpiryDays * 24 * 60 * 60;
  const baseOptions = request
    ? getClinicAuthCookieBaseOptions(request)
    : await getClinicAuthCookieBaseOptionsForCurrentRequest();

  response.cookies.set(CLINIC_SESSION_COOKIE, sessionToken, {
    ...baseOptions,
    maxAge,
  });

  return response;
}

export async function clearClinicSessionCookieOnResponse(
  response: NextResponse,
  request?: Request | Headers | { headers: Headers } | null,
): Promise<NextResponse> {
  const baseOptions = request
    ? getClinicAuthCookieBaseOptions(request)
    : await getClinicAuthCookieBaseOptionsForCurrentRequest();

  response.cookies.set(CLINIC_SESSION_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
  });

  return response;
}

export async function clearClinicSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const baseOptions = await getClinicAuthCookieBaseOptionsForCurrentRequest();

  cookieStore.set(CLINIC_SESSION_COOKIE, "", {
    ...baseOptions,
    maxAge: 0,
  });
}
