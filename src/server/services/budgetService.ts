import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";

interface BudgetOverview {
  totalAmount: number;
  committedAmount: number;
  paidAmount: number;
  availableAmount: number;
}

/**
 * Get budget overview for a tenant.
 *
 * totalAmount = stored budget total (or 0 if not set)
 * committedAmount = sum of all APPROVED claims (awaiting payment)
 * paidAmount = sum of all PAID claims
 * availableAmount = totalAmount - (committedAmount + paidAmount)
 */
export async function getBudgetOverview(tenantId: string): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();

  const [allClaims, budgetDoc] = await Promise.all([
    repositories.reimbursements.findByTenantId(tenantId, { limit: 10000 }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (repositories as any).budgets?.findByTenantId
      ? (repositories as any).budgets.findByTenantId(tenantId)
      : null,
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

/**
 * Set or update the total budget for a tenant.
 */
export async function setBudget(
  tenantId: string,
  totalAmount: number,
  createdBy: string,
): Promise<{ totalAmount: number }> {
  const repositories = await getRepositoryContext();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgets = (repositories as any).budgets;
  if (!budgets) {
    // Fallback: budget collection not wired yet — skip
    return { totalAmount };
  }

  const existing = await budgets.findByTenantId(tenantId);

  if (existing) {
    await budgets.update(existing.budgetId, { totalAmount, updatedAt: now });
  } else {
    await budgets.insert({
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

/**
 * Add funds to an existing budget (Top Up).
 */
export async function topUpBudget(
  tenantId: string,
  additionalAmount: number,
  createdBy: string,
): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgets = (repositories as any).budgets;
  if (!budgets) {
    return { totalAmount: 0, committedAmount: 0, paidAmount: 0, availableAmount: 0 };
  }

  const existing = await budgets.findByTenantId(tenantId);
  const currentTotal = existing?.totalAmount ?? 0;

  await setBudget(tenantId, currentTotal + additionalAmount, createdBy);

  return getBudgetOverview(tenantId);
}
