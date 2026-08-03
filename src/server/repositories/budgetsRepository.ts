import type { Db, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type BudgetDocument } from "@/src/server/db/documents";
import type { BudgetsRepositoryContract } from "./contracts";

interface BudgetRecord extends BudgetDocument {
  _id?: ObjectId;
}

export class BudgetsRepository implements BudgetsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<BudgetRecord>(COLLECTION_NAMES.budgets);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { budgetId: 1 }, unique: true, name: "budget_id_unique" },
      { key: { tenantId: 1, year: 1 }, unique: true, name: "budget_tenant_year_unique" },
    ]);
  }

  async findByTenantId(tenantId: string): Promise<BudgetDocument | null> {
    const record = await this.collection().findOne(
      { tenantId },
      { projection: { _id: 0 } },
    );
    return record as BudgetDocument | null;
  }

  async findByTenantAndYear(
    tenantId: string,
    year: number,
  ): Promise<BudgetDocument | null> {
    const record = await this.collection().findOne(
      { tenantId, year },
      { projection: { _id: 0 } },
    );
    return record as BudgetDocument | null;
  }

  async insert(budget: BudgetDocument): Promise<void> {
    await this.collection().insertOne(budget as BudgetRecord);
  }

  async update(
    id: string,
    updates: Partial<BudgetDocument>,
  ): Promise<BudgetDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { budgetId: id },
      { $set: updates },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return record as BudgetDocument | null;
  }
}
