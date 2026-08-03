import { randomUUID } from "crypto";
import type {
  BudgetHistoryDocument,
  BudgetHistoryType,
} from "@/src/server/db/documents";
import type { ListBudgetHistoryOptions } from "@/src/server/repositories/contracts";
import { getRepositoryContext } from "@/src/server/repositories/context";

export interface RecordBudgetHistoryInput {
  tenantId: string;
  year: number;
  type: BudgetHistoryType;
  amount: number;
  beforeTotal: number;
  afterTotal: number;
  reason?: string;
  actorId: string;
  actorRole: string;
}

export async function recordBudgetHistory(
  input: RecordBudgetHistoryInput,
): Promise<void> {
  const repositories = await getRepositoryContext();

  const entry: BudgetHistoryDocument = {
    historyId: `history_${randomUUID()}`,
    tenantId: input.tenantId,
    year: input.year,
    type: input.type,
    amount: input.amount,
    beforeTotal: input.beforeTotal,
    afterTotal: input.afterTotal,
    actorId: input.actorId,
    actorRole: input.actorRole,
    createdAt: new Date().toISOString(),
  };

  if (input.reason) {
    entry.reason = input.reason;
  }

  await repositories.budgetHistory.insert(entry);
}

export async function listBudgetHistory(
  tenantId: string,
  options: ListBudgetHistoryOptions = {},
): Promise<BudgetHistoryDocument[]> {
  const repositories = await getRepositoryContext();
  return repositories.budgetHistory.listByTenant(tenantId, options);
}
