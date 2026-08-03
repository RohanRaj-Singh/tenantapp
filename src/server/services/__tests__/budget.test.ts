import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBudgetOverview,
  setBudget,
  topUpBudget,
  overrideBudget,
} from "@/src/server/services/budgetService";
import {
  listBudgetHistory,
} from "@/src/server/services/budgetHistoryService";
import { createEmployee } from "@/src/server/services/employeeService";
import {
  createReimbursement,
  approveReimbursement,
  rejectReimbursement,
  freezeReimbursement,
  payReimbursement,
  markInProgress,
  queueForPayment,
} from "@/src/server/services/reimbursementService";

const ADMIN_ID = "admin-budget-test";

function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Route a freshly-created (pending) claim to `approved` through the legal state
 * machine (`pending → in_progress → approved`). Direct `pending → approved` is
 * no longer a valid transition.
 */
async function approveClaim(tenantId: string, claimId: string) {
  await markInProgress(tenantId, claimId, ADMIN_ID);
  return approveReimbursement(tenantId, claimId, ADMIN_ID);
}

/**
 * Route a freshly-created (pending) claim to `frozen` through the legal state
 * machine (`pending → in_progress → frozen`). Direct `pending → frozen` is no
 * longer a valid transition.
 */
async function freezeClaim(tenantId: string, claimId: string) {
  await markInProgress(tenantId, claimId, ADMIN_ID);
  return freezeReimbursement(tenantId, claimId, ADMIN_ID);
}

