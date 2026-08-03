import type { Db, Filter, ObjectId } from "mongodb";
import {
  COLLECTION_NAMES,
  type InvoiceDocument,
} from "@/src/server/db/documents";
import type {
  FindInvoicesResult,
  InvoicesRepositoryContract,
  ListInvoicesOptions,
} from "./contracts";

interface InvoiceRecord extends InvoiceDocument {
  _id?: ObjectId;
}

export class InvoicesRepository implements InvoicesRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<InvoiceRecord>(COLLECTION_NAMES.invoices);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { invoiceId: 1 }, unique: true, name: "invoice_id_unique" },
      { key: { invoiceNumber: 1 }, unique: true, name: "invoice_number_unique" },
      {
        key: { tenantId: 1, createdAt: -1 },
        name: "invoice_tenant_created",
      },
      {
        key: { tenantId: 1, status: 1 },
        name: "invoice_tenant_status",
      },
    ]);
  }

  async insert(invoice: InvoiceDocument): Promise<void> {
    await this.collection().insertOne(invoice as InvoiceRecord);
  }

  async findById(id: string): Promise<InvoiceDocument | null> {
    const record = await this.collection().findOne(
      { invoiceId: id },
      { projection: { _id: 0 } },
    );
    return record as InvoiceDocument | null;
  }

  async listByTenant(
    tenantId: string,
    options: ListInvoicesOptions = {},
  ): Promise<FindInvoicesResult> {
    return this.findAll({ ...options, tenantId });
  }

  async findAll(
    options: ListInvoicesOptions & { tenantId?: string } = {},
  ): Promise<FindInvoicesResult> {
    const { tenantId, status, skip = 0, limit = 100 } = options;
    const filter: Filter<InvoiceRecord> = {};

    if (tenantId) {
      filter.tenantId = tenantId;
    }

    if (status) {
      filter.status = status as InvoiceDocument["status"];
    }

    const projection = { projection: { _id: 0 } } as const;

    const [invoices, total] = await Promise.all([
      this.collection()
        .find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);

    return {
      invoices: invoices as unknown as InvoiceDocument[],
      total,
    };
  }

  async update(
    id: string,
    updates: Partial<InvoiceDocument>,
  ): Promise<InvoiceDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { invoiceId: id },
      { $set: updates },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );
    return record as InvoiceDocument | null;
  }

  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { tenantId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ];
    const results = await this.collection().aggregate(pipeline).toArray();
    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row._id as string] = row.count;
    }
    return counts;
  }
}
