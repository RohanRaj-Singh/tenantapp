import { ApiError } from "@/src/server/api/errors";
import {
  createFilterHash,
  normalizeDashboardFilters,
} from "@/src/server/aggregation/filters";
import { toDashboardAggregationSnapshot } from "@/src/server/runtime/runtimeMapper";
import { generateAndStoreAggregationSnapshot } from "./aggregationService";
import { resolveRuntimeContext } from "./runtimeContextService";

interface DashboardMetricsRequest {
  tenantSlug: string;
  scannerVersionId?: string;
  calculationVersionId?: string;
  periodFrom?: string;
  periodTo?: string;
  filters?: Record<string, string | undefined>;
}

function normalizePeriod(periodFrom?: string, periodTo?: string) {
  if (!periodFrom && !periodTo) {
    return undefined;
  }

  if (!periodFrom || !periodTo) {
    throw new ApiError(
      400,
      "INVALID_PERIOD_SCOPE",
      "Both periodFrom and periodTo must be provided together.",
    );
  }

  return {
    from: new Date(periodFrom).toISOString(),
    to: new Date(periodTo).toISOString(),
  };
}

export async function loadDashboardMetrics(request: DashboardMetricsRequest) {
  const { repositories, tenant, runtimeConfig } = await resolveRuntimeContext({
    tenantSlug: request.tenantSlug,
  });

  if (
    request.scannerVersionId &&
    request.scannerVersionId !== runtimeConfig.versionRefs.scannerVersionId
  ) {
    throw new ApiError(
      409,
      "VERSION_SCOPE_UNAVAILABLE",
      "The requested scanner version is not active for this tenant runtime.",
    );
  }

  if (
    request.calculationVersionId &&
    request.calculationVersionId !== runtimeConfig.versionRefs.calculationVersionId
  ) {
    throw new ApiError(
      409,
      "VERSION_SCOPE_UNAVAILABLE",
      "The requested calculation version is not active for this tenant runtime.",
    );
  }

  const filters = normalizeDashboardFilters(request.filters ?? {});
  const period = normalizePeriod(request.periodFrom, request.periodTo);
  const existingSnapshot = await repositories.snapshots.findLatestByScope({
    tenantId: tenant.tenantId,
    runtimeConfigId: runtimeConfig.runtimeConfigId,
    scannerVersionId: runtimeConfig.versionRefs.scannerVersionId,
    calculationVersionId: runtimeConfig.versionRefs.calculationVersionId,
    filterHash: createFilterHash(filters),
    period,
  });

  if (existingSnapshot) {
    return {
      status: "ready" as const,
      snapshot: toDashboardAggregationSnapshot(existingSnapshot),
    };
  }

  const snapshot = await generateAndStoreAggregationSnapshot({
    repositories,
    tenant,
    runtimeConfig,
    filters,
    period,
  });

  return {
    status: "ready" as const,
    snapshot: toDashboardAggregationSnapshot(snapshot),
  };
}
