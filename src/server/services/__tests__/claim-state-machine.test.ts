import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createReimbursement,
  approveReimbursement,
  rejectReimbursement,
  freezeReimbursement,
  payReimbursement,
  markInProgress,
  queueForPayment,
} from "@/src/server/services/reimbursementService";
import { createEmployee } from "@/src/server/services/employeeService";
import { listForRecipient } from "@/src/server/services/notificationService";
import { getRepositoryContext } from "@/src/server/repositories/context";

const TENANT_ID = "tenant-state-machine-test";
const REVIEWER_ID = "admin-state-machine";

async function seedEmployee(suffix: string) {
  return createEmployee(TENANT_ID, {
    employeeCode: `SM-${suffix}`,
    email: `sm${suffix.toLowerCase()}@example.com`,
  });
}

async function newClaim(amount = 100, description = "State machine test") {
  const emp = await seedEmployee(Math.random().toString(36).slice(2, 8));
  const claim = await createReimbursement(TENANT_ID, {
    employeeId: emp.employeeId,
    employeeName: "State Machine Employee",
    type: "medical",
    amount,
    description,
  });
  return { emp, claim };
}

/** Route a pending claim to a target status via the legal path. */
async function routeTo(
  claimId: string,
  target: "in_progress" | "frozen" | "approved" | "rejected" | "to_be_paid" | "paid",
) {
  if (target === "in_progress") return markInProgress(TENANT_ID, claimId, REVIEWER_ID);
  await markInProgress(TENANT_ID, claimId, REVIEWER_ID);
  if (target === "frozen") return freezeReimbursement(TENANT_ID, claimId, REVIEWER_ID);
  if (target === "approved") return approveReimbursement(TENANT_ID, claimId, REVIEWER_ID);
  if (target === "rejected") return rejectReimbursement(TENANT_ID, claimId, REVIEWER_ID);
  if (target === "to_be_paid") {
    await approveReimbursement(TENANT_ID, claimId, REVIEWER_ID);
    return queueForPayment(TENANT_ID, claimId, REVIEWER_ID);
  }
  if (target === "paid") {
    await approveReimbursement(TENANT_ID, claimId, REVIEWER_ID);
    await queueForPayment(TENANT_ID, claimId, REVIEWER_ID);
    return payReimbursement(TENANT_ID, claimId, REVIEWER_ID);
  }
  return null;
}

