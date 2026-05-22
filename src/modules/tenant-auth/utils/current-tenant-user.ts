import { redirect } from "next/navigation";
import { clearTenantAuthCookies, getTenantSessionCookie } from "../cookies";
import {
  TENANT_PASSWORD_CHANGE_PATH,
  buildTenantLoginRedirectPath,
} from "../guards/route-protection";
import { getCurrentTenantAuthContext, getCurrentTenantAuthValidation } from "../middleware/tenant-auth";
import { getCurrentTenantRequestScope } from "./request-tenant";

export interface RequireTenantUserOptions {
  allowPasswordChange?: boolean;
  nextPath?: string;
}

export async function getCurrentTenantUserContext() {
  return getCurrentTenantAuthContext();
}

export async function requireCurrentTenantUser(
  options: RequireTenantUserOptions = {},
) {
  const validation = await getCurrentTenantAuthValidation();

  if (!validation.success || !validation.context) {
    const hadSessionCookie = Boolean(await getTenantSessionCookie());
    const requestScope = await getCurrentTenantRequestScope();
    const tenantSlug =
      requestScope.resolution.source === "hostname"
        ? null
        : requestScope.tenant?.slug ?? requestScope.resolution.tenantSlug;

    if (validation.clearCookies) {
      await clearTenantAuthCookies();
    }

    redirect(
      buildTenantLoginRedirectPath(
        options.nextPath,
        hadSessionCookie ? validation.error : undefined,
        tenantSlug,
      ),
    );
  }

  if (validation.context.user.mustChangePassword && !options.allowPasswordChange) {
    redirect(TENANT_PASSWORD_CHANGE_PATH);
  }

  return validation.context;
}
