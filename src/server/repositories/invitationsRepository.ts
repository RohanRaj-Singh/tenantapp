import type { Db, Filter, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type InvitationDocument } from "@/src/server/db/documents";
import type {
  FindInvitationsOptions,
  FindInvitationsResult,
  InvitationsRepositoryContract,
} from "./contracts";

interface InvitationRecord extends InvitationDocument {
  _id?: ObjectId;
}

export class InvitationsRepository implements InvitationsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<InvitationRecord>(COLLECTION_NAMES.invitations);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { invitationId: 1 }, unique: true, name: "invitation_id_unique" },
      { key: { token: 1 }, unique: true, sparse: true, name: "invitation_token_unique" },
      { key: { tenantId: 1 }, name: "invitation_tenant_id" },
      { key: { campaignId: 1 }, name: "invitation_campaign_id" },
      { key: { tenantId: 1, status: 1 }, name: "invitation_tenant_status" },
      { key: { tenantId: 1, employeeId: 1 }, name: "invitation_tenant_employee" },
    ]);
  }

  async findByTenantId(
    tenantId: string,
    options: FindInvitationsOptions = {},
  ): Promise<FindInvitationsResult> {
    return this.find({ tenantId, ...options });
  }

  async findByCampaignId(
    campaignId: string,
    options: FindInvitationsOptions = {},
  ): Promise<FindInvitationsResult> {
    return this.find({ campaignId, ...options });
  }

  async findById(id: string): Promise<InvitationDocument | null> {
    const record = await this.collection().findOne(
      { invitationId: id },
      { projection: { _id: 0 } },
    );
    return record as InvitationDocument | null;
  }

  async findByToken(token: string): Promise<InvitationDocument | null> {
    const record = await this.collection().findOne(
      { token },
      { projection: { _id: 0 } },
    );
    return record as InvitationDocument | null;
  }

  async insert(invitation: InvitationDocument): Promise<void> {
    await this.collection().insertOne(invitation as InvitationRecord);
  }

  async insertMany(invitations: InvitationDocument[]): Promise<void> {
    if (invitations.length === 0) return;
    await this.collection().insertMany(invitations as InvitationRecord[]);
  }

  async update(
    id: string,
    updates: Partial<InvitationDocument>,
  ): Promise<InvitationDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { invitationId: id },
      { $set: updates },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return record as InvitationDocument | null;
  }

  async updateMany(
    filter: { campaignId?: string; status?: string },
    updates: Partial<InvitationDocument>,
  ): Promise<number> {
    const result = await this.collection().updateMany(
      filter as Filter<InvitationRecord>,
      { $set: updates },
    );
    return result.modifiedCount;
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

  private async find(
    options: FindInvitationsOptions & { tenantId?: string; campaignId?: string },
  ): Promise<FindInvitationsResult> {
    const { tenantId, campaignId, status, search, employeeId, skip = 0, limit = 50 } = options;
    const filter: Filter<InvitationRecord> = {};

    if (tenantId) filter.tenantId = tenantId;
    if (campaignId) filter.campaignId = campaignId;
    if (status) filter.status = status as InvitationDocument["status"];
    if (employeeId) filter.employeeId = employeeId;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: new RegExp(escaped, "i") };
      filter.$or = [
        { email: regex },
        { employeeCode: regex },
      ];
    }

    const [records, total] = await Promise.all([
      this.collection()
        .find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);

    return { invitations: records as InvitationDocument[], total };
  }
}
