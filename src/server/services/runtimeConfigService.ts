import type { RuntimeTenantRequestResolution } from "@/runtime/tenant/tenantResolution";
import { ApiError } from "@/src/server/api/errors";
import { toTenantRuntimeConfig } from "@/src/server/runtime/runtimeMapper";
import { resolveRuntimeContext } from "./runtimeContextService";

export async function loadRuntimeConfig(tenantSlug: string) {
  const { tenant, runtimeConfig } = await resolveRuntimeContext({ tenantSlug });
  return toTenantRuntimeConfig(tenant, runtimeConfig);
}

function createTenantResolutionError(
  requestTenant: RuntimeTenantRequestResolution,
) {
  return new ApiError(
    404,
    "TENANT_RESOLUTION_REQUIRED",
    "This survey is currently unavailable.",
    {
      hostname: requestTenant.hostname,
      rootDomain: requestTenant.rootDomain,
      failureReason: requestTenant.failureReason,
    },
  );
}

export async function loadRuntimeConfigForRequest(
  requestTenant: RuntimeTenantRequestResolution,
) {
  if (!requestTenant.tenantSlug) {
    throw createTenantResolutionError(requestTenant);
  }

  const runtimeConfig = await loadRuntimeConfig(requestTenant.tenantSlug);

  return {
    tenantSlug: runtimeConfig.tenant.slug,
    source: requestTenant.source,
    hostname: requestTenant.hostname,
    rootDomain: requestTenant.rootDomain,
    config: runtimeConfig,
  };
}