describe("Budget Service — Annual Budget Foundation", () => {
  it("setBudget creates the annual budget for the requested year and the overview reports that year", async () => {
    const tenantId = "tenant-budget-set";

    const overview = await setBudget(tenantId, 2026, 5000, ADMIN_ID);

    assert.equal(overview.year, 2026);
    assert.equal(overview.totalAmount, 5000);
    assert.equal(overview.committedAmount, 0);
    assert.equal(overview.paidAmount, 0);
    assert.equal(overview.availableAmount, 5000);
    assert.equal(overview.budgetExceeded, false);
  });

  it("setBudget rejects when a budget already exists for the tenant + year", async () => {
    const tenantId = "tenant-budget-already-set";

    await setBudget(tenantId, 2026, 5000, ADMIN_ID);

    await assert.rejects(
      () => setBudget(tenantId, 2026, 9000, ADMIN_ID),
      { code: "BUDGET_ALREADY_SET" },
    );

    // The original amount is untouched after the rejected set.
    const overview = await getBudgetOverview(tenantId, 2026);
    assert.equal(overview.totalAmount, 5000);
  });

  it("setBudget allows a different year even when the current year already has a budget", async () => {
    const tenantId = "tenant-budget-cross-year";

    await setBudget(tenantId, currentYear(), 5000, ADMIN_ID);
    const nextYear = currentYear() + 1;
    const nextOverview = await setBudget(tenantId, nextYear, 8000, ADMIN_ID);

    assert.equal(nextOverview.year, nextYear);
    assert.equal(nextOverview.totalAmount, 8000);

    // Current-year budget is unchanged.
    const currentOverview = await getBudgetOverview(tenantId);
    assert.equal(currentOverview.year, currentYear());
    assert.equal(currentOverview.totalAmount, 5000);
  });

  it("topUpBudget adds to the existing budget (never replaces) and writes a topup history entry", async () => {
    const tenantId = "tenant-budget-topup";

    await setBudget(tenantId, 2026, 5000, ADMIN_ID);
    const topUpOverview = await topUpBudget(tenantId, 2026, 1000, ADMIN_ID, "Q2 boost");

    assert.equal(topUpOverview.totalAmount, 6000, "top-up must add, not replace");
    assert.equal(topUpOverview.availableAmount, 6000);

    const history = await listBudgetHistory(tenantId);
    assert.equal(history.length, 2, "expected created + topup entries");

    const topup = history.find((entry) => entry.type === "topup");
    const created = history.find((entry) => entry.type === "created");
    assert.ok(topup, "expected a topup entry");
    assert.ok(created, "expected a created entry");

    assert.equal(topup!.amount, 1000);
    assert.equal(topup!.beforeTotal, 5000);
    assert.equal(topup!.afterTotal, 6000);
    assert.equal(topup!.reason, "Q2 boost");
    assert.equal(topup!.actorId, ADMIN_ID);
    assert.equal(topup!.year, 2026);

    assert.equal(created!.amount, 5000);
    assert.equal(created!.beforeTotal, 0);
    assert.equal(created!.afterTotal, 5000);
  });

  it("topUpBudget fails when no budget exists for the year", async () => {
    const tenantId = "tenant-budget-topup-missing";

    await assert.rejects(
      () => topUpBudget(tenantId, 2026, 500, ADMIN_ID),
      { code: "BUDGET_NOT_FOUND" },
    );
  });

  it("records history with the actor and amount for every mutation", async () => {
    const tenantId = "tenant-budget-history";

    await setBudget(tenantId, 2026, 3000, "admin-actor-1");
    await topUpBudget(tenantId, 2026, 500, "admin-actor-2", "extra funds");

    const history = await listBudgetHistory(tenantId);

    assert.equal(history.length, 2);

    const created = history.find((entry) => entry.type === "created");
    const topup = history.find((entry) => entry.type === "topup");
    assert.ok(created, "expected a created entry");
    assert.ok(topup, "expected a topup entry");

    assert.equal(created!.actorId, "admin-actor-1");
    assert.equal(created!.actorRole, "tenantAdmin");
    assert.equal(created!.amount, 3000);

    assert.equal(topup!.actorId, "admin-actor-2");
    assert.equal(topup!.actorRole, "tenantAdmin");
    assert.equal(topup!.amount, 500);
    assert.equal(topup!.reason, "extra funds");
  });

  it("listBudgetHistory filters by type and returns newest first", async () => {
    const tenantId = "tenant-budget-history-filter";

    await setBudget(tenantId, 2026, 3000, ADMIN_ID);
    // Space out mutations so createdAt timestamps are distinct for ordering.
    await new Promise((r) => setTimeout(r, 10));
    await topUpBudget(tenantId, 2026, 500, ADMIN_ID);
    await new Promise((r) => setTimeout(r, 10));
    await topUpBudget(tenantId, 2026, 250, ADMIN_ID);

    const topUps = await listBudgetHistory(tenantId, { type: "topup" });
    assert.equal(topUps.length, 2);
    assert.ok(
      topUps.every((entry) => entry.type === "topup"),
      "type filter must only return topups",
    );
    // Newest first.
    assert.equal(topUps[0]!.amount, 250);
    assert.equal(topUps[1]!.amount, 500);
  });

  it("overview defaults to the current year when no year is passed", async () => {
    const tenantId = "tenant-budget-year-default";

    const empty = await getBudgetOverview(tenantId);
    assert.equal(empty.year, currentYear());
    assert.equal(empty.totalAmount, 0);

    await setBudget(tenantId, currentYear(), 2000, ADMIN_ID);
    const overview = await getBudgetOverview(tenantId);
    assert.equal(overview.year, currentYear());
    assert.equal(overview.totalAmount, 2000);
  });
});

