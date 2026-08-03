import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmployee } from "@/src/server/services/employeeService";
import { createReimbursement } from "@/src/server/services/reimbursementService";
import {
  createClaimRequest,
  decideClaimRequest,
  listClaimRequests,
} from "@/src/server/services/claimRequestService";
import type { ChatAccessContext } from "@/src/server/services/claimMessageService";
import { getRepositoryContext } from "@/src/server/repositories/context";

const TENANT_ID = "tenant-request-test";
const OTHER_TENANT = "tenant-request-other";

const employeeCtx = (id: string): ChatAccessContext => ({
  tenantId: TENANT_ID,
  participant: {
    role: "employee",
    id,
    name: "Test Employee",
    key: `employee:${id}`,
  },
});

const adminCtx = (id = "admin-1"): ChatAccessContext => ({
  tenantId: TENANT_ID,
  participant: {
    role: "tenantAdmin",
    id,
    name: "Reviewer",
    key: `tenantAdmin:${id}`,
  },
});

const superAdminCtx: ChatAccessContext = {
  tenantId: "",
  participant: {
    role: "superAdmin",
    id: "super-admin",
    name: "Super Admin",
    key: "superAdmin:super-admin",
  },
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
    type: "therapy",
    amount,
    description: "Request test claim",
  });
}

describe("Claim Requests", () => {
  it("creates a pending request on a claim", async () => {
    const emp = await seedEmployee("RQ1");
    const claim = await seedClaim(emp.employeeId);

    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Can we do an assessment for 1000?",
      body: "The assessment is expensive. Is it covered?",
    });

    assert.ok(request);
    assert.equal(request!.status, "pending");
    assert.equal(request!.requester.role, "employee");
    assert.equal(request!.claimId, claim.reimbursementId);
    assert.equal(request!.tenantId, TENANT_ID);
  });

  it("rejects a request with missing subject or body", async () => {
    const emp = await seedEmployee("RQ2");
    const claim = await seedClaim(emp.employeeId);
    const ctx = employeeCtx(emp.employeeId);

    const noSubject = await createClaimRequest(ctx, claim.reimbursementId, {
      subject: "  ",
      body: "Hello",
    });
    assert.equal(noSubject, null);

    const noBody = await createClaimRequest(ctx, claim.reimbursementId, {
      subject: "Subject",
      body: "",
    });
    assert.equal(noBody, null);
  });

  it("does not allow a request from a different tenant's employee", async () => {
    const otherEmp = await createEmployee(OTHER_TENANT, {
      employeeCode: "RQ3",
      email: "rq3@example.com",
    });
    const emp = await seedEmployee("RQ4");
    const claim = await seedClaim(emp.employeeId);

    const request = await createClaimRequest(
      { ...employeeCtx(otherEmp.employeeId), tenantId: OTHER_TENANT },
      claim.reimbursementId,
      { subject: "X", body: "Y" },
    );
    assert.equal(request, null);
  });

  it("lists requests on a claim for an authorized participant", async () => {
    const emp = await seedEmployee("RQ5");
    const claim = await seedClaim(emp.employeeId);
    const ctx = employeeCtx(emp.employeeId);

    await createClaimRequest(ctx, claim.reimbursementId, { subject: "A", body: "B" });
    await createClaimRequest(ctx, claim.reimbursementId, { subject: "C", body: "D" });

    const view = await listClaimRequests(adminCtx(), claim.reimbursementId);
    assert.ok(view);
    assert.equal(view!.requests.length, 2);
  });

  it("tenant admin approves a pending request", async () => {
    const emp = await seedEmployee("RQ6");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Approval needed",
      body: "Is this possible?",
    });
    assert.ok(request);

    const decided = await decideClaimRequest(
      adminCtx(),
      request!.requestId,
      "approved",
      "Yes, this is covered.",
    );
    assert.ok(decided);
    assert.equal(decided!.status, "approved");
    assert.equal(decided!.resolutionNote, "Yes, this is covered.");
    assert.equal(decided!.responder?.role, "tenantAdmin");
  });

  it("tenant admin rejects a request with more info", async () => {
    const emp = await seedEmployee("RQ7");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Needs data",
      body: "Can you approve?",
    });
    assert.ok(request);

    const decided = await decideClaimRequest(
      adminCtx(),
      request!.requestId,
      "more_info",
      "Please provide the receipt first.",
    );
    assert.ok(decided);
    assert.equal(decided!.status, "more_info");
  });

  it("employee/requester cannot decide their own request", async () => {
    const emp = await seedEmployee("R8");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Self decide",
      body: "Should fail",
    });
    assert.ok(request);

    const decided = await decideClaimRequest(
      employeeCtx(emp.employeeId),
      request!.requestId,
      "approved",
    );
    assert.equal(decided, null);
  });

  it("super admin cannot decide a request (oversight read-only)", async () => {
    const emp = await seedEmployee("R9");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Oversight",
      body: "Read only",
    });
    assert.ok(request);

    const decided = await decideClaimRequest(superAdminCtx, request!.requestId, "approved");
    assert.equal(decided, null);
  });

  it("converting to chat seeds a chat message on the claim", async () => {
    const emp = await seedEmployee("R10");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Lets discuss",
      body: "Full context here",
    });
    assert.ok(request);

    const decided = await decideClaimRequest(
      adminCtx(),
      request!.requestId,
      "converted_to_chat",
    );
    assert.ok(decided);
    assert.equal(decided!.status, "converted_to_chat");
    assert.ok(decided!.convertedToChatMessageId);

    const repositories = await getRepositoryContext();
    const messages = await repositories.claimMessages.listByClaimId(claim.reimbursementId);
    const seeded = messages.find((m) => m.messageId === decided!.convertedToChatMessageId);
    assert.ok(seeded, "convert-to-chat should seed a chat message");
  });

  it("cannot decide an already-decided request", async () => {
    const emp = await seedEmployee("R11");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Double decide",
      body: "Only once",
    });
    assert.ok(request);

    await decideClaimRequest(adminCtx(), request!.requestId, "rejected", "Not approved");
    const second = await decideClaimRequest(adminCtx(), request!.requestId, "approved");
    assert.equal(second, null);
  });
});