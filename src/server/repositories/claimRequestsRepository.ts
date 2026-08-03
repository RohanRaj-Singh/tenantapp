import type { Db, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type ClaimRequestDocument } from "@/src/server/db/documents";
import type { ClaimRequestsRepositoryContract } from "./contracts";

interface ClaimRequestRecord extends ClaimRequestDocument {
  _id?: ObjectId;
}

export class ClaimRequestsRepository implements ClaimRequestsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ClaimRequestRecord>(COLLECTION_NAMES.claimRequests);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { requestId: 1 }, unique: true, name: "claim_request_id_unique" },
      { key: { claimId: 1, createdAt: -1 }, name: "claim_request_claim_created" },
      { key: { tenantId: 1, claimId: 1, status: 1 }, name: "claim_request_tenant_claim_status" },
    ]);
  }

  async insert(request: ClaimRequestDocument): Promise<void> {
    await this.collection().insertOne(request as ClaimRequestRecord);
  }

  async findById(requestId: string): Promise<ClaimRequestDocument | null> {
    const record = await this.collection().findOne(
      { requestId },
      { projection: { _id: 0 } },
    );
    return (record as ClaimRequestDocument) ?? null;
  }

  async listByClaimId(claimId: string): Promise<ClaimRequestDocument[]> {
    const records = await this.collection()
      .find({ claimId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    // Return chronological order for display
    return (records as ClaimRequestDocument[]).reverse();
  }

  async update(
    requestId: string,
    updates: Partial<ClaimRequestDocument>,
  ): Promise<ClaimRequestDocument | null> {
    const now = new Date().toISOString();
    const updateDoc = {
      ...updates,
      updatedAt: now,
    };
    const result = await this.collection().findOneAndUpdate(
      { requestId },
      { $set: updateDoc },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return (result as ClaimRequestDocument) ?? null;
  }
}