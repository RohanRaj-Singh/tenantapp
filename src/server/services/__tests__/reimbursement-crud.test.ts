import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmployee,
} from "@/src/server/services/employeeService";
import { createTenantUser } from "@/src/modules/tenant-auth/repository/repository";
import { listForRecipient } from "@/src/server/services/notificationService";
import {
  createReimbursement,
  createEmployeeReimbursement,
  listReimbursements,
  getReimbursement,
  updateReimbursement,
  approveReimbursement,
  rejectReimbursement,
  freezeReimbursement,
  payReimbursement,
  markInProgress,
  queueForPayment,
} from "@/src/server/services/reimbursementService";

const TENANT_ID = "tenant-crud-test-reimbursements";
const OTHER_TENANT = "tenant-other-reimb";
const REVIEWER_ID = "admin-user-001";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function seedEmployee(suffix: string) {
  return createEmployee(TENANT_ID, {
    employeeCode: `RC-${suffix}`,
    email: `emp${suffix}@example.com`,
  });
}

const EMPLOYEE_NAME = "Test Employee";

/**
 * Walk a freshly-created (pending) claim through the legal state machine to a
 * target status. Since `pending → approved` and `pending → frozen` are no
 * longer valid, fixtures must route via `in_progress` first.
 */
async function advanceTo(
  claimId: string,
  target: "in_progress" | "frozen" | "approved" | "rejected" | "to_be_paid" | "paid",
  notes?: string,
) {
  const current = (await getReimbursement(TENANT_ID, claimId))!;
  if (current.status === "pending") {
    await markInProgress(TENANT_ID, claimId, REVIEWER_ID);
  }
  const afterStart = (await getReimbursement(TENANT_ID, claimId))!;
  if (afterStart.status === "frozen" && (target === "in_progress" || target === "approved" || target === "rejected")) {
    await markInProgress(TENANT_ID, claimId, REVIEWER_ID);
  }
  if (target === "in_progress") {
    return getReimbursement(TENANT_ID, claimId);
  }
  if (target === "frozen") {
    return freezeReimbursement(TENANT_ID, claimId, REVIEWER_ID, notes);
  }
  if (target === "approved") {
    return approveReimbursement(TENANT_ID, claimId, REVIEWER_ID, notes);
  }
  if (target === "rejected") {
    return rejectReimbursement(TENANT_ID, claimId, REVIEWER_ID, notes);
  }
  if (target === "to_be_paid") {
    await approveReimbursement(TENANT_ID, claimId, REVIEWER_ID);
    return queueForPayment(TENANT_ID, claimId, REVIEWER_ID);
  }
  if (target === "paid") {
    await approveReimbursement(TENANT_ID, claimId, REVIEWER_ID);
    await queueForPayment(TENANT_ID, claimId, REVIEWER_ID);
    return payReimbursement(TENANT_ID, claimId, REVIEWER_ID);
  }
  return getReimbursement(TENANT_ID, claimId);
}

// ── Create ──────────────────────────────────────────────────────────────────

