import type { Db, Filter, ObjectId } from "mongodb";
import {
  COLLECTION_NAMES,
  type PaymentRecordDocument,
} from "@/src/server/db/documents";
import type { PaymentRecordsRepositoryContract } from "./contracts";

const PAYMENT_COUNTER_ID = "paymentReference";

interface PaymentRecordDoc extends PaymentRecordDocument {
  _id?: ObjectId;
}

export class PaymentRecordsRepository implements PaymentRecordsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<PaymentRecordDoc>(COLLECTION_NAMES.paymentRecords);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      {
        key: { paymentRecordId: 1 },
        unique: true,
        name: "payment_record_id_unique",
      },
      {
        key: { claimId: 1 },
        unique: true,
        name: "payment_record_claim_unique",
      },
      {
        key: { tenantId: 1, status: 1 },
        name: "payment_record_tenant_status",
      },
      {
        key: { status: 1, createdAt: 1 },
        name: "payment_record_status_created",
      },
    ]);
  }

  async insert(record: PaymentRecordDocument): Promise<void> {
    await this.collection().insertOne(record as PaymentRecordDoc);
  }

  async update(
    id: string,
    updates: Partial<PaymentRecordDocument>,
  ): Promise<PaymentRecordDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { paymentRecordId: id },
      { $set: updates },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );
    return record as PaymentRecordDocument | null;
  }

  async findByClaimId(claimId: string): Promise<PaymentRecordDocument | null> {
    const record = await this.collection().findOne(
      { claimId },
      { projection: { _id: 0 } },
    );
    return record as PaymentRecordDocument | null;
  }

  async listByTenant(tenantId: string): Promise<PaymentRecordDocument[]> {
    const records = await this.collection()
      .find({ tenantId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return records as unknown as PaymentRecordDocument[];
  }

  async listByStatus(status: PaymentRecordDocument["status"]): Promise<PaymentRecordDocument[]> {
    const filter: Filter<PaymentRecordDoc> = { status };
    const records = await this.collection()
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return records as unknown as PaymentRecordDocument[];
  }

  /**
   * Atomically increment the payment-reference counter.
   * Uses the shared `counters` collection (same pattern as claim numbers).
   */
  async incrementCounter(counterId: string): Promise<number> {
    const result = await this.db.collection(COLLECTION_NAMES.counters).findOneAndUpdate(
      { _id: counterId as any },
      { $inc: { value: 1 } },
      { returnDocument: "after", upsert: true },
    );
    return (result?.value as number) ?? 1;
  }
}

/** Counter id used for `PAY-YYYY-NNNNNN` references. */
export { PAYMENT_COUNTER_ID };
