import type { Db, ObjectId } from "mongodb";
import {
  COLLECTION_NAMES,
  type BudgetHistoryDocument,
} from "@/src/server/db/documents";
import type {
  BudgetHistoryRepositoryContract,
  ListBudgetHistoryOptions,
} from "./contracts";

interface BudgetHistoryRecord extends BudgetHistoryDocument {
  _id?: ObjectId;
}

export class BudgetHistoryRepository implements BudgetHistoryRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<BudgetHistoryRecord>(COLLECTION_NAMES.budgetHistory);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { historyId: 1 }, unique: true, name: "budget_history_id_unique" },
      {
        key: { tenantId: 1, year: 1, createdAt: -1 },
        name: "budget_history_tenant_year_created",
      },
    ]);
  }

  async insert(history: BudgetHistoryDocument): Promise<void> {
    await this.collection().insertOne(history as BudgetHistoryRecord);
  }

  async listByTenant(
    tenantId: string,
    options: ListBudgetHistoryOptions = {},
  ): Promise<BudgetHistoryDocument[]> {
    const { type, skip = 0, limit = 50 } = options;
    const filter: Record<string, unknown> = { tenantId };
    if (type) {
      filter.type = type;
    }

    return this.collection()
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray() as Promise<BudgetHistoryDocument[]>;
  }
}
