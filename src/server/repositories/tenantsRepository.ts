import type { Db } from "mongodb";
import { COLLECTION_NAMES, type TenantDocument } from "@/src/server/db/documents";
import type { TenantsRepositoryContract } from "./contracts";

export class TenantsRepository implements TenantsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<TenantDocument>(COLLECTION_NAMES.tenants);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { tenantId: 1 }, unique: true, name: "tenant_id_unique" },
      { key: { slug: 1 }, unique: true, name: "tenant_slug_unique" },
      { key: { activeRuntimeConfigId: 1 }, name: "tenant_active_runtime_config" },
    ]);
  }

  async findBySlug(slug: string) {
    return this.collection().findOne({
      $or: [
        { slug },
        { subdomain: slug },
      ],
    });
  }

  async findByTenantId(tenantId: string) {
    return this.collection().findOne({ tenantId });
  }

  async upsertSeed(document: TenantDocument) {
    await this.collection().replaceOne({ tenantId: document.tenantId }, document, {
      upsert: true,
    });
  }
}
