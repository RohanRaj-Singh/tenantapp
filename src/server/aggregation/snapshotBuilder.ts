import { randomUUID } from "crypto";
import { createFilterHash } from "./filters";
import {
  calculateCategoryMetrics,
  calculateDemographicMetrics,
  calculateOverallMetrics,
  calculateSubdomainMetrics,
} from "./calculations";
import type { AggregationPipelineInput } from "./contracts";
import type { AggregationSnapshotDocument } from "@/src/server/db/documents";

export function generateAggregationSnapshot(
  input: AggregationPipelineInput,
): AggregationSnapshotDocument {
  const now = new Date().toISOString();
  const filters = input.scope.filters;
  const period = input.scope.period ?? {
    from: input.scope.runtimeConfig.publishedAt,
    to: now,
  };
  const overallMetrics = calculateOverallMetrics(input);
  const source = {
    completedSubmissionCount: overallMetrics.totalResponses,
    includedSubmissionCount: overallMetrics.totalResponses,
    excludedSubmissionCount: 0,
  };

  return {
    snapshotId: `agg_${randomUUID()}`,
    tenantId: input.scope.tenant.tenantId,
    tenantSlug: input.scope.tenant.slug,
    runtimeConfigId: input.scope.runtimeConfig.runtimeConfigId,
    scannerVersionId: input.scope.runtimeConfig.versionRefs.scannerVersionId,
    attributeTemplateVersionId:
      input.scope.runtimeConfig.versionRefs.attributeTemplateVersionId,
    calculationVersionId: input.scope.runtimeConfig.versionRefs.calculationVersionId,
    generatedAt: now,
    period,
    filters,
    filterHash: createFilterHash(filters),
    source,
    categoryMetrics: calculateCategoryMetrics(input),
    subdomainMetrics: calculateSubdomainMetrics(input),
    overallMetrics,
    demographicMetrics: calculateDemographicMetrics(input),
    anonymity: {
      minimumThreshold: 4,
      thresholdMet: source.includedSubmissionCount >= 4,
      rollUpApplied: false,
      removedFilters: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}
