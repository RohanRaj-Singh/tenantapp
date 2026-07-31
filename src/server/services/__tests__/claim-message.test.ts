import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmployee } from "@/src/server/services/employeeService";
import { createReimbursement } from "@/src/server/services/reimbursementService";
import {
  listChatMessages,
  markThreadRead,
  postChatMessage,
  postOfficialUpdate,
} from "@/src/server/services/claimMessageService";
import { unreadCount } from "@/src/server/services/notificationService";
import type { ClaimMessageParticipant } from "@/src/server/db/documents";

const TENANT_ID = "tenant-chat-test";
const OTHER_TENANT = "tenant-chat-other";

const employeeParticipant = (id: string): ClaimMessageParticipant => ({
  role: "employee",
  id,
  name: "Test Employee",
  key: `employee:${id}`,
});

const adminParticipant = (id = "admin-1"): ClaimMessageParticipant => ({
  role: "tenantAdmin",
  id,
  name: "Reviewer",
  key: `tenantAdmin:${id}`,
});

const superAdminParticipant: ClaimMessageParticipant = {
  role: "superAdmin",
  id: "super-admin",
  name: "Super Admin",
  key: "superAdmin:super-admin",
};

async function seedEmployee(code: string) {
  return createEmployee(TENANT_ID, {
    employeeCode: code,
    email: `${code.toLowerCase()}@example.com`,
  });
}

async function seedClaim(employeeId: string, amount = 50) {
  return createReimbursement(TENANT_ID, {
    employeeId,
    employeeName: "Test Employee",
    type: "medical",
    amount,
    description: "Chat test claim",
  });
}

describe("Claim Chat", () => {
  it("postChatMessage creates a message for the claim", async () => {
    const emp = await seedEmployee("CC1");
    const claim = await seedClaim(emp.employeeId);

    const msg = await postChatMessage(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      "Hello reviewer",
    );

    assert.ok(msg);
    assert.equal(msg!.body, "Hello reviewer");
    assert.equal(msg!.type, "text");
    assert.equal(msg!.participant.role, "employee");
  });

  it("listChatMessages returns chronological messages with unread count for the viewer", async () => {
    const emp = await seedEmployee("CC2");
    const claim = await seedClaim(emp.employeeId);
    const employee = employeeParticipant(emp.employeeId);
    const admin = adminParticipant();

    await postChatMessage({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId, "from employee");
    await postChatMessage({ tenantId: TENANT_ID, participant: admin }, claim.reimbursementId, "from admin");

    const view = await listChatMessages({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId);
    assert.ok(view);
    assert.equal(view!.messages.length, 2);
    assert.equal(view!.messages[0].body, "from employee");
    assert.equal(view!.messages[1].body, "from admin");
    // Employee's own message is not counted as unread; the admin's is.
    assert.equal(view!.unreadCount, 1);
  });

  it("employee cannot access a claim they do not own", async () => {
    const owner = await seedEmployee("CC3");
    const other = await seedEmployee("CC3b");
    const claim = await seedClaim(owner.employeeId);

    const view = await listChatMessages(
      { tenantId: TENANT_ID, participant: employeeParticipant(other.employeeId) },
      claim.reimbursementId,
    );
    assert.equal(view, null);
  });

  it("tenant admin is scoped to their tenant", async () => {
    const emp = await seedEmployee("CC4");
    const claim = await seedClaim(emp.employeeId);

    const view = await listChatMessages(
      { tenantId: OTHER_TENANT, participant: adminParticipant() },
      claim.reimbursementId,
    );
    assert.equal(view, null);
  });

  it("super admin can read any claim's chat", async () => {
    const emp = await seedEmployee("CC5");
    const claim = await seedClaim(emp.employeeId);
    await postChatMessage(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      "oversight",
    );

    const view = await listChatMessages(
      { tenantId: "", participant: superAdminParticipant },
      claim.reimbursementId,
    );
    assert.ok(view);
    assert.equal(view!.messages.length, 1);
  });

  it("markThreadRead clears unread count and excludes the author's own messages", async () => {
    const emp = await seedEmployee("CC6");
    const claim = await seedClaim(emp.employeeId);
    const employee = employeeParticipant(emp.employeeId);
    const admin = adminParticipant();

    await postChatMessage({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId, "one");
    await postChatMessage({ tenantId: TENANT_ID, participant: admin }, claim.reimbursementId, "two");

    const marked = await markThreadRead({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId);
    assert.equal(marked, 1, "only the admin's message should be newly marked read");

    const view = await listChatMessages({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId);
    assert.equal(view!.unreadCount, 0);
  });

  it("posting a tenant-admin message notifies the employee", async () => {
    const emp = await seedEmployee("CC8");
    const claim = await seedClaim(emp.employeeId);

    await postChatMessage(
      { tenantId: TENANT_ID, participant: adminParticipant() },
      claim.reimbursementId,
      "checking in",
    );

    const count = await unreadCount(TENANT_ID, "employee", emp.employeeId);
    assert.ok(count >= 1, "employee should receive a notification for the new message");
  });

  it("postOfficialUpdate bridges a progress update into the chat", async () => {
    const emp = await seedEmployee("CC7");
    const claim = await seedClaim(emp.employeeId);

    await postOfficialUpdate({
      tenantId: TENANT_ID,
      claimId: claim.reimbursementId,
      actorId: "admin-1",
      message: "Currently with finance",
    });

    const view = await listChatMessages(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
    );
    assert.ok(view);
    assert.equal(view!.messages.length, 1);
    assert.equal(view!.messages[0].type, "official_update");
    assert.equal(view!.messages[0].participant.role, "tenantAdmin");
    assert.equal(view!.messages[0].body, "Currently with finance");
  });
});
