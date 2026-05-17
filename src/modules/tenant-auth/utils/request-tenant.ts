import { headers } from "next/headers";
import {
  withBrandingDefaults,
} from "@/runtime/utils/brandingUtils";
import type { RuntimeTenantRequestResolution } from "@/runtime/tenant/tenantResolution";
import { toTenantRuntimeConfig } from "@/src/server/runtime/runtimeMapper";
import { resolveRuntimeTenantRequestFromHeaders } from "@/src/server/runtime/requestTenantResolution";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { ensureDevelopmentSeedData } from "@/src/server/services/devSeedService";
import type { RuntimeConfigDocument, TenantDocument } from "@/src/server/db/documents";
import type { TenantLookup } from "../contracts/types";

export interface TenantRequestScope {
  resolution: RuntimeTenantRequestResolution;
  tenant: TenantDocument | null;
  runtimeConfig: RuntimeConfigDocument | null;
}

function toTenantLookup(tenant: TenantDocument): TenantLookup {
  return {
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
  };
}

export async function getTenantLookupById(
  tenantId: string,
): Promise<TenantLookup | null> {
  await ensureDevelopmentSeedData();
  const repositories = await getRepositoryContext();
  const tenant = await repositories.tenants.findByTenantId(tenantId);
  return tenant ? toTenantLookup(tenant) : null;
}

export async function getTenantLookupBySlug(
  slug: string,
): Promise<TenantLookup | null> {
  await ensureDevelopmentSeedData();
  const repositories = await getRepositoryContext();
  const tenant = await repositories.tenants.findBySlug(slug);
  return tenant ? toTenantLookup(tenant) : null;
}

export async function getTenantRequestScopeFromHeaders(
  headerSource: Headers,
): Promise<TenantRequestScope> {
  await ensureDevelopmentSeedData();
  const resolution = resolveRuntimeTenantRequestFromHeaders(headerSource);
  const repositories = await getRepositoryContext();
  const tenant = resolution.tenantSlug
    ? await repositories.tenants.findBySlug(resolution.tenantSlug)
    : null;
  const runtimeConfig = tenant
    ? await repositories.runtimeConfigs.findActiveByTenantId(tenant.tenantId)
    : null;

  return {
    resolution,
    tenant,
    runtimeConfig,
  };
}

export async function getCurrentTenantRequestScope(): Promise<TenantRequestScope> {
  const headerStore = await headers();
  return getTenantRequestScopeFromHeaders(new Headers(headerStore));
}

export async function getTenantRuntimeConfigForTenantId(tenantId: string) {
  await ensureDevelopmentSeedData();
  const repositories = await getRepositoryContext();
  const tenant = await repositories.tenants.findByTenantId(tenantId);
  if (!tenant) {
    return null;
  }

  const runtimeConfig = await repositories.runtimeConfigs.findActiveByTenantId(tenantId);
  if (!runtimeConfig) {
    return null;
  }

  return withBrandingDefaults(toTenantRuntimeConfig(tenant, runtimeConfig));
}