describe("Reimbursement CRUD — Create", () => {
  it("createReimbursement assigns a reimbursementId, claimNumber, and status=pending", async () => {
    const emp = await seedEmployee("CR1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 50.500,
      description: "Clinic visit",
    });

    assert.ok(claim.reimbursementId.startsWith("reimb_"), "Expected ID prefix 'reimb_'");
    assert.match(claim.claimNumber, /^RMB-\d{4}-\d{6}$/, "Expected claimNumber format RMB-YYYY-NNNNNN");
    assert.equal(claim.tenantId, TENANT_ID);
    assert.equal(claim.status, "pending");
    assert.equal(claim.amount, 50.500);
    assert.equal(claim.description, "Clinic visit");
  });

  it("createEmployeeReimbursement sets clinicId/clinicName and correct type", async () => {
    const emp = await seedEmployee("CR2");
    const claim = await createEmployeeReimbursement(TENANT_ID, emp.employeeId, EMPLOYEE_NAME, {
      clinicId: "clinic_abc",
      clinicName: "Al Shifa Clinic",
      amount: 30.000,
      description: "Therapy session",
    });

    assert.equal(claim.type, "reimbursement");
    assert.equal(claim.clinicId, "clinic_abc");
    assert.equal(claim.clinicName, "Al Shifa Clinic");
    assert.match(claim.claimNumber, /^RMB-\d{4}-\d{6}$/);
  });

  it("each created claim gets a unique claimNumber", async () => {
    const emp = await seedEmployee("CR3");
    const [c1, c2, c3] = await Promise.all([
      createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 10, description: "A" }),
      createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 20, description: "B" }),
      createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 30, description: "C" }),
    ]);

    const numbers = [c1.claimNumber, c2.claimNumber, c3.claimNumber];
    const unique = new Set(numbers);
    assert.equal(unique.size, 3, `Expected 3 unique claim numbers, got: ${numbers.join(", ")}`);
  });
});

// ── Read ────────────────────────────────────────────────────────────────────

describe("Reimbursement CRUD — Read", () => {
  it("getReimbursement retrieves a claim by ID within the correct tenant", async () => {
    const emp = await seedEmployee("RD1");
    const created = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 15.000,
      description: "Read test",
    });

    const found = await getReimbursement(TENANT_ID, created.reimbursementId);
    assert.ok(found, "Expected to find claim");
    assert.equal(found!.reimbursementId, created.reimbursementId);
    assert.equal(found!.claimNumber, created.claimNumber);
  });

  it("getReimbursement returns null for a cross-tenant lookup", async () => {
    const emp = await seedEmployee("RD2");
    const created = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 10,
      description: "Cross-tenant test",
    });

    const result = await getReimbursement(OTHER_TENANT, created.reimbursementId);
    assert.equal(result, null, "Cross-tenant lookup must return null");
  });

  it("listReimbursements returns all claims for a tenant with correct total", async () => {
    const subTenant = "tenant-reimb-list-test";
    const emp = await createEmployee(subTenant, { employeeCode: "RL-001", email: "rl@t.com" });

    await createReimbursement(subTenant, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 10, description: "A" });
    await createReimbursement(subTenant, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 20, description: "B" });
    await createReimbursement(subTenant, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 30, description: "C" });

    const result = await listReimbursements(subTenant);
    assert.equal(result.total, 3);
    assert.equal(result.reimbursements.length, 3);

    // Every claim must have a claimNumber
    for (const r of result.reimbursements) {
      assert.match(r.claimNumber ?? "", /^RMB-\d{4}-\d{6}$/, `Missing claimNumber on ${r.reimbursementId}`);
    }
  });

  it("listReimbursements filters by status", async () => {
    const subTenant = "tenant-reimb-status-test";
    const emp = await createEmployee(subTenant, { employeeCode: "RS-001", email: "rs@t.com" });

    const c1 = await createReimbursement(subTenant, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 10, description: "pending" });
    const c2 = await createReimbursement(subTenant, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 20, description: "to approve" });

    await markInProgress(subTenant, c2.reimbursementId, REVIEWER_ID);
    await approveReimbursement(subTenant, c2.reimbursementId, REVIEWER_ID);

    const pending = await listReimbursements(subTenant, { status: "pending" });
    const approved = await listReimbursements(subTenant, { status: "approved" });

    assert.ok(pending.reimbursements.some((r) => r.reimbursementId === c1.reimbursementId));
    assert.ok(approved.reimbursements.some((r) => r.reimbursementId === c2.reimbursementId));
    assert.equal(pending.reimbursements.every((r) => r.status === "pending"), true);
    assert.equal(approved.reimbursements.every((r) => r.status === "approved"), true);
  });

  it("listReimbursements searches by claimNumber", async () => {
    const subTenant = "tenant-reimb-search-test";
    const emp = await createEmployee(subTenant, { employeeCode: "SRCH-001", email: "sr@t.com" });

    const claim = await createReimbursement(subTenant, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 10, description: "searchable" });

    const result = await listReimbursements(subTenant, { search: claim.claimNumber });
    assert.equal(result.total, 1, "Search by claimNumber should find exactly one claim");
    assert.equal(result.reimbursements[0]!.reimbursementId, claim.reimbursementId);
  });
});

