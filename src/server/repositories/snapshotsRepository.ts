import type { Db, Filter } from "mongodb";
import {
  COLLECTION_NAMES,
  type AggregationSnapshotDocument,
} from "@/src/server/db/documents";
import type { SnapshotScopeQuery, SnapshotsRepositoryContract } from "./contracts";

export class SnapshotsRepository implements SnapshotsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<AggregationSnapshotDocument>(
      COLLECTION_NAMES.aggregationSnapshots,
    );
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { snapshotId: 1 }, unique: true, name: "aggregation_snapshot_id_unique" },
      {
        key: {
          tenantId: 1,
          runtimeConfigId: 1,
          calculationVersionId: 1,
          "period.from": 1,
          "period.to": 1,
          filterHash: 1,
          generatedAt: -1,
        },
        name: "aggregation_snapshot_scope_generated",
      },
      { key: { tenantId: 1, generatedAt: -1 }, name: "aggregation_snapshot_tenant_generated" },
      {
        key: { tenantId: 1, scannerVersionId: 1, calculationVersionId: 1, generatedAt: -1 },
        name: "aggregation_snapshot_version_generated",
      },
      { key: { tenantId: 1, filterHash: 1, generatedAt: -1 }, name: "aggregation_snapshot_filter_hash" },
    ]);
  }

  async insert(document: AggregationSnapshotDocument) {
    await this.collection().insertOne(document);
  }

  async findLatestByScope(scope: SnapshotScopeQuery) {
    const filter: Filter<AggregationSnapshotDocument> = {
      tenantId: scope.tenantId,
      runtimeConfigId: scope.runtimeConfigId,
      scannerVersionId: scope.scannerVersionId,
      calculationVersionId: scope.calculationVersionId,
      filterHash: scope.filterHash,
    };

    if (scope.period) {
      filter["period.from"] = scope.period.from;
      filter["period.to"] = scope.period.to;
    }

    return this.collection().findOne(filter, { sort: { generatedAt: -1 } });
  }
}
