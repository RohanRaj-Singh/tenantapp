import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmployee } from "@/src/server/services/employeeService";
import {
  createReimbursement,
  getReimbursement,
  bulkPostProgressUpdate,
} from "@/src/server/services/reimbursementService";
import { listChatMessages } from "@/src/server/services/claimMessageService";
import { unreadCount } from "@/src/server/services/notificationService";
import type { ClaimMessageParticipant } from "@/src/server/db/documents";

const TENANT_ID = "tenant-bulk-update-test";
const OTHER_TENANT = "tenant-bulk-update-other";
const ACTOR_ID = "admin-bulk-update";

const employeeParticipant = (id: string): ClaimMessageParticipant => ({
  role: "employee",
  id,
  name: "Bulk Update Employee",
  key: `employee:${id}`,
});

async function seedEmployee(tenantId: string, suffix: string) {
  return createEmployee(tenantId, {
    employeeCode: `BU-${suffix}`,
    email: `bulk-${suffix.toLowerCase()}@example.com`,
  });
}

async function seedClaim(tenantId: string, suffix: string, amount = 50) {
  const emp = await seedEmployee(tenantId, suffix);
  return createReimbursement(tenantId, {
    employeeId: emp.employeeId,
    employeeName: "Bulk Update Employee",
    type: "medical",
    amount,
    description: `Bulk update claim ${suffix}`,
  });
}

describe("Bulk Progress Update — counts", () => {
  it("posts an update to multiple claims and returns correct updated/skipped counts", async () => {
    const [c1, c2, c3] = await Promise.all([
      seedClaim(TENANT_ID, "A1"),
      seedClaim(TENANT_ID, "A2"),
      seedClaim(TENANT_ID, "A3"),
    ]);

    const result = await bulkPostProgressUpdate(
      TENANT_ID,
      [c1.reimbursementId, c2.reimbursementId, c3.reimbursementId],
      "Currently with finance",
      ACTOR_ID,
    );

    assert.deepEqual(result, { updated: 3, skipped: 0 });

    for (const claim of [c1, c2, c3]) {
      const updated = await getReimbursement(TENANT_ID, claim.reimbursementId);
      assert.ok(updated, "claim must still exist");
      assert.ok(updated!.history!.length >= 2, "history must be appended");
      const last = updated!.history![updated!.history!.length - 1]!;
      assert.equal(last.note, "Currently with finance");
      assert.equal(last.actorRole, "tenantAdmin");
      assert.equal(last.actorId, ACTOR_ID);
    }
  });

  it("skips claims that are not found or belong to another tenant", async () => {
    const c1 = await seedClaim(TENANT_ID, "B1");
    const c2 = await seedClaim(TENANT_ID, "B2");
    const foreign = await seedClaim(OTHER_TENANT, "B3");

    const result = await bulkPostProgressUpdate(
      TENANT_ID,
      [c1.reimbursementId, foreign.reimbursementId, "reimb_missing", c2.reimbursementId],
      "Almost done",
      ACTOR_ID,
    );

    assert.deepEqual(result, { updated: 2, skipped: 2 });

    // The foreign claim must be untouched.
    const foreignAfter = await getReimbursement(OTHER_TENANT, foreign.reimbursementId);
    assert.equal(foreignAfter!.history!.length, 1, "foreign claim history must be unchanged");
  });

  it("rejects a cross-tenant batch (all claims skipped)", async () => {
    const claim = await seedClaim(TENANT_ID, "C1");

    const result = await bulkPostProgressUpdate(
      OTHER_TENANT,
      [claim.reimbursementId],
      "Reached Remedy",
      ACTOR_ID,
    );

    assert.deepEqual(result, { updated: 0, skipped: 1 });

    const after = await getReimbursement(TENANT_ID, claim.reimbursementId);
    assert.equal(after!.history!.length, 1, "claim must remain untouched");
  });

  it("rejects an empty message", async () => {
    const claim = await seedClaim(TENANT_ID, "D1");

    await assert.rejects(
      () => bulkPostProgressUpdate(TENANT_ID, [claim.reimbursementId], "   ", ACTOR_ID),
      { code: "MESSAGE_REQUIRED" },
    );
  });
});

describe("Bulk Progress Update — side effects", () => {
  it("creates a history entry, an official_update chat message, and a notification for each updated claim", async () => {
    const emp = await seedEmployee(TENANT_ID, "E1");
    const claim = await createReimbursement(TENANT_ID, {
      employeeId: emp.employeeId,
      employeeName: "Bulk Update Employee",
      type: "medical",
      amount: 75,
      description: "Bulk update side-effect claim",
    });

    const result = await bulkPostProgressUpdate(
      TENANT_ID,
      [claim.reimbursementId],
      "Currently with finance",
      ACTOR_ID,
    );
    assert.deepEqual(result, { updated: 1, skipped: 0 });

    // History entry appended.
    const updated = await getReimbursement(TENANT_ID, claim.reimbursementId);
    assert.ok(updated!.history!.length >= 2, "at least one history entry must be added");
    assert.equal(
      updated!.history![updated!.history!.length - 1]!.note,
      "Currently with finance",
    );

    // official_update chat message exists.
    const view = await listChatMessages(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
    );
    assert.ok(view, "claim chat must be readable by the employee");
    const official = view!.messages.find((m) => m.type === "official_update");
    assert.ok(official, "expected an official_update chat message");
    assert.equal(official!.body, "Currently with finance");
    assert.equal(official!.participant.role, "tenantAdmin");

    // Notification created for the employee.
    const count = await unreadCount(TENANT_ID, "employee", emp.employeeId);
    assert.ok(count >= 1, "employee must receive a notification for the update");
  });
});
