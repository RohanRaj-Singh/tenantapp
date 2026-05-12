import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import { normalizeDashboardFilters } from "@/src/server/aggregation/filters";
import { generateAggregationSnapshot } from "@/src/server/aggregation/snapshotBuilder";
import type { RuntimeConfigDocument, TenantDocument } from "@/src/server/db/documents";
import type { RepositoryContext } from "@/src/server/repositories/contracts";

interface AggregationGenerationInput {
  repositories: RepositoryContext;
  tenant: TenantDocument;
  runtimeConfig: RuntimeConfigDocument;
  filters?: Partial<DashboardSnapshotFilters>;
  period?: {
    from: string;
    to: string;
  };
}

export async function generateAndStoreAggregationSnapshot(
  input: AggregationGenerationInput,
) {
  const filters = normalizeDashboardFilters(input.filters ?? {});
  const rawResponses = await input.repositories.responses.listForAggregation({
    tenantId: input.tenant.tenantId,
    runtimeConfig: input.runtimeConfig,
    period: input.period,
    filters,
  });
  const snapshot = generateAggregationSnapshot({
    rawResponses,
    scope: {
      tenant: input.tenant,
      runtimeConfig: input.runtimeConfig,
      filters,
      period: input.period,
    },
  });

  await input.repositories.snapshots.insert(snapshot);

  return snapshot;
}
