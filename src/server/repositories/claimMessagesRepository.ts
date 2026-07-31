import type { Db, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type ClaimMessageDocument } from "@/src/server/db/documents";
import type { ClaimMessagesRepositoryContract } from "./contracts";

interface ClaimMessageRecord extends ClaimMessageDocument {
  _id?: ObjectId;
}

export class ClaimMessagesRepository implements ClaimMessagesRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<ClaimMessageRecord>(COLLECTION_NAMES.claimMessages);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { messageId: 1 }, unique: true, name: "claim_message_id_unique" },
      { key: { claimId: 1, createdAt: 1 }, name: "claim_message_claim_created" },
      { key: { claimId: 1, "participant.key": 1 }, name: "claim_message_claim_author" },
    ]);
  }

  async insert(message: ClaimMessageDocument): Promise<void> {
    await this.collection().insertOne(message as ClaimMessageRecord);
  }

  async listByClaimId(
    claimId: string,
    options: { limit?: number } = {},
  ): Promise<ClaimMessageDocument[]> {
    const { limit = 200 } = options;
    const records = await this.collection()
      .find({ claimId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    // Return chronological order for display
    return (records as ClaimMessageDocument[]).reverse();
  }

  async unreadCount(claimId: string, viewerKey: string): Promise<number> {
    return this.collection().countDocuments({
      claimId,
      "participant.key": { $ne: viewerKey },
      readBy: { $ne: viewerKey },
    });
  }

  async markThreadRead(claimId: string, viewerKey: string): Promise<number> {
    const result = await this.collection().updateMany(
      { claimId, "participant.key": { $ne: viewerKey }, readBy: { $ne: viewerKey } },
      { $addToSet: { readBy: viewerKey } },
    );
    return result.modifiedCount;
  }
}
