import type { Db, Filter, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type ClinicUserDocument } from "@/src/server/db/documents";
import type {
  ClinicUsersRepositoryContract,
  FindClinicUsersOptions,
  FindClinicUsersResult,
} from "./contracts";

interface ClinicUserRecord extends ClinicUserDocument {
  _id?: ObjectId;
}

export class ClinicUsersRepository implements ClinicUsersRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ClinicUserRecord>(COLLECTION_NAMES.clinicUsers);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { clinicUserId: 1 }, unique: true, name: "clinic_user_id_unique" },
      { key: { email: 1 }, unique: true, name: "clinic_user_email_unique" },
      { key: { clinicIds: 1 }, name: "clinic_user_clinic_ids" },
      { key: { tenantIds: 1 }, name: "clinic_user_tenant_ids" },
    ]);
  }

  async insert(user: ClinicUserDocument): Promise<void> {
    await this.collection().insertOne(user as ClinicUserRecord);
  }

  async findByEmail(email: string): Promise<ClinicUserDocument | null> {
    const record = await this.collection().findOne(
      { email: email.trim().toLowerCase() },
      { projection: { _id: 0 } },
    );
    return record as ClinicUserDocument | null;
  }

  async findById(id: string): Promise<ClinicUserDocument | null> {
    const record = await this.collection().findOne(
      { clinicUserId: id },
      { projection: { _id: 0 } },
    );
    return record as ClinicUserDocument | null;
  }

  async update(
    id: string,
    updates: Partial<ClinicUserDocument>,
  ): Promise<ClinicUserDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { clinicUserId: id },
      { $set: updates },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );
    return record as ClinicUserDocument | null;
  }

  async list(
    options: FindClinicUsersOptions = {},
  ): Promise<FindClinicUsersResult> {
    const {
      tenantId,
      clinicId,
      status,
      search,
      skip = 0,
      limit = 50,
    } = options;
    const filter: Filter<ClinicUserRecord> = {};

    if (tenantId) {
      filter.tenantIds = tenantId;
    }

    if (clinicId) {
      filter.clinicIds = clinicId;
    }

    if (status) {
      filter.status = status as ClinicUserDocument["status"];
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { email: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    const projection = { projection: { _id: 0 } } as const;

    const [clinicUsers, total] = await Promise.all([
      this.collection()
        .find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);

    return {
      clinicUsers: clinicUsers as unknown as ClinicUserDocument[],
      total,
    };
  }
}