// ── Update ──────────────────────────────────────────────────────────────────

describe("Reimbursement CRUD — Update", () => {
  it("updateReimbursement modifies fields and bumps updatedAt", async () => {
    const emp = await seedEmployee("UP1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 40,
      description: "Original description",
    });
    const originalUpdatedAt = claim.updatedAt;

    await new Promise((r) => setTimeout(r, 5));

    const updated = await updateReimbursement(TENANT_ID, claim.reimbursementId, {
      description: "Updated description",
      amount: 55,
    });

    assert.ok(updated, "Expected updated claim");
    assert.equal(updated!.description, "Updated description");
    assert.equal(updated!.amount, 55);
    assert.ok(updated!.updatedAt > originalUpdatedAt, "updatedAt must advance");
  });

  it("updateReimbursement returns null for cross-tenant update", async () => {
    const emp = await seedEmployee("UP2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 20,
      description: "Guard test",
    });

    const result = await updateReimbursement(OTHER_TENANT, claim.reimbursementId, { description: "Hijacked" });
    assert.equal(result, null, "Cross-tenant update must return null");
  });
});

// ── Employee Resubmit After Rejection (Phase B / FR-071) ──────────────────────

describe("Reimbursement CRUD — Resubmit After Rejection", () => {
  it("updateReimbursement resubmits a rejected claim to pending with a Resubmitted history entry", async () => {
    const emp = await seedEmployee("RS1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 30,
      description: "Resubmit test",
    });

    await rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID, "Missing receipt");

    const resubmitted = await updateReimbursement(
      TENANT_ID,
      claim.reimbursementId,
      {
        employeeId: emp.employeeId,
        description: "Updated details",
        notes: "Added the receipt",
      },
      // Employee resubmission is the only legal path for rejected → pending.
      { resubmit: true },
    );

    assert.ok(resubmitted);
    assert.equal(resubmitted!.status, "pending");
    const entries = resubmitted!.history ?? [];
    const last = entries[entries.length - 1];
    assert.equal(last.status, "pending");
    assert.equal(last.actorRole, "employee");
    assert.ok(last.note?.includes("Resubmitted"), `expected 'Resubmitted' note, got: ${last.note}`);
  });

  it("tenant-admin edit-after-reject does NOT resubmit and preserves the original owner", async () => {
    const emp = await seedEmployee("RST");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 30,
      description: "Tenant edit resubmit test",
    });

    await rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID, "Missing receipt");

    // The tenant-admin edit form (ReimbursementDetailPage saveEdit) sends ONLY
    // amount/description/notes — no employeeId and no resubmit flag. Regression
    // guard: the claim must (a) keep the real owner and (b) STAY rejected —
    // rejected → pending is reserved for employee resubmission.
    const edited = await updateReimbursement(TENANT_ID, claim.reimbursementId, {
      amount: 35,
      description: "Edited by tenant admin",
      notes: "Added the receipt",
    });

    assert.ok(edited);
    assert.equal(edited!.status, "rejected", "tenant-admin edit must NOT resubmit to pending");
    assert.equal(
      edited!.employeeId,
      emp.employeeId,
      "employeeId must NOT be reassigned when the edit body omits it",
    );
  });

  it("updateReimbursement on a non-rejected claim does not change status", async () => {
    const emp = await seedEmployee("RS2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 40,
      description: "No-resubmit test",
    });

    const updated = await updateReimbursement(TENANT_ID, claim.reimbursementId, {
      employeeId: emp.employeeId,
      description: "Just an edit",
    });

    assert.ok(updated);
    assert.equal(updated!.status, "pending", "a pending claim edit must not change status");
  });

  it("updateReimbursement rejects edits on a paid claim (read-only terminal state)", async () => {
    const emp = await seedEmployee("RSPD");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 60,
      description: "Paid read-only test",
    });

    await advanceTo(claim.reimbursementId, "paid");

    await assert.rejects(
      () =>
        updateReimbursement(TENANT_ID, claim.reimbursementId, {
          description: "Should be blocked",
        }),
      { code: "CLAIM_READ_ONLY" },
    );
  });

  it("updateReimbursement resubmit is scoped to the claim tenant", async () => {
    const emp = await seedEmployee("RS3");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 50,
      description: "Cross-tenant resubmit guard",
    });

    await rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID, "No");

    const result = await updateReimbursement(OTHER_TENANT, claim.reimbursementId, {
      employeeId: emp.employeeId,
      description: "Hijacked",
    });
    assert.equal(result, null, "Cross-tenant resubmit must return null");
  });

  it("resubmitting a rejected claim notifies both the employee and the reviewer (tenant admin)", async () => {
    // Reviewer notifications are addressed to the tenant's dashboard user, so
    // one must exist for notifyTenantAdmins to have a recipient.
    const reviewerTenant = "tenant-resubmit-notify";
    const admin = await createTenantUser({
      tenantId: reviewerTenant,
      email: "reviewer@example.com",
      username: "reviewer",
      passwordHash: "x",
      mustChangePassword: false,
      status: "active",
    });
    const emp = await createEmployee(reviewerTenant, {
      employeeCode: "RC-RSN",
      email: "emprsn@example.com",
    });
    const claim = await createEmployeeReimbursement(reviewerTenant, emp.employeeId, EMPLOYEE_NAME, {
      clinicId: "clinic_rsn",
      clinicName: "Notify Clinic",
      amount: 25,
      description: "Resubmit notify test",
    });

    await rejectReimbursement(reviewerTenant, claim.reimbursementId, REVIEWER_ID, "Fix it");

    await updateReimbursement(
      reviewerTenant,
      claim.reimbursementId,
      {
        employeeId: emp.employeeId,
        description: "Fixed",
        notes: "Corrected the amount",
      },
      { resubmit: true },
    );

    const employeeNotifs = await listForRecipient({
      tenantId: reviewerTenant,
      recipientType: "employee",
      recipientId: emp.employeeId,
      limit: 100,
    });
    assert.ok(
      employeeNotifs.some((n) => n.type === "claim_resubmitted" && n.claimId === claim.reimbursementId),
      "employee should receive a claim_resubmitted notification",
    );

    const reviewerNotifs = await listForRecipient({
      tenantId: reviewerTenant,
      recipientType: "tenantAdmin",
      recipientId: admin.id,
      limit: 100,
    });
    assert.ok(
      reviewerNotifs.some((n) => n.type === "claim_resubmitted" && n.claimId === claim.reimbursementId),
      "reviewer (tenant admin) should receive a claim_resubmitted notification",
    );
  });
});

