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
      { key: { claimId: 1, createdAt: 1 }, name: "claim_request_claim_created" },
    ]);
  }

  async insert(request: ClaimRequestDocument): Promise<void> {
    await this.collection().insertOne(request as ClaimRequestRecord);
  }

  async listByClaimId(
    claimId: string,
    options: { limit?: number } = {},
  ): Promise<ClaimRequestDocument[]> {
    const { limit = 100 } = options;
    const records = await this.collection()
      .find({ claimId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    // Return chronological order for display
    return (records as ClaimRequestDocument[]).reverse();
  }

  async findById(requestId: string): Promise<ClaimRequestDocument | null> {
    const record = await this.collection().findOne(
      { requestId },
      { projection: { _id: 0 } },
    );
    return record as ClaimRequestDocument | null;
  }

  async update(
    requestId: string,
    updates: Partial<ClaimRequestDocument>,
  ): Promise<ClaimRequestDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { requestId },
      { $set: updates },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return record as ClaimRequestDocument | null;
  }
}
