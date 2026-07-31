import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmployee } from "@/src/server/services/employeeService";
import { createReimbursement } from "@/src/server/services/reimbursementService";
import {
  createClaimRequest,
  decideClaimRequest,
  listClaimRequests,
} from "@/src/server/services/claimRequestService";
import { listChatMessages } from "@/src/server/services/claimMessageService";
import { unreadCount } from "@/src/server/services/notificationService";
import type { ClaimMessageParticipant } from "@/src/server/db/documents";

const TENANT_ID = "tenant-request-test";
const OTHER_TENANT = "tenant-request-other";

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
    description: "Request test claim",
  });
}

describe("Claim Requests", () => {
  it("createClaimRequest creates a pending request", async () => {
    const emp = await seedEmployee("RQ1");
    const claim = await seedClaim(emp.employeeId);

    const created = await createClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      { subject: "Pre-approval for assessment", details: "Can we do this assessment?" },
    );

    assert.ok(created);
    assert.equal(created!.status, "pending");
    assert.equal(created!.subject, "Pre-approval for assessment");
    assert.equal(created!.requester.role, "employee");
  });

  it("listClaimRequests returns requests for the claim", async () => {
    const emp = await seedEmployee("RQ2");
    const claim = await seedClaim(emp.employeeId);
    const employee = employeeParticipant(emp.employeeId);

    await createClaimRequest({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId, { subject: "A", details: "a" });
    await createClaimRequest({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId, { subject: "B", details: "b" });

    const list = await listClaimRequests({ tenantId: TENANT_ID, participant: employee }, claim.reimbursementId);
    assert.ok(list);
    assert.equal(list!.length, 2);
  });

  it("employee cannot decide a request", async () => {
    const emp = await seedEmployee("RQ3");
    const claim = await seedClaim(emp.employeeId);
    const created = await createClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      { subject: "A", details: "a" },
    );

    const result = await decideClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      created!.requestId,
      "approved",
    );
    assert.equal(result, null);
  });

  it("super admin can list any claim's requests (read-only)", async () => {
    const emp = await seedEmployee("RQ4");
    const claim = await seedClaim(emp.employeeId);
    await createClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      { subject: "A", details: "a" },
    );

    const list = await listClaimRequests(
      { tenantId: "", participant: superAdminParticipant },
      claim.reimbursementId,
    );
    assert.ok(list);
    assert.equal(list!.length, 1);
  });

  it("tenant admin can decide a request and notify the employee", async () => {
    const emp = await seedEmployee("RQ5");
    const claim = await seedClaim(emp.employeeId);
    const created = await createClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      { subject: "Approval", details: "Please approve" },
    );

    const updated = await decideClaimRequest(
      { tenantId: TENANT_ID, participant: adminParticipant() },
      claim.reimbursementId,
      created!.requestId,
      "approved",
      "OK, proceed",
    );

    assert.ok(updated);
    assert.equal(updated!.status, "approved");
    assert.equal(updated!.decisionNote, "OK, proceed");

    const count = await unreadCount(TENANT_ID, "employee", emp.employeeId);
    assert.ok(count >= 1, "employee should be notified of the decision");
  });

  it("cannot decide a non-pending request twice", async () => {
    const emp = await seedEmployee("RQ6");
    const claim = await seedClaim(emp.employeeId);
    const created = await createClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      { subject: "A", details: "a" },
    );

    await decideClaimRequest(
      { tenantId: TENANT_ID, participant: adminParticipant() },
      claim.reimbursementId,
      created!.requestId,
      "rejected",
    );

    const second = await decideClaimRequest(
      { tenantId: TENANT_ID, participant: adminParticipant() },
      claim.reimbursementId,
      created!.requestId,
      "approved",
    );
    assert.equal(second, null);
  });

  it("convert-to-chat seeds a chat thread and marks the request converted", async () => {
    const emp = await seedEmployee("RQ7");
    const claim = await seedClaim(emp.employeeId);
    const created = await createClaimRequest(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
      { subject: "Assessment", details: "Can we do this assessment?" },
    );

    const converted = await decideClaimRequest(
      { tenantId: TENANT_ID, participant: adminParticipant() },
      claim.reimbursementId,
      created!.requestId,
      "converted_to_chat",
    );

    assert.ok(converted);
    assert.equal(converted!.status, "converted_to_chat");
    assert.ok(converted!.convertedToMessageId, "should reference the seeded chat message");

    const chat = await listChatMessages(
      { tenantId: TENANT_ID, participant: employeeParticipant(emp.employeeId) },
      claim.reimbursementId,
    );
    assert.ok(chat);
    assert.equal(chat!.messages.length, 1);
    assert.ok(chat!.messages[0].body.includes("Converted request"));
  });
});