describe("Budget Service — Reservation Engine (Phase 2)", () => {
  async function seedEmployee(tenantId: string, suffix: string) {
    return createEmployee(tenantId, {
      employeeCode: `BR-${suffix}`,
      email: `br-${suffix.toLowerCase()}@example.com`,
    });
  }

  async function createClaim(tenantId: string, suffix: string, amount: number) {
    const emp = await seedEmployee(tenantId, suffix);
    return createReimbursement(tenantId, {
      employeeId: emp.employeeId,
      employeeName: "Budget Test Employee",
      type: "medical",
      amount,
      description: `Reservation test ${suffix}`,
    });
  }

  it("counts pending and in_progress claims in reservedAmount", async () => {
    const tenantId = "tenant-budget-reserve-pending-inprogress";
    await setBudget(tenantId, 2026, 10000, ADMIN_ID);

    await createClaim(tenantId, "A", 1000); // stays pending → reserved
    const inProgress = await createClaim(tenantId, "B", 1500); // pending → in_progress
    await markInProgress(tenantId, inProgress.reimbursementId, ADMIN_ID);

    const overview = await getBudgetOverview(tenantId, 2026);

    assert.equal(overview.reservedAmount, 2500);
    assert.equal(overview.committedAmount, 0);
    assert.equal(overview.paidAmount, 0);
    assert.equal(overview.availableAmount, 10000 - 2500);
  });

  it("a rejected claim is in neither reserved nor committed (reservation released)", async () => {
    const tenantId = "tenant-budget-reserve-rejected";
    await setBudget(tenantId, 2026, 10000, ADMIN_ID);

    const claim = await createClaim(tenantId, "A", 2000); // pending → rejected
    await rejectReimbursement(tenantId, claim.reimbursementId, ADMIN_ID);

    const overview = await getBudgetOverview(tenantId, 2026);

    assert.equal(overview.reservedAmount, 0);
    assert.equal(overview.committedAmount, 0);
    assert.equal(overview.paidAmount, 0);
    assert.equal(overview.availableAmount, 10000);
  });

  it("a frozen claim is in neither reserved nor committed", async () => {
    const tenantId = "tenant-budget-reserve-frozen";
    await setBudget(tenantId, 2026, 10000, ADMIN_ID);

    const claim = await createClaim(tenantId, "A", 2000); // pending → in_progress → frozen
    await freezeClaim(tenantId, claim.reimbursementId);

    const overview = await getBudgetOverview(tenantId, 2026);

    assert.equal(overview.reservedAmount, 0);
    assert.equal(overview.committedAmount, 0);
    assert.equal(overview.paidAmount, 0);
    assert.equal(overview.availableAmount, 10000);
  });

  it("availableAmount = total - reserved - committed (paid is inside committed)", async () => {
    const tenantId = "tenant-budget-reserve-formula";
    await setBudget(tenantId, 2026, 5000, ADMIN_ID);

    await createClaim(tenantId, "A", 1000); // pending → reserved
    const approved = await createClaim(tenantId, "B", 2000); // → approved → committed
    await approveClaim(tenantId, approved.reimbursementId);
    const paidClaim = await createClaim(tenantId, "C", 1500); // → approved → paid
    await approveClaim(tenantId, paidClaim.reimbursementId);
    await queueForPayment(tenantId, paidClaim.reimbursementId, ADMIN_ID);
    await payReimbursement(tenantId, paidClaim.reimbursementId, ADMIN_ID);

    const overview = await getBudgetOverview(tenantId, 2026);

    assert.equal(overview.reservedAmount, 1000);
    assert.equal(overview.committedAmount, 3500, "approved 2000 + paid 1500");
    assert.equal(overview.paidAmount, 1500);
    assert.equal(overview.availableAmount, 5000 - 1000 - 3500);
    assert.equal(overview.budgetExceeded, false);
  });

  it("clamps availableAmount at zero when the used amount exceeds the total", async () => {
    const tenantId = "tenant-budget-reserve-clamp";
    await setBudget(tenantId, 2026, 1000, ADMIN_ID);

    await createClaim(tenantId, "A", 800); // pending → reserved
    const approved = await createClaim(tenantId, "B", 800); // → approved → committed
    await approveClaim(tenantId, approved.reimbursementId);

    const overview = await getBudgetOverview(tenantId, 2026);

    assert.equal(overview.reservedAmount, 800);
    assert.equal(overview.committedAmount, 800);
    assert.equal(overview.availableAmount, 0, "available must clamp at zero");
    assert.equal(overview.budgetExceeded, true);
  });

  it("a paid claim stays inside committedAmount (payment event, not a separate pool)", async () => {
    const tenantId = "tenant-budget-reserve-paid";
    await setBudget(tenantId, 2026, 10000, ADMIN_ID);

    const claim = await createClaim(tenantId, "A", 2500);
    await approveClaim(tenantId, claim.reimbursementId);
    await queueForPayment(tenantId, claim.reimbursementId, ADMIN_ID);
    await payReimbursement(tenantId, claim.reimbursementId, ADMIN_ID);

    const overview = await getBudgetOverview(tenantId, 2026);

    assert.equal(overview.reservedAmount, 0);
    assert.equal(overview.committedAmount, 2500, "paid claim is still committed");
    assert.equal(overview.paidAmount, 2500);
    assert.equal(overview.availableAmount, 10000 - 2500);
    assert.equal(overview.budgetExceeded, false);
  });
});

