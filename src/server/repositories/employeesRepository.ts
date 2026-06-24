import type { Db, Filter, ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import { COLLECTION_NAMES, type AuditEventDocument, type EmployeeDocument } from "@/src/server/db/documents";
import type {
  EmployeesRepositoryContract,
  FindEmployeesOptions,
  FindEmployeesResult,
} from "./contracts";

interface EmployeeRecord extends EmployeeDocument {
  _id?: ObjectId;
}

function mapRecord(record: EmployeeRecord | null): EmployeeDocument | null {
  if (!record) return null;
  const { _id: _mongoId, ...employee } = record;
  return employee;
}

export class EmployeesRepository implements EmployeesRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<EmployeeRecord>(COLLECTION_NAMES.employees);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { employeeId: 1 }, unique: true, name: "employee_id_unique" },
      { key: { tenantId: 1 }, name: "employee_tenant_id" },
      { key: { tenantId: 1, employeeCode: 1 }, unique: true, name: "employee_tenant_code_unique" },
      { key: { tenantId: 1, name: 1 }, name: "employee_tenant_name" },
    ]);
  }

  async findByTenantId(
    tenantId: string,
    options: FindEmployeesOptions = {},
  ): Promise<FindEmployeesResult> {
    const { search, status, skip = 0, limit = 20 } = options;
    const filter: Filter<EmployeeRecord> = { tenantId };

    if (status) {
      filter.status = status as "active" | "inactive";
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { employeeCode: { $regex: regex } },
      ];
    }

    const projection = { projection: { _id: 0 } } as const;

    const [records, total] = await Promise.all([
      this.collection()
        .find(filter, projection)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);

    return {
      employees: records as unknown as EmployeeDocument[],
      total,
    };
  }

  async findById(id: string): Promise<EmployeeDocument | null> {
    const record = await this.collection().findOne(
      { employeeId: id },
      { projection: { _id: 0 } },
    );
    return record as EmployeeDocument | null;
  }

  async findByEmployeeCode(
    tenantId: string,
    employeeCode: string,
  ): Promise<EmployeeDocument | null> {
    const record = await this.collection().findOne(
      { tenantId, employeeCode },
      { projection: { _id: 0 } },
    );
    return record as EmployeeDocument | null;
  }

  async insert(employee: EmployeeDocument): Promise<void> {
    await this.collection().insertOne(employee as EmployeeRecord);
  }

  async update(
    id: string,
    updates: Partial<EmployeeDocument>,
  ): Promise<EmployeeDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { employeeId: id },
      { $set: updates },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );
    return record as EmployeeDocument | null;
  }

  async insertAuditEvent(event: AuditEventDocument): Promise<void> {
    await this.db
      .collection<AuditEventDocument>(COLLECTION_NAMES.auditEvents)
      .insertOne(event);
  }
}
