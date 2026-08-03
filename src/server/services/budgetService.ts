import { randomUUID } from "crypto";
import type { BudgetDocument } from "@/src/server/db/documents";
import { ApiError } from "@/src/server/api/errors";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { recordBudgetHistory } from "@/src/server/services/budgetHistoryService";

export interface BudgetOverview {
  year: number;
  totalAmount: number;
  reservedAmount: number;
  committedAmount: number;
  paidAmount: number;
  availableAmount: number;
  /** True when reserved + committed exceeds the annual budget (soft warning only). */
  budgetExceeded: boolean;
}

function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Resolves the annual budget for a tenant + year.
 *
 * Backward-compat: legacy budgets in the DB have no `year` field. Such records
 * are treated as the budget for the current year so the overview and mutations
 * keep working without a data migration.
 */
async function resolveBudget(
  tenantId: string,
  year: number,
): Promise<BudgetDocument | null> {
  const repositories = await getRepositoryContext();

  const budget = await repositories.budgets.findByTenantAndYear(tenantId, year);
  if (budget) {
    return budget;
  }

  if (year === currentYear()) {
    const legacy = await repositories.budgets.findByTenantId(tenantId);
    if (legacy && typeof legacy.year !== "number") {
      return legacy;
    }
  }

  return null;
}

export async function getBudgetOverview(
  tenantId: string,
  year?: number,
): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();
  const targetYear = year ?? currentYear();

  const [totalsByStatus, budgetDoc] = await Promise.all([
    repositories.reimbursements.aggregateByStatus(tenantId),
    resolveBudget(tenantId, targetYear),
  ]);

  const totalAmount = budgetDoc?.totalAmount ?? 0;
  // Pending + in-progress claims temporarily reserve budget (Phase 2). The
  // reservation is released when a claim leaves those statuses — rejected,
  // frozen, approved, and paid claims are not reserved.
  const reservedAmount =
    (totalsByStatus.pending ?? 0) + (totalsByStatus.in_progress ?? 0);
  // Approved claims permanently move to Committed (Phase 3). Paid is a payment
  // event, not a separate budget calculation — once approved a claim stays
  // committed, so paid amounts live inside committed and never free Available.
  // `to_be_paid` claims are treated like approved and join committed too when
  // that status is introduced (Phase 5).
  const committedAmount =
    (totalsByStatus.approved ?? 0) +
    (totalsByStatus.paid ?? 0) +
    (totalsByStatus.to_be_paid ?? 0);
  const paidAmount = totalsByStatus.paid ?? 0;
  const availableAmount = Math.max(
    0,
    totalAmount - reservedAmount - committedAmount,
  );
  // Soft warning flag: approvals are never blocked on an exceeded budget, the
  // UI just surfaces this so the reviewer can contact the administrator.
  const budgetExceeded = reservedAmount + committedAmount > totalAmount;

  return {
    year: targetYear,
    totalAmount,
    reservedAmount,
    committedAmount,
    paidAmount,
    availableAmount,
    budgetExceeded,
  };
}

/**
 * Creates the initial annual budget for a tenant + year.
 *
 * Set is initial-only: if a budget already exists for the tenant + year, it is
 * rejected with `BUDGET_ALREADY_SET`. To add funds later, use `topUpBudget`.
 */
export async function setBudget(
  tenantId: string,
  year: number,
  totalAmount: number,
  createdBy: string,
): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();
  const now = new Date().toISOString();

  const existing = await resolveBudget(tenantId, year);
  if (existing) {
    throw new ApiError(
      409,
      "BUDGET_ALREADY_SET",
      `Budget already set for ${year}. Use top-up to add funds.`,
    );
  }

  await repositories.budgets.insert({
    budgetId: `budget_${randomUUID()}`,
    tenantId,
    year,
    totalAmount,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });

  await recordBudgetHistory({
    tenantId,
    year,
    type: "created",
    amount: totalAmount,
    beforeTotal: 0,
    afterTotal: totalAmount,
    actorId: createdBy,
    actorRole: "tenantAdmin",
  });

  return getBudgetOverview(tenantId, year);
}

/**
 * Adds funds to the existing annual budget (never replaces it).
 *
 * Requires a budget to already exist for the tenant + year; otherwise it fails
 * with `BUDGET_NOT_FOUND`. Every top-up writes a `topup` budget-history entry.
 */
export async function topUpBudget(
  tenantId: string,
  year: number,
  additionalAmount: number,
  createdBy: string,
  reason?: string,
): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();
  const now = new Date().toISOString();

  const existing = await resolveBudget(tenantId, year);
  if (!existing) {
    throw new ApiError(
      404,
      "BUDGET_NOT_FOUND",
      `No budget set for ${year}. Use set to create the budget first.`,
    );
  }

  const beforeTotal = existing.totalAmount;
  const afterTotal = beforeTotal + additionalAmount;

  await repositories.budgets.update(existing.budgetId, {
    totalAmount: afterTotal,
    // Normalize legacy budgets that were created without a `year` field.
    year: typeof existing.year === "number" ? existing.year : year,
    updatedAt: now,
  });

  await recordBudgetHistory({
    tenantId,
    year,
    type: "topup",
    amount: additionalAmount,
    beforeTotal,
    afterTotal,
    reason,
    actorId: createdBy,
    actorRole: "tenantAdmin",
  });

  return getBudgetOverview(tenantId, year);
}

/**
 * Super Admin override: set a new annual budget ceiling with a reason.
 *
 * This is the ONLY way to change an already-set budget other than top-up, and
 * it is restricted to the super admin (enforced at the route layer). Every
 * override writes an `override` budget-history entry for the audit trail.
 */
export async function overrideBudget(
  tenantId: string,
  year: number,
  totalAmount: number,
  actorId: string,
  reason?: string,
): Promise<BudgetOverview> {
  const repositories = await getRepositoryContext();
  const now = new Date().toISOString();

  const existing = await resolveBudget(tenantId, year);
  if (!existing) {
    throw new ApiError(
      404,
      "BUDGET_NOT_FOUND",
      `No budget set for ${year}. Use set to create the budget first.`,
    );
  }

  const beforeTotal = existing.totalAmount;
  await repositories.budgets.update(existing.budgetId, {
    totalAmount,
    year: typeof existing.year === "number" ? existing.year : year,
    updatedAt: now,
  });

  await recordBudgetHistory({
    tenantId,
    year,
    type: "override",
    amount: totalAmount,
    beforeTotal,
    afterTotal: totalAmount,
    reason: reason?.trim() || undefined,
    actorId,
    actorRole: "superAdmin",
  });

  return getBudgetOverview(tenantId, year);
}
