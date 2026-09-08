import type { Db, Filter, ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import { COLLECTION_NAMES, type ReimbursementDocument } from "@/src/server/db/documents";
import type {
  ReimbursementsRepositoryContract,
  FindReimbursementsOptions,
  FindReimbursementsResult,
} from "./contracts";

interface ReimbursementRecord extends ReimbursementDocument {
  _id?: ObjectId;
}

export class ReimbursementsRepository implements ReimbursementsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ReimbursementRecord>(COLLECTION_NAMES.reimbursements);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { reimbursementId: 1 }, unique: true, name: "reimbursement_id_unique" },
      { key: { tenantId: 1 }, name: "reimbursement_tenant_id" },
      { key: { tenantId: 1, employeeId: 1 }, name: "reimbursement_tenant_employee" },
      { key: { tenantId: 1, status: 1 }, name: "reimbursement_tenant_status" },
      { key: { tenantId: 1, createdAt: -1 }, name: "reimbursement_tenant_created" },
    ]);
  }

  async findByTenantId(
    tenantId: string,
    options: FindReimbursementsOptions = {},
  ): Promise<FindReimbursementsResult> {
    return this.findAll({ ...options, tenantId });
  }

  async findAll(
    options: FindReimbursementsOptions = {},
  ): Promise<FindReimbursementsResult> {
    const { search, status, employeeId, tenantId, tenantIds, clinicId, clinicIds, skip = 0, limit = 200, sortBy = "createdAt", sortOrder = "desc" } = options;
    const filter: Filter<ReimbursementRecord> = {};

    // Multi-tenant fan-in (Phase H clinic portal). When `tenantIds` is
    // supplied it takes precedence over a single `tenantId`. Combined with
    // `clinicIds` this replaces the N×M fan-out in `listClinicReimbursements`.
    if (tenantIds && tenantIds.length > 0) {
      filter.tenantId = { $in: tenantIds } as unknown as ReimbursementDocument["tenantId"];
    } else if (tenantId) {
      filter.tenantId = tenantId;
    }

    if (status) {
      filter.status = status as ReimbursementDocument["status"];
    }

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    // Multi-clinic fan-in. Only effective when combined with a tenant
    // scope (multi-tenant or single-tenant); without a tenant scope the
    // caller must be operating inside a tenant filter to keep authorization
    // intact.
    if (clinicIds && clinicIds.length > 0) {
      filter.clinicId = { $in: clinicIds } as unknown as ReimbursementDocument["clinicId"];
    } else if (clinicId) {
      filter.clinicId = clinicId;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { claimNumber: { $regex: regex } },
        { description: { $regex: regex } },
        { employeeName: { $regex: regex } },
        { type: { $regex: regex } },
      ];
    }

    const projection = { projection: { _id: 0 } } as const;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [reimbursements, total] = await Promise.all([
      this.collection()
        .find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);

    return {
      reimbursements: reimbursements as unknown as ReimbursementDocument[],
      total,
    };
  }

  async findById(id: string): Promise<ReimbursementDocument | null> {
    const record = await this.collection().findOne(
      { reimbursementId: id },
      { projection: { _id: 0 } },
    );
    return record as ReimbursementDocument | null;
  }

  async findByIds(ids: string[]): Promise<ReimbursementDocument[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.collection()
      .find(
        { reimbursementId: { $in: ids } },
        { projection: { _id: 0 } },
      )
      .toArray();
    return records as unknown as ReimbursementDocument[];
  }

  async insert(reimbursement: ReimbursementDocument): Promise<void> {
    await this.collection().insertOne(reimbursement as ReimbursementRecord);
  }

  async update(
    id: string,
    updates: Partial<ReimbursementDocument>,
  ): Promise<ReimbursementDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { reimbursementId: id },
      { $set: updates },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );
    return record as ReimbursementDocument | null;
  }

  async incrementCounter(counterId: string): Promise<number> {
    const result = await this.db.collection(COLLECTION_NAMES.counters).findOneAndUpdate(
      { _id: counterId as any },
      { $inc: { value: 1 } },
      { returnDocument: "after", upsert: true },
    );
    return (result?.value as number) ?? 1;
  }

  async aggregateByStatus(tenantId: string): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { tenantId } },
      { $group: { _id: "$status", total: { $sum: "$amount" } } },
    ];
    const results = await this.collection().aggregate(pipeline).toArray();
    const totals: Record<string, number> = {};
    for (const row of results) {
      totals[row._id as string] = row.total;
    }
    return totals;
  }
}