// ── Status Actions ───────────────────────────────────────────────────────────

describe("Reimbursement CRUD — Status Actions", () => {
  it("approveReimbursement sets status=approved with reviewedBy and reviewedAt", async () => {
    const emp = await seedEmployee("SA1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 60,
      description: "Approve test",
    });

    const approved = await advanceTo(claim.reimbursementId, "approved");

    assert.ok(approved, "Expected approved claim");
    assert.equal(approved!.status, "approved");
    assert.equal(approved!.reviewedBy, REVIEWER_ID);
    assert.ok(approved!.reviewedAt, "Expected reviewedAt to be set");
  });

  it("rejectReimbursement sets status=rejected", async () => {
    const emp = await seedEmployee("SA2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 70,
      description: "Reject test",
    });

    const rejected = await rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(rejected);
    assert.equal(rejected!.status, "rejected");
    assert.equal(rejected!.reviewedBy, REVIEWER_ID);
  });

  it("freezeReimbursement sets status=frozen", async () => {
    const emp = await seedEmployee("SA3");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 80,
      description: "Freeze test",
    });

    const frozen = await advanceTo(claim.reimbursementId, "frozen");

    assert.ok(frozen);
    assert.equal(frozen!.status, "frozen");
    assert.equal(frozen!.reviewedBy, REVIEWER_ID);
  });

  it("status actions return null for cross-tenant requests", async () => {
    const emp = await seedEmployee("SA4");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 90,
      description: "Guard test",
    });

    const r1 = await approveReimbursement(OTHER_TENANT, claim.reimbursementId, REVIEWER_ID);
    const r2 = await rejectReimbursement(OTHER_TENANT, claim.reimbursementId, REVIEWER_ID);
    const r3 = await freezeReimbursement(OTHER_TENANT, claim.reimbursementId, REVIEWER_ID);

    assert.equal(r1, null);
    assert.equal(r2, null);
    assert.equal(r3, null);
  });
});