describe("Budget Service — Committed Budget (Phase 3)", () => {
  async function seedEmployee(tenantId: string, suffix: string) {
    return createEmployee(tenantId, {
      employeeCode: `PC-${suffix}`,
      email: `pc-${suffix.toLowerCase()}@example.com`,
    });
  }

  async function createClaim(tenantId: string, suffix: string, amount: number) {
    const emp = await seedEmployee(tenantId, suffix);
    return createReimbursement(tenantId, {
      employeeId: emp.employeeId,
      employeeName: "Phase 3 Test Employee",
      type: "medical",
      amount,
      description: `Committed budget test ${suffix}`,
    });
  }

  it("an approved claim moves into committedAmount and stays there after payment (committed permanent)", async () => {
    const tenantId = "tenant-budget-committed-permanent";
    await setBudget(tenantId, 2026, 10000, ADMIN_ID);

    const claim = await createClaim(tenantId, "A", 2000);
    await approveClaim(tenantId, claim.reimbursementId);

    const afterApproval = await getBudgetOverview(tenantId, 2026);
    assert.equal(afterApproval.committedAmount, 2000);
    assert.equal(afterApproval.paidAmount, 0);
    assert.equal(afterApproval.reservedAmount, 0);
    assert.equal(afterApproval.availableAmount, 8000);

    // Paying later is only a payment event — the claim stays committed.
    await queueForPayment(tenantId, claim.reimbursementId, ADMIN_ID);
    await payReimbursement(tenantId, claim.reimbursementId, ADMIN_ID);

    const afterPayment = await getBudgetOverview(tenantId, 2026);
    assert.equal(afterPayment.committedAmount, 2000, "paid claim must stay committed");
    assert.equal(afterPayment.paidAmount, 2000);
    assert.equal(afterPayment.availableAmount, 8000, "payment must not free available");
  });

  it("paying an approved claim does not increase availableAmount (paid stays inside committed)", async () => {
    const tenantId = "tenant-budget-paid-no-free";
    await setBudget(tenantId, 2026, 5000, ADMIN_ID);

    const claim = await createClaim(tenantId, "A", 1500);
    await approveClaim(tenantId, claim.reimbursementId);

    const beforePayment = await getBudgetOverview(tenantId, 2026);
    assert.equal(beforePayment.committedAmount, 1500);
    assert.equal(beforePayment.paidAmount, 0);
    assert.equal(beforePayment.availableAmount, 3500);

    await queueForPayment(tenantId, claim.reimbursementId, ADMIN_ID);
    await payReimbursement(tenantId, claim.reimbursementId, ADMIN_ID);

    const afterPayment = await getBudgetOverview(tenantId, 2026);
    assert.equal(afterPayment.committedAmount, 1500);
    assert.equal(afterPayment.paidAmount, 1500);
    assert.equal(
      afterPayment.availableAmount,
      3500,
      "available must not increase on payment",
    );
  });

  it("budgetExceeded is true when reserved + committed > total and false otherwise", async () => {
    const tenantId = "tenant-budget-exceeded-flag";
    await setBudget(tenantId, 2026, 1000, ADMIN_ID);

    // reserved 800 + committed 0 = 800 <= 1000 → not exceeded.
    await createClaim(tenantId, "A", 800); // pending → reserved
    let overview = await getBudgetOverview(tenantId, 2026);
    assert.equal(overview.reservedAmount, 800);
    assert.equal(overview.budgetExceeded, false);

    // Approving 500 → committed 500; reserved 800 + committed 500 = 1300 > 1000 → exceeded.
    const claim = await createClaim(tenantId, "B", 500); // pending → approved → committed
    await approveClaim(tenantId, claim.reimbursementId);

    overview = await getBudgetOverview(tenantId, 2026);
    assert.equal(overview.committedAmount, 500);
    assert.equal(overview.budgetExceeded, true);
    assert.equal(overview.availableAmount, 0, "available clamps at zero when exceeded");

    // Exceeded through committed alone (no reservation) also flags true.
    const tenantId2 = "tenant-budget-exceeded-committed";
    await setBudget(tenantId2, 2026, 500, ADMIN_ID);
    const bigClaim = await createClaim(tenantId2, "C", 700);
    await approveClaim(tenantId2, bigClaim.reimbursementId);

    const overview2 = await getBudgetOverview(tenantId2, 2026);
    assert.equal(overview2.committedAmount, 700);
    assert.equal(overview2.reservedAmount, 0);
    assert.equal(overview2.budgetExceeded, true);
    assert.equal(overview2.availableAmount, 0);
  });

  it("availableAmount = max(0, total - reserved - committed)", async () => {
    const tenantId = "tenant-budget-available-formula";
    await setBudget(tenantId, 2026, 5000, ADMIN_ID);

    await createClaim(tenantId, "A", 1000); // pending → reserved
    const approved = await createClaim(tenantId, "B", 2000); // → committed
    await approveClaim(tenantId, approved.reimbursementId);

    const overview = await getBudgetOverview(tenantId, 2026);
    assert.equal(overview.reservedAmount, 1000);
    assert.equal(overview.committedAmount, 2000);
    assert.equal(overview.availableAmount, 5000 - 1000 - 2000);
    assert.equal(overview.budgetExceeded, false);

    // Exceeding the total clamps available at zero (never negative).
    const paid = await createClaim(tenantId, "C", 3000); // → approved → committed
    await approveClaim(tenantId, paid.reimbursementId);

    const exceeded = await getBudgetOverview(tenantId, 2026);
    assert.equal(exceeded.reservedAmount, 1000);
    assert.equal(exceeded.committedAmount, 5000);
    assert.equal(exceeded.availableAmount, 0);
    assert.equal(exceeded.budgetExceeded, true);
  });
});

