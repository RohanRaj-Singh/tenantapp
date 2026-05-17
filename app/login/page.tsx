import { redirect } from "next/navigation";
import { clearTenantAuthCookies } from "@/src/modules/tenant-auth/cookies";
import { TenantLoginPage } from "@/src/modules/tenant-auth/components/TenantLoginPage";
import {
  TENANT_PASSWORD_CHANGE_PATH,
  getSafeTenantRedirectPath,
} from "@/src/modules/tenant-auth/guards/route-protection";
import { getCurrentTenantAuthValidation } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { getCurrentTenantRequestScope } from "@/src/modules/tenant-auth/utils/request-tenant";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams: Record<string, string | string[] | undefined> =
    await (searchParams ?? Promise.resolve({}));
  const nextPath = getSafeTenantRedirectPath(readSearchParam(resolvedSearchParams.next));
  const providedMessage = readSearchParam(resolvedSearchParams.message);

  const validation = await getCurrentTenantAuthValidation();
  if (validation.success && validation.context) {
    redirect(
      validation.context.user.mustChangePassword
        ? TENANT_PASSWORD_CHANGE_PATH
        : nextPath,
    );
  }

  if (validation.clearCookies) {
    await clearTenantAuthCookies();
  }

  const requestScope = await getCurrentTenantRequestScope();
  const tenantName = requestScope.tenant?.name ?? null;
  const tenantSlug =
    requestScope.tenant?.slug ?? requestScope.resolution.tenantSlug ?? null;
  const fallbackMessage =
    providedMessage ??
    (validation.reason && validation.reason !== "SESSION_MISSING"
      ? validation.error ?? null
      : null);

  return (
    <TenantLoginPage
      tenantName={tenantName}
      tenantSlug={tenantSlug}
      message={fallbackMessage}
      nextPath={nextPath}
    />
  );
}