// ── In-Progress Transition (pending/frozen → in_progress) ─────────────────────

describe("Reimbursement CRUD — In-Progress Transition", () => {
  it("markInProgress sets status=in_progress with reviewedBy and reviewedAt", async () => {
    const emp = await seedEmployee("IP1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 60,
      description: "In progress test",
    });

    const inProgress = await markInProgress(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(inProgress);
    assert.equal(inProgress!.status, "in_progress");
    assert.equal(inProgress!.reviewedBy, REVIEWER_ID);
  });

  it("markInProgress appends an in_progress history entry with an optional note", async () => {
    const emp = await seedEmployee("IP2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 61,
      description: "In progress note test",
    });

    const inProgress = await markInProgress(TENANT_ID, claim.reimbursementId, REVIEWER_ID, "Under review with finance");

    assert.ok(inProgress);
    const entries = inProgress!.history ?? [];
    const last = entries[entries.length - 1];
    assert.equal(last.status, "in_progress");
    assert.equal(last.actorRole, "tenantAdmin");
    assert.equal(last.note, "Under review with finance");
  });

  it("markInProgress throws for non-eligible statuses", async () => {
    const emp = await seedEmployee("IP3");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 62,
      description: "In progress guard test",
    });

    const approved = await advanceTo(claim.reimbursementId, "approved");
    assert.ok(approved);

    await assert.rejects(
      () => markInProgress(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("markInProgress returns null for cross-tenant requests", async () => {
    const emp = await seedEmployee("IP4");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 63,
      description: "In progress cross-tenant guard",
    });

    const result = await markInProgress(OTHER_TENANT, claim.reimbursementId, REVIEWER_ID);
    assert.equal(result, null);
  });
});

// ── Pay Transition (approved → paid) ──────────────────────────────────────────

