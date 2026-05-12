import type { Db, Filter } from "mongodb";
import {
  COLLECTION_NAMES,
  type RuntimeConfigDocument,
} from "@/src/server/db/documents";
import type { RuntimeConfigsRepositoryContract } from "./contracts";

export class RuntimeConfigsRepository implements RuntimeConfigsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<RuntimeConfigDocument>(COLLECTION_NAMES.runtimeConfigs);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { runtimeConfigId: 1 }, unique: true, name: "runtime_config_id_unique" },
      {
        key: { tenantSlug: 1 },
        unique: true,
        name: "runtime_config_active_tenant_slug_unique",
        partialFilterExpression: { isActive: true },
      },
      { key: { tenantId: 1, publishedAt: -1 }, name: "runtime_config_tenant_published" },
      {
        key: {
          tenantId: 1,
          "versionRefs.scannerVersionId": 1,
          "versionRefs.attributeTemplateVersionId": 1,
        },
        name: "runtime_config_version_tuple",
      },
    ]);
  }

  async findActiveByTenantSlug(tenantSlug: string) {
    return this.collection().findOne({ tenantSlug, isActive: true });
  }

  async findActiveByTenantId(tenantId: string) {
    return this.collection().findOne({ tenantId, isActive: true });
  }

  async findByRuntimeConfigId(runtimeConfigId: string) {
    return this.collection().findOne({ runtimeConfigId });
  }

  async findMany(filter: Filter<RuntimeConfigDocument>) {
    return this.collection().find(filter).sort({ publishedAt: -1 }).toArray();
  }

  async upsertSeed(document: RuntimeConfigDocument) {
    await this.collection().replaceOne({ runtimeConfigId: document.runtimeConfigId }, document, {
      upsert: true,
    });
  }
}
