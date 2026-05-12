import { ApiError } from "@/src/server/api/errors";
import type { RuntimeConfigDocument } from "@/src/server/db/documents";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { ensureDevelopmentSeedData } from "./devSeedService";

interface ResolveRuntimeContextInput {
  tenantSlug?: string;
  tenantId?: string;
  runtimeConfigId?: string;
}

function createRuntimeUnavailableError(
  status: number,
  code: string,
  details: Record<string, unknown> = {},
) {
  return new ApiError(
    status,
    code,
    "This survey is currently unavailable.",
    details,
  );
}

function assertRuntimeConfigMatchesInput(
  runtimeConfig: RuntimeConfigDocument,
  input: ResolveRuntimeContextInput,
) {
  if (input.tenantSlug && runtimeConfig.tenantSlug !== input.tenantSlug) {
    throw new ApiError(
      409,
      "TENANT_RUNTIME_MISMATCH",
      "The requested tenant does not match the active runtime configuration.",
      {
        expectedTenantSlug: input.tenantSlug,
        runtimeConfigTenantSlug: runtimeConfig.tenantSlug,
        runtimeConfigId: runtimeConfig.runtimeConfigId,
      },
    );
  }

  if (input.tenantId && runtimeConfig.tenantId !== input.tenantId) {
    throw new ApiError(
      409,
      "TENANT_RUNTIME_MISMATCH",
      "The requested tenant does not match the active runtime configuration.",
      {
        expectedTenantId: input.tenantId,
        runtimeConfigTenantId: runtimeConfig.tenantId,
        runtimeConfigId: runtimeConfig.runtimeConfigId,
      },
    );
  }
}

export async function resolveRuntimeContext(input: ResolveRuntimeContextInput) {
  await ensureDevelopmentSeedData();

  const repositories = await getRepositoryContext();
  let runtimeConfig =
    input.runtimeConfigId
      ? await repositories.runtimeConfigs.findByRuntimeConfigId(input.runtimeConfigId)
      : null;

  if (runtimeConfig) {
    assertRuntimeConfigMatchesInput(runtimeConfig, input);
  }

  if (!runtimeConfig && input.tenantSlug) {
    runtimeConfig = await repositories.runtimeConfigs.findActiveByTenantSlug(input.tenantSlug);
  }

  if (!runtimeConfig && input.tenantId) {
    runtimeConfig = await repositories.runtimeConfigs.findActiveByTenantId(input.tenantId);
  }

  if (!runtimeConfig) {
    throw createRuntimeUnavailableError(
      404,
      "RUNTIME_UNAVAILABLE",
      {
        tenantSlug: input.tenantSlug,
        tenantId: input.tenantId,
        runtimeConfigId: input.runtimeConfigId,
      },
    );
  }

  assertRuntimeConfigMatchesInput(runtimeConfig, input);

  const tenant = await repositories.tenants.findByTenantId(runtimeConfig.tenantId);

  if (!tenant) {
    throw createRuntimeUnavailableError(404, "TENANT_NOT_FOUND", {
      tenantId: runtimeConfig.tenantId,
      tenantSlug: runtimeConfig.tenantSlug,
      runtimeConfigId: runtimeConfig.runtimeConfigId,
    });
  }

  if (tenant.status !== "active") {
    throw createRuntimeUnavailableError(
      409,
      "TENANT_UNAVAILABLE",
      {
        tenantId: tenant.tenantId,
        tenantSlug: tenant.slug,
        status: tenant.status,
      },
    );
  }

  return {
    repositories,
    tenant,
    runtimeConfig,
  };
}