describe("Reimbursement CRUD — Pay Transition", () => {
  it("payReimbursement sets status=paid with reviewedBy and reviewedAt", async () => {
    const emp = await seedEmployee("PA1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 100,
      description: "Pay test",
    });

    // Approve first
    const approved = await advanceTo(claim.reimbursementId, "approved");
    assert.ok(approved);
    assert.equal(approved!.status, "approved");

    // Then queue for payment, then pay
    const queued = await queueForPayment(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.ok(queued);
    assert.equal(queued!.status, "to_be_paid");

    const paid = await payReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.ok(paid, "Expected paid claim");
    assert.equal(paid!.status, "paid");
    assert.equal(paid!.reviewedBy, REVIEWER_ID);
    assert.ok(paid!.reviewedAt, "Expected reviewedAt to be set");
  });

  it("payReimbursement appends a paid history entry", async () => {
    const emp = await seedEmployee("PA2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 110,
      description: "Pay history test",
    });

    const approved = await advanceTo(claim.reimbursementId, "approved");
    assert.ok(approved);
    await queueForPayment(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    const paid = await payReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(paid);
    assert.ok(Array.isArray(paid!.history), "history must be an array");
    assert.equal(paid!.history!.length, 5, "five entries: created, in_progress, approved, to_be_paid, paid");
    const entry = paid!.history![4]!;
    assert.equal(entry.status, "paid");
    assert.equal(entry.actorRole, "tenantAdmin");
    assert.equal(entry.actorId, REVIEWER_ID);
  });

  it("payReimbursement throws for non-approved claims", async () => {
    const emp = await seedEmployee("PA3");
    const pendingClaim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 120,
      description: "Pay guard test",
    });

    await assert.rejects(
      () => payReimbursement(TENANT_ID, pendingClaim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("payReimbursement returns null for cross-tenant requests", async () => {
    const emp = await seedEmployee("PA4");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 130,
      description: "Cross-tenant pay guard",
    });

    const approved = await advanceTo(claim.reimbursementId, "approved");
    assert.ok(approved);

    const result = await payReimbursement(OTHER_TENANT, claim.reimbursementId, REVIEWER_ID);
    assert.equal(result, null, "Cross-tenant pay must return null");
  });
});

// ── Phase 5I: Claim History & Receipt Identity ───────────────────────────────

