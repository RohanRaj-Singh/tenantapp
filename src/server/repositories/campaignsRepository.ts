import type { Db, Filter, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type CampaignDocument } from "@/src/server/db/documents";
import type {
  CampaignsRepositoryContract,
  FindCampaignsOptions,
  FindCampaignsResult,
} from "./contracts";

interface CampaignRecord extends CampaignDocument {
  _id?: ObjectId;
}

export class CampaignsRepository implements CampaignsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<CampaignRecord>(COLLECTION_NAMES.campaigns);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { campaignId: 1 }, unique: true, name: "campaign_id_unique" },
      { key: { tenantId: 1 }, name: "campaign_tenant_id" },
      { key: { tenantId: 1, status: 1 }, name: "campaign_tenant_status" },
      { key: { tenantId: 1, createdAt: -1 }, name: "campaign_tenant_created" },
    ]);
  }

  async findByTenantId(
    tenantId: string,
    options: FindCampaignsOptions = {},
  ): Promise<FindCampaignsResult> {
    const { status, search, skip = 0, limit = 20 } = options;
    const filter: Filter<CampaignRecord> = { tenantId };

    if (status) {
      filter.status = status as CampaignDocument["status"];
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: new RegExp(escaped, "i") };
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

    return { campaigns: records as CampaignDocument[], total };
  }

  async findById(id: string): Promise<CampaignDocument | null> {
    const record = await this.collection().findOne(
      { campaignId: id },
      { projection: { _id: 0 } },
    );
    return record as CampaignDocument | null;
  }

  async insert(campaign: CampaignDocument): Promise<void> {
    await this.collection().insertOne(campaign as CampaignRecord);
  }

  async update(
    id: string,
    updates: Partial<CampaignDocument>,
  ): Promise<CampaignDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { campaignId: id },
      { $set: updates },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return record as CampaignDocument | null;
  }
}
