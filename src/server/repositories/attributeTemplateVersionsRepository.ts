import type { Db } from "mongodb";
import {
  COLLECTION_NAMES,
  type AttributeTemplateVersionDocument,
} from "@/src/server/db/documents";
import type { AttributeTemplateVersionsRepositoryContract } from "./contracts";

export class AttributeTemplateVersionsRepository
  implements AttributeTemplateVersionsRepositoryContract
{
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<AttributeTemplateVersionDocument>(
      COLLECTION_NAMES.attributeTemplateVersions,
    );
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      {
        key: { attributeTemplateVersionId: 1 },
        unique: true,
        name: "attribute_template_version_id_unique",
      },
      {
        key: { tenantId: 1, version: 1 },
        unique: true,
        name: "attribute_template_tenant_version_unique",
      },
      { key: { tenantId: 1, publishedAt: -1 }, name: "attribute_template_tenant_published" },
    ]);
  }

  async findByAttributeTemplateVersionId(attributeTemplateVersionId: string) {
    return this.collection().findOne({ attributeTemplateVersionId });
  }

  async upsertSeed(document: AttributeTemplateVersionDocument) {
    await this.collection().replaceOne(
      { attributeTemplateVersionId: document.attributeTemplateVersionId },
      document,
      { upsert: true },
    );
  }
}
