import { redirect } from "next/navigation";
import { getCurrentClinicAuthValidation } from "@/src/modules/clinic-auth/middleware/clinic-auth";
import type { ClinicAuthContext } from "@/src/modules/clinic-auth/contracts/types";

export const CLINIC_LOGIN_PATH = "/clinic/login";
export const CLINIC_CHANGE_PASSWORD_PATH = "/clinic/change-password";
export const CLINIC_CLAIMS_PATH = "/clinic/claims";

interface RequireClinicUserOptions {
  /**
   * When true, a user flagged `mustChangePassword` is allowed through (used by
   * the change-password page itself). Otherwise they are redirected to it.
   */
  allowPasswordChange?: boolean;
}

/**
 * Server-side gate for clinic portal pages. Redirects unauthenticated callers to
 * the clinic login page and, unless `allowPasswordChange` is set, forces users
 * with a pending password change to the change-password page before continuing.
 */
export async function requireClinicPortalUser(
  options: RequireClinicUserOptions = {},
): Promise<ClinicAuthContext> {
  const validation = await getCurrentClinicAuthValidation();

  if (!validation.success || !validation.context) {
    redirect(CLINIC_LOGIN_PATH);
  }

  const context = validation.context;
  if (context.user.mustChangePassword && !options.allowPasswordChange) {
    redirect(CLINIC_CHANGE_PASSWORD_PATH);
  }

  return context;
}
