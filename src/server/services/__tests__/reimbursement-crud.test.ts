import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmployee,
} from "@/src/server/services/employeeService";
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

    const approved = await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

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

    const frozen = await freezeReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

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
    const approved = await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.ok(approved);
    assert.equal(approved!.status, "approved");

    // Then pay
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

    const approved = await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    const paid = await payReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(paid);
    assert.ok(Array.isArray(paid!.history), "history must be an array");
    assert.equal(paid!.history!.length, 3, "three entries: created, approved, paid");
    const entry = paid!.history![2]!;
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
      { message: "Only approved claims can be marked as paid." },
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

    const approved = await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
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

    const approved = await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(approved, "Expected approved claim");
    assert.ok(Array.isArray(approved!.history), "history must be an array");
    assert.equal(approved!.history!.length, 2, "two history entries after approve");
    const entry = approved!.history![1]!;
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

    const frozen = await freezeReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);

    assert.ok(frozen);
    assert.equal(frozen!.history!.length, 2);
    const entry = frozen!.history![1]!;
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
    await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID, "Looks good, approved.");
    let updated = await getReimbursement(TENANT_ID, claim.reimbursementId);
    assert.ok(updated);
    assert.equal(updated!.history!.length, 2);
    assert.equal(updated!.history![1]!.note, "Looks good, approved.");

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
    await freezeReimbursement(TENANT_ID, claim3.reimbursementId, REVIEWER_ID, "Pending investigation.");
    updated = await getReimbursement(TENANT_ID, claim3.reimbursementId);
    assert.ok(updated);
    assert.equal(updated!.history![1]!.note, "Pending investigation.");
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

    const approved = await approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.ok(approved);
    assert.equal(approved!.history!.length, 2);
    assert.equal(approved!.history![1]!.note, undefined);
  });
});