describe("Reimbursement — Claim History & Receipt Identity", () => {
  it("createEmployeeReimbursement stores receiptHash and serviceDate when provided", async () => {
    const emp = await seedEmployee("HI1");
    const claim = await createEmployeeReimbursement(TENANT_ID, emp.employeeId, EMPLOYEE_NAME, {
      clinicId: "clinic_x",
      clinicName: "Test Clinic",
      amount: 25,
      description: "Hash/date test",
      receiptHash: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      serviceDate: "2026-06-01",
    });

    assert.equal(claim.receiptHash, "abc123def456abc123def456abc123def456abc123def456abc123def456abc1");
    assert.equal(claim.serviceDate, "2026-06-01");
  });

  it("createEmployeeReimbursement omits receiptHash/serviceDate when not provided", async () => {
    const emp = await seedEmployee("HI2");
    const claim = await createEmployeeReimbursement(TENANT_ID, emp.employeeId, EMPLOYEE_NAME, {
      clinicId: "clinic_y",
      clinicName: "Another Clinic",
      amount: 10,
      description: "No hash/date",
    });

    assert.equal(Object.prototype.hasOwnProperty.call(claim, "receiptHash"), false, "receiptHash must be absent");
    assert.equal(Object.prototype.hasOwnProperty.call(claim, "serviceDate"), false, "serviceDate must be absent");
  });

  it("createEmployeeReimbursement creates a single pending history entry attributed to the employee", async () => {
    const emp = await seedEmployee("HI3");
    const claim = await createEmployeeReimbursement(TENANT_ID, emp.employeeId, EMPLOYEE_NAME, {
      clinicId: "clinic_z",
      clinicName: "Some Clinic",
      amount: 15,
      description: "History entry test",
    });

    assert.ok(Array.isArray(claim.history), "history must be an array");
    assert.equal(claim.history!.length, 1, "exactly one history entry on creation");
    const entry = claim.history![0]!;
    assert.equal(entry.status, "pending");
    assert.equal(entry.actorRole, "employee");
    assert.equal(entry.actorId, emp.employeeId);
    assert.ok(entry.timestamp, "timestamp must be set");
  });

  it("createReimbursement creates a single pending history entry attributed to the employee", async () => {
    const emp = await seedEmployee("HI4");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 20,
      description: "Direct create history test",
    });

    assert.ok(Array.isArray(claim.history), "history must be an array");
    assert.equal(claim.history!.length, 1);
    assert.equal(claim.history![0]!.status, "pending");
    assert.equal(claim.history![0]!.actorRole, "employee");
    assert.equal(claim.history![0]!.actorId, emp.employeeId);
  });

  it("approveReimbursement appends an approved tenantAdmin history entry", async () => {
    const emp = await seedEmployee("HI5");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 30,
      description: "Approve history test",
    });

    const approved = await advanceTo(claim.reimbursementId, "approved");

    assert.ok(approved, "Expected approved claim");
    assert.ok(Array.isArray(approved!.history), "history must be an array");
    assert.equal(approved!.history!.length, 3, "three history entries after approve (created, in_progress, approved)");
    const entry = approved!.history![2]!;
    assert.equal(entry.status, "approved");
    assert.equal(entry.actorRole, "tenantAdmin");
    assert.equal(entry.actorId, REVIEWER_ID);
  });

  it("rejectReimbursement appends a rejected tenantAdmin history entry", async () => {
    const emp = await seedEmployee("HI6");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 40,
      description: "Reject history test",
    });

    const rejected = await rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(rejected);
    assert.equal(rejected!.history!.length, 2);
    const entry = rejected!.history![1]!;
    assert.equal(entry.status, "rejected");
    assert.equal(entry.actorRole, "tenantAdmin");
    assert.equal(entry.actorId, REVIEWER_ID);
  });

  it("freezeReimbursement appends a frozen tenantAdmin history entry", async () => {
    const emp = await seedEmployee("HI7");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 50,
      description: "Freeze history test",
    });

    const frozen = await advanceTo(claim.reimbursementId, "frozen");

    assert.ok(frozen);
    assert.equal(frozen!.history!.length, 3, "three history entries after freeze (created, in_progress, frozen)");
    const entry = frozen!.history![2]!;
    assert.equal(entry.status, "frozen");
    assert.equal(entry.actorRole, "tenantAdmin");
    assert.equal(entry.actorId, REVIEWER_ID);
  });

  it("stores notes in the history entry when passed to review actions", async () => {
    const emp = await seedEmployee("N1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 60,
      description: "Notes storage test",
    });

    // Approve with notes
    await advanceTo(claim.reimbursementId, "approved", "Looks good, approved.");
    let updated = await getReimbursement(TENANT_ID, claim.reimbursementId);
    assert.ok(updated);
    assert.equal(updated!.history!.length, 3, "created, in_progress, approved");
    assert.equal(updated!.history![2]!.note, "Looks good, approved.");

    // Reject with notes
    const claim2 = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 70,
      description: "Notes storage test 2",
    });
    await rejectReimbursement(TENANT_ID, claim2.reimbursementId, REVIEWER_ID, "Not covered by policy.");
    updated = await getReimbursement(TENANT_ID, claim2.reimbursementId);
    assert.ok(updated);
    assert.equal(updated!.history![1]!.note, "Not covered by policy.");

    // Freeze with notes
    const claim3 = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 80,
      description: "Notes storage test 3",
    });
    await advanceTo(claim3.reimbursementId, "frozen", "Pending investigation.");
    updated = await getReimbursement(TENANT_ID, claim3.reimbursementId);
    assert.ok(updated);
    assert.equal(updated!.history!.length, 3, "created, in_progress, frozen");
    assert.equal(updated!.history![2]!.note, "Pending investigation.");
  });

  it("omits the note field from history when notes is not provided", async () => {
    const emp = await seedEmployee("N2");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: EMPLOYEE_NAME,
      type: "medical",
      amount: 90,
      description: "No notes test",
    });

    const approved = await advanceTo(claim.reimbursementId, "approved");
    assert.ok(approved);
    assert.equal(approved!.history!.length, 3, "created, in_progress, approved");
    assert.equal(approved!.history![2]!.note, undefined);
  });
});

// ── Sorting (FR-054: reverse / oldest-first) ───────────────────────────────

