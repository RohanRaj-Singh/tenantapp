import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";

interface BudgetOverview {
  totalAmount: number;
  committedAmount: number;
  paidAmount: number;
  availableAmount: number;
}

export async function getBudgetOverview(tenantId: string): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();

  const [allClaims, budgetDoc] = await Promise.all([
    repositories.reimbursements.findByTenantId(tenantId, { limit: 10000 }),
    repositories.budgets.findByTenantId(tenantId),
  ]);

  const totalAmount = budgetDoc?.totalAmount ?? 0;
  const committedAmount = allClaims.reimbursements
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = allClaims.reimbursements
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    totalAmount,
    committedAmount,
    paidAmount,
    availableAmount: Math.max(0, totalAmount - committedAmount - paidAmount),
  };
}

export async function setBudget(
  tenantId: string,
  totalAmount: number,
  createdBy: string,
): Promise<{ totalAmount: number }> {
  const repositories = await getRepositoryContext();
  const now = new Date().toISOString();

  const existing = await repositories.budgets.findByTenantId(tenantId);

  if (existing) {
    await repositories.budgets.update(existing.budgetId, { totalAmount, updatedAt: now });
  } else {
    await repositories.budgets.insert({
      budgetId: `budget_${randomUUID()}`,
      tenantId,
      totalAmount,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { totalAmount };
}

export async function topUpBudget(
  tenantId: string,
  additionalAmount: number,
  createdBy: string,
): Promise<BudgetOverview> {
  const current = await getBudgetOverview(tenantId);
  const newTotal = current.totalAmount + additionalAmount;
  await setBudget(tenantId, newTotal, createdBy);
  return getBudgetOverview(tenantId);
}