// ── Super Admin Override (Phase 7) ────────────────────────────────────────────

describe("Budget Service — Override (Phase 7)", () => {
  async function seedEmployee(tenantId: string, suffix: string) {
    return createEmployee(tenantId, {
      employeeCode: `OVR-${suffix}`,
      email: `ovr-${suffix.toLowerCase()}@example.com`,
    });
  }

  async function createClaim(tenantId: string, suffix: string, amount: number) {
    const emp = await seedEmployee(tenantId, suffix);
    return createReimbursement(tenantId, {
      employeeId: emp.employeeId,
      employeeName: "Budget Test Employee",
      type: "medical",
      amount,
      description: `Override test ${suffix}`,
    });
  }

  it("overrideBudget sets a new ceiling with a reason and writes an override history entry", async () => {
    const tenantId = "tenant-budget-override-1";
    await setBudget(tenantId, 2026, 5000, ADMIN_ID);

    const overridden = await overrideBudget(tenantId, 2026, 12000, "super-admin", "Client added more funding");

    assert.equal(overridden.totalAmount, 12000);
    const history = await listBudgetHistory(tenantId);
    const overrideEntry = history.find((h) => h.type === "override");
    assert.ok(overrideEntry, "expected an override history entry");
    assert.equal(overrideEntry!.amount, 12000);
    assert.equal(overrideEntry!.beforeTotal, 5000);
    assert.equal(overrideEntry!.afterTotal, 12000);
    assert.equal(overrideEntry!.actorRole, "superAdmin");
    assert.equal(overrideEntry!.reason, "Client added more funding");
  });

  it("overrideBudget requires an existing budget", async () => {
    await assert.rejects(
      () => overrideBudget("tenant-budget-override-none", 2026, 9000, "super-admin"),
      { code: "BUDGET_NOT_FOUND" },
    );
  });

  it("overrideBudget keeps committed/reserved semantics and reflects the new ceiling", async () => {
    const tenantId = "tenant-budget-override-2";
    await setBudget(tenantId, 2026, 5000, ADMIN_ID);
    const approved = await createClaim(tenantId, "OVR-A", 3000);
    await approveClaim(tenantId, approved.reimbursementId);

    const overridden = await overrideBudget(tenantId, 2026, 10000, "super-admin", "Raise cap");
    assert.equal(overridden.committedAmount, 3000);
    assert.equal(overridden.availableAmount, 10000 - 3000);
    assert.equal(overridden.budgetExceeded, false);
  });
});
