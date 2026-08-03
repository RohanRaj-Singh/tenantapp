import {
  getTenantAuthCookieBaseOptions,
  getTenantAuthCookieBaseOptionsForCurrentRequest,
  shouldUseSecureTenantAuthCookies,
} from "@/src/modules/tenant-auth/cookies/options";

/**
 * Clinic portal cookies use the same base policy as tenant dashboard cookies
 * (httpOnly, sameSite=lax, secure on https / production, optional domain).
 * Re-exported from the tenant-auth options module so both auth silos share a
 * single cookie-security implementation.
 */
export {
  getTenantAuthCookieBaseOptions as getClinicAuthCookieBaseOptions,
  getTenantAuthCookieBaseOptionsForCurrentRequest as getClinicAuthCookieBaseOptionsForCurrentRequest,
  shouldUseSecureTenantAuthCookies as shouldUseSecureClinicAuthCookies,
};
