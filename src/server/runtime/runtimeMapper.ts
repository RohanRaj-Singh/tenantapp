import type { DashboardAggregationSnapshot } from "@/runtime/contracts/aggregation";
import type { TenantRuntimeConfig } from "@/runtime/contracts/runtime";
import type {
  AggregationSnapshotDocument,
  RuntimeConfigDocument,
  TenantDocument,
} from "@/src/server/db/documents";

export function toTenantRuntimeConfig(
  tenant: TenantDocument,
  runtimeConfig: RuntimeConfigDocument,
): TenantRuntimeConfig {
  return {
    runtimeConfigId: runtimeConfig.runtimeConfigId,
    publishedAt: runtimeConfig.publishedAt,
    versionRefs: runtimeConfig.versionRefs,
    tenant: {
      id: tenant.tenantId,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      createdAt: tenant.createdAt,
    },
    branding: runtimeConfig.branding,
    attributeTemplate: runtimeConfig.attributeTemplate,
    scannerVersion: runtimeConfig.scannerVersion,
    runtimeSettings: runtimeConfig.runtimeSettings,
  };
}

export function toDashboardAggregationSnapshot(
  snapshot: AggregationSnapshotDocument,
): DashboardAggregationSnapshot {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...publicSnapshot } = snapshot;
  return publicSnapshot;
}
