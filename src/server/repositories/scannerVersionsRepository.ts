import type { Db } from "mongodb";
import {
  COLLECTION_NAMES,
  type ScannerVersionDocument,
} from "@/src/server/db/documents";
import type { ScannerVersionsRepositoryContract } from "./contracts";

export class ScannerVersionsRepository implements ScannerVersionsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ScannerVersionDocument>(COLLECTION_NAMES.scannerVersions);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { scannerVersionId: 1 }, unique: true, name: "scanner_version_id_unique" },
      { key: { tenantId: 1, version: 1 }, unique: true, name: "scanner_version_tenant_version_unique" },
      { key: { tenantId: 1, publishedAt: -1 }, name: "scanner_version_tenant_published" },
    ]);
  }

  async findByScannerVersionId(scannerVersionId: string) {
    return this.collection().findOne({ scannerVersionId });
  }

  async upsertSeed(document: ScannerVersionDocument) {
    await this.collection().replaceOne(
      { scannerVersionId: document.scannerVersionId },
      document,
      { upsert: true },
    );
  }
}
