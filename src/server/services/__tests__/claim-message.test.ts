import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmployee } from "@/src/server/services/employeeService";
import { createReimbursement } from "@/src/server/services/reimbursementService";
import {
  listChatMessages,
  markThreadRead,
  postChatMessage,
  postOfficialUpdate,
  postSystemMessage,
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
    assert.equal(msg!.type, "message");
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
    const userMessages = view!.messages.filter((m) => m.type !== "system");
    assert.equal(userMessages.length, 2);
    assert.equal(userMessages[0].body, "from employee");
    assert.equal(userMessages[1].body, "from admin");
    // Unread for the employee: the "Claim submitted" system event + the admin's message
    // (their own message is not counted).
    assert.equal(view!.unreadCount, 2);
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
    const userMessages = view!.messages.filter((m) => m.type !== "system");
    assert.equal(userMessages.length, 1);
    assert.equal(userMessages[0].body, "oversight");
  });

  it("markThreadRead clears unread count and excludes the author's own messages", async () => {
    const emp = await seedEmployee("CC6");
    const claim = await seedClaim(emp.employeeId);
    const employee = employeeParticipant(emp.employeeId);
    const admin = adminParticipant();

    await postChatMessage({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId, "one");
    await postChatMessage({ tenantId: TENANT_ID, participant: admin }, claim.reimbursementId, "two");

    const marked = await markThreadRead({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId);
    // Newly marked read for the employee: the "Claim submitted" system event + the admin's
    // message (their own message is excluded).
    assert.equal(marked, 2, "system event + admin message should be newly marked read");

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
    const official = view!.messages.find((m) => m.type === "official_update");
    assert.ok(official, "expected an official_update message in the thread");
    assert.equal(official!.participant.role, "tenantAdmin");
    assert.equal(official!.body, "Currently with finance");
  });

  it("postSystemMessage records a read-only system event in chat", async () => {
    const emp = await seedEmployee("CC9");
    const claim = await seedClaim(emp.employeeId);

    await postSystemMessage({ tenantId: TENANT_ID, claimId: claim.reimbursementId, body: "Claim approved" });

    const view = await listChatMessages(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
    );
    assert.ok(view);
    const systemMessages = view!.messages.filter((m) => m.type === "system");
    // One from createReimbursement ("Claim submitted") + the one we just posted.
    assert.equal(systemMessages.length, 2);
    assert.equal(systemMessages[systemMessages.length - 1].body, "Claim approved");
    assert.equal(systemMessages[0].participant.role, "system");
  });
});
