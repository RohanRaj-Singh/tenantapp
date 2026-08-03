import type { Db, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type ClinicDirectoryDocument } from "@/src/server/db/documents";
import type { ClinicsRepositoryContract } from "./contracts";

interface ClinicRecord extends ClinicDirectoryDocument {
  _id?: ObjectId;
}

export class ClinicsRepository implements ClinicsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ClinicRecord>(COLLECTION_NAMES.clinics);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { clinicId: 1 }, unique: true, name: "clinic_id_unique" },
    ]);
  }

  async findById(clinicId: string): Promise<ClinicDirectoryDocument | null> {
    const record = await this.collection().findOne(
      { clinicId },
      { projection: { _id: 0 } },
    );
    return record as ClinicDirectoryDocument | null;
  }

  async upsert(document: ClinicDirectoryDocument): Promise<void> {
    await this.collection().replaceOne(
      { clinicId: document.clinicId },
      document,
      { upsert: true },
    );
  }
}