describe("Claim State Machine — allowed transitions", () => {
  it("pending → in_progress", async () => {
    const { claim } = await newClaim();
    const updated = await markInProgress(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.equal(updated!.status, "in_progress");
  });

  it("pending → rejected (immediate rejection)", async () => {
    const { claim } = await newClaim();
    const updated = await rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.equal(updated!.status, "rejected");
  });

  it("in_progress → frozen / approved / rejected", async () => {
    const { claim: c1 } = await newClaim();
    await markInProgress(TENANT_ID, c1.reimbursementId, REVIEWER_ID);
    const frozen = await freezeReimbursement(TENANT_ID, c1.reimbursementId, REVIEWER_ID);
    assert.equal(frozen!.status, "frozen");

    const { claim: c2 } = await newClaim();
    await markInProgress(TENANT_ID, c2.reimbursementId, REVIEWER_ID);
    const approved = await approveReimbursement(TENANT_ID, c2.reimbursementId, REVIEWER_ID);
    assert.equal(approved!.status, "approved");

    const { claim: c3 } = await newClaim();
    await markInProgress(TENANT_ID, c3.reimbursementId, REVIEWER_ID);
    const rejected = await rejectReimbursement(TENANT_ID, c3.reimbursementId, REVIEWER_ID);
    assert.equal(rejected!.status, "rejected");
  });

  it("frozen → in_progress / approved / rejected", async () => {
    const { claim: c1 } = await newClaim();
    await routeTo(c1.reimbursementId, "frozen");
    const thawed = await markInProgress(TENANT_ID, c1.reimbursementId, REVIEWER_ID);
    assert.equal(thawed!.status, "in_progress", "frozen → in_progress must be allowed");

    const { claim: c2 } = await newClaim();
    await routeTo(c2.reimbursementId, "frozen");
    const approved = await approveReimbursement(TENANT_ID, c2.reimbursementId, REVIEWER_ID);
    assert.equal(approved!.status, "approved", "frozen → approved must be allowed");

    const { claim: c3 } = await newClaim();
    await routeTo(c3.reimbursementId, "frozen");
    const rejected = await rejectReimbursement(TENANT_ID, c3.reimbursementId, REVIEWER_ID);
    assert.equal(rejected!.status, "rejected", "frozen → rejected must be allowed");
  });

  it("approved → to_be_paid → paid", async () => {
    const { claim } = await newClaim();
    await routeTo(claim.reimbursementId, "approved");
    const queued = await queueForPayment(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.equal(queued!.status, "to_be_paid");
    const paid = await payReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID);
    assert.equal(paid!.status, "paid");
  });
});

describe("Claim State Machine — forbidden transitions", () => {
  it("pending → approved is forbidden", async () => {
    const { claim } = await newClaim();
    await assert.rejects(
      () => approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("pending → frozen is forbidden", async () => {
    const { claim } = await newClaim();
    await assert.rejects(
      () => freezeReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("approved → rejected is forbidden", async () => {
    const { claim } = await newClaim();
    await routeTo(claim.reimbursementId, "approved");
    await assert.rejects(
      () => rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("approved → in_progress is forbidden", async () => {
    const { claim } = await newClaim();
    await routeTo(claim.reimbursementId, "approved");
    await assert.rejects(
      () => markInProgress(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("paid → any transition is forbidden (terminal)", async () => {
    const { claim } = await newClaim();
    await routeTo(claim.reimbursementId, "paid");
    await assert.rejects(
      () => markInProgress(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
    await assert.rejects(
      () => rejectReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });

  it("rejected → approved/frozen is forbidden (rejected only resubmits to pending)", async () => {
    const { claim } = await newClaim();
    await routeTo(claim.reimbursementId, "rejected");
    await assert.rejects(
      () => approveReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
    await assert.rejects(
      () => freezeReimbursement(TENANT_ID, claim.reimbursementId, REVIEWER_ID),
      { code: "INVALID_STATUS_TRANSITION" },
    );
  });
});

describe("Claim State Machine — notifications per transition", () => {
  async function employeeNotificationsFor(claimId: string, type: string) {
    const ctx = await getRepositoryContext();
    const claim = await ctx.reimbursements.findById(claimId);
    assert.ok(claim, "claim must exist");
    const list = await listForRecipient({
      tenantId: TENANT_ID,
      recipientType: "employee",
      recipientId: claim!.employeeId,
      limit: 100,
    });
    return list.filter((n) => n.claimId === claimId && n.type === type);
  }

  it("in_progress, frozen, approved, rejected, to_be_paid, paid each fire an employee notification", async () => {
    const cases: Array<[string, (id: string) => Promise<unknown>]> = [
      ["claim_in_progress", (id) => markInProgress(TENANT_ID, id, REVIEWER_ID)],
      ["claim_frozen", (id) => routeTo(id, "frozen")],
      ["claim_approved", (id) => routeTo(id, "approved")],
      ["claim_rejected", (id) => rejectReimbursement(TENANT_ID, id, REVIEWER_ID)],
      ["claim_payment_queued", (id) => routeTo(id, "to_be_paid")],
      ["claim_paid", (id) => routeTo(id, "paid")],
    ];

    for (const [type, act] of cases) {
      const { claim } = await newClaim();
      await act(claim.reimbursementId);
      const notifs = await employeeNotificationsFor(claim.reimbursementId, type);
      assert.ok(notifs.length >= 1, `expected at least one ${type} notification, got ${notifs.length}`);
    }
  });
});