describe("Reimbursement CRUD — Sorting", () => {
  async function seedThreeClaims(prefix: string) {
    const emp = await seedEmployee(`SORT-${prefix}`);
    const c1 = await createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 10, description: `${prefix}-first` });
    await new Promise((r) => setTimeout(r, 5));
    const c2 = await createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 20, description: `${prefix}-second` });
    await new Promise((r) => setTimeout(r, 5));
    const c3 = await createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 30, description: `${prefix}-third` });
    return { c1, c2, c3 };
  }

  it("defaults to newest-first by createdAt", async () => {
    const { c1, c2, c3 } = await seedThreeClaims("D1");
    const result = await listReimbursements(TENANT_ID);

    const ordered = result.reimbursements
      .filter((r) => [c1.reimbursementId, c2.reimbursementId, c3.reimbursementId].includes(r.reimbursementId))
      .map((r) => r.reimbursementId);

    assert.deepEqual(ordered, [c3.reimbursementId, c2.reimbursementId, c1.reimbursementId]);
  });

  it("returns oldest-first when sortOrder is asc on createdAt", async () => {
    const { c1, c2, c3 } = await seedThreeClaims("D2");
    const result = await listReimbursements(TENANT_ID, { sortBy: "createdAt", sortOrder: "asc" });

    const ordered = result.reimbursements
      .filter((r) => [c1.reimbursementId, c2.reimbursementId, c3.reimbursementId].includes(r.reimbursementId))
      .map((r) => r.reimbursementId);

    assert.deepEqual(ordered, [c1.reimbursementId, c2.reimbursementId, c3.reimbursementId]);
  });

  it("sorts by updatedAt when sortBy is updatedAt", async () => {
    const { c1, c2, c3 } = await seedThreeClaims("D3");

    // Ensure the touch timestamp is strictly later than c3's createdAt so the
    // updatedAt ordering is deterministic (the seed only waits 5ms per claim).
    await new Promise((r) => setTimeout(r, 10));

    // Bump c2's updatedAt so it becomes the most recently updated claim.
    await updateReimbursement(TENANT_ID, c2.reimbursementId, { description: "touched" });

    const result = await listReimbursements(TENANT_ID, { sortBy: "updatedAt", sortOrder: "desc" });
    const ordered = result.reimbursements
      .filter((r) => [c1.reimbursementId, c2.reimbursementId, c3.reimbursementId].includes(r.reimbursementId))
      .map((r) => r.reimbursementId);

    assert.equal(ordered[0], c2.reimbursementId, "updatedAt desc must surface the touched claim first");
    assert.ok(ordered.length >= 3);

    const ascResult = await listReimbursements(TENANT_ID, { sortBy: "updatedAt", sortOrder: "asc" });
    const ascOrdered = ascResult.reimbursements
      .filter((r) => [c1.reimbursementId, c2.reimbursementId, c3.reimbursementId].includes(r.reimbursementId))
      .map((r) => r.reimbursementId);

    assert.equal(ascOrdered[ascOrdered.length - 1], c2.reimbursementId, "updatedAt asc must surface the touched claim last");
  });

  it("sorts by status in the requested direction", async () => {
    const emp = await seedEmployee("SORT-ST");
    const c1 = await createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 10, description: "status-a" });
    const c2 = await createReimbursement(TENANT_ID, { employeeId: emp.employeeId, employeeName: EMPLOYEE_NAME, type: "medical", amount: 20, description: "status-b" });
    await advanceTo(c1.reimbursementId, "approved");

    const result = await listReimbursements(TENANT_ID, { sortBy: "status", sortOrder: "asc" });
    const relevant = result.reimbursements.filter((r) => [c1.reimbursementId, c2.reimbursementId].includes(r.reimbursementId));
    const statuses = relevant.map((r) => r.status);

    assert.ok(statuses.includes("approved") && statuses.includes("pending"));
    const sorted = [...statuses].sort();
    assert.deepEqual(statuses, sorted, "status asc should be lexicographically ordered");
  });
});
