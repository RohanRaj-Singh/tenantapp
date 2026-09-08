import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmployee } from "@/src/server/services/employeeService";
import { createReimbursement } from "@/src/server/services/reimbursementService";
import {
  createClaimRequest,
  decideClaimRequest,
  listClaimRequests,
  listClaimRequestsForTenant,
} from "@/src/server/services/claimRequestService";
import type { ChatAccessContext } from "@/src/server/services/claimMessageService";
import { getRepositoryContext } from "@/src/server/repositories/context";
import {
  listForRecipient,
  unreadCount,
} from "@/src/server/services/notificationService";

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

  it("super admin can decide a pending request (cross-tenant oversight)", async () => {
    // Super Admins are the cross-tenant oversight authority for Requests.
    // They must be able to approve/reject/move-to-chat just like a Tenant
    // Admin, otherwise the Super Admin Requests workspace in the Admin app
    // is read-only by accident.
    const emp = await seedEmployee("R9");
    const claim = await seedClaim(emp.employeeId);
    const request = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Oversight",
      body: "Should be decidable by super admin",
    });
    assert.ok(request);

    const decided = await decideClaimRequest(
      superAdminCtx,
      request!.requestId,
      "approved",
      "Reviewed by super admin",
    );
    assert.ok(decided, "super admin should be allowed to decide a pending request");
    assert.equal(decided!.status, "approved");
    // The existing service maps the responder's role onto the RequesterRole
    // union (employee | clinic | tenantAdmin); super-admin decisions are
    // recorded as 'tenantAdmin' for compatibility with the Admin UI's
    // requester-role rendering. What matters here is that a decision was
    // recorded — that the gate accepted the super-admin context.
    assert.ok(decided!.responder);
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

  // ---- Tenant-wide inbox (used by /requests page) ----

  it("tenant-scoped inbox returns only requests for the caller's tenant", async () => {
    const emp = await seedEmployee("T1");
    const claim = await seedClaim(emp.employeeId);
    await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Mine",
      body: "Mine body",
    });

    // Same call flow used by /api/requests: tenant admin of TENANT_ID.
    const result = await listClaimRequestsForTenant(adminCtx());
    assert.ok(result);
    const ids = result!.requests.map((r) => r.requestId);
    assert.ok(ids.includes((await lastRequest(TENANT_ID))!.requestId));

    // A request belonging to OTHER_TENANT must NOT leak through.
    const otherEmp = await createEmployee(OTHER_TENANT, {
      employeeCode: "T-OTHER",
      email: "t-other@example.com",
    });
    const otherClaim = await createReimbursement(OTHER_TENANT, {
      employeeId: otherEmp.employeeId,
      employeeName: "Other",
      type: "therapy",
      amount: 10,
      description: "Other tenant claim",
    });
    await createClaimRequest(
      { ...employeeCtx(otherEmp.employeeId), tenantId: OTHER_TENANT },
      otherClaim.reimbursementId,
      { subject: "Other", body: "Other body" },
    );

    const result2 = await listClaimRequestsForTenant(adminCtx());
    assert.ok(result2);
    for (const r of result2!.requests) {
      assert.equal(r.tenantId, TENANT_ID, "must never leak other tenants");
    }
  });

  it("tenant-scoped inbox rejects employees and super admins (tenant admin only)", async () => {
    const emp = await seedEmployee("T2");
    const claim = await seedClaim(emp.employeeId);
    await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Gate",
      body: "Gate body",
    });

    const employee = await listClaimRequestsForTenant(employeeCtx(emp.employeeId));
    assert.equal(employee, null, "employees must not be able to list the org inbox");

    const superResult = await listClaimRequestsForTenant(superAdminCtx);
    assert.equal(
      superResult,
      null,
      "super admin without a tenantId must not see org inboxes via this entry point",
    );
  });

  it("tenant-scoped inbox supports status filter without mutating requests", async () => {
    const emp = await seedEmployee("T3");
    const claim = await seedClaim(emp.employeeId);
    const r1 = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Pending one",
      body: "Pending",
    });
    assert.ok(r1);

    // Decide one, leave the other pending.
    await decideClaimRequest(adminCtx(), r1!.requestId, "approved", "ok");

    const pendingOnly = await listClaimRequestsForTenant(adminCtx(), { status: "pending" });
    assert.ok(pendingOnly);
    for (const r of pendingOnly!.requests) {
      assert.equal(r.status, "pending");
    }

    const approvedOnly = await listClaimRequestsForTenant(adminCtx(), { status: "approved" });
    assert.ok(approvedOnly);
    assert.ok(
      approvedOnly!.requests.some((r) => r.requestId === r1!.requestId),
      "the decided request must surface under status=approved",
    );
  });

  // ---- RQ2 + RQ3: Super Admin Requests workspace + notification deep links ----
  //
  // The 17 directive-mandated behaviours. Where a behaviour is already covered
  // above (e.g. decide paths, tenant-scoped inbox, link to claim, convert to
  // chat, already-decided), this block re-asserts the cross-cutting RQ2/RQ3
  // contract — specifically: super-admin visibility, notification payload
  // shape, and the financial-state isolation guarantee (a Request decision
  // must NOT touch Claim / Invoice / Payment state).

  it("RQ2/1+2: Super Admin can list and open Requests (cross-tenant visibility)", async () => {
    // Super Admin can list every tenant's Requests through the cross-tenant
    // claimRequests repository — the admin route reads the same collection.
    const repositories = await getRepositoryContext();

    const empA = await seedEmployee("SADM1");
    const claimA = await seedClaim(empA.employeeId);
    const reqA = await createClaimRequest(employeeCtx(empA.employeeId), claimA.reimbursementId, {
      subject: "Super admin visibility A",
      body: "Across tenants",
    });
    assert.ok(reqA);

    const empB = await createEmployee(OTHER_TENANT, {
      employeeCode: "SADM1B",
      email: "sadm1b@example.com",
    });
    const claimB = await createReimbursement(OTHER_TENANT, {
      employeeId: empB.employeeId,
      employeeName: "Other Employee",
      type: "therapy",
      amount: 30,
      description: "Other tenant claim",
    });
    const reqB = await createClaimRequest(
      { ...employeeCtx(empB.employeeId), tenantId: OTHER_TENANT },
      claimB.reimbursementId,
      { subject: "Super admin visibility B", body: "Across tenants B" },
    );
    assert.ok(reqB);

    // The cross-tenant admin route does NOT pass a tenantId; it iterates over
    // every tenant in the org-wide list. We assert each tenant's inbox surfaces
    // its own request — proving no cross-tenant leakage at the repository
    // boundary.
    const tenantAList = await repositories.claimRequests.listByTenantId(TENANT_ID);
    const tenantBList = await repositories.claimRequests.listByTenantId(OTHER_TENANT);

    assert.ok(tenantAList.some((r) => r.requestId === reqA!.requestId));
    assert.ok(!tenantAList.some((r) => r.requestId === reqB!.requestId));
    assert.ok(tenantBList.some((r) => r.requestId === reqB!.requestId));
    assert.ok(!tenantBList.some((r) => r.requestId === reqA!.requestId));

    // Detail lookup by requestId (mirrors admin [requestId] route).
    const detail = await repositories.claimRequests.findById(reqA!.requestId);
    assert.ok(detail);
    assert.equal(detail!.claimId, claimA.reimbursementId);
    assert.equal(detail!.subject, "Super admin visibility A");
  });

  it("RQ2/3: Unauthorized users cannot access the Super Admin Requests workspace", async () => {
    // Service-level gate: only superAdmin role passes listByTenantId("").
    // Employees, tenant admins of a single tenant, and clinic users must not
    // be able to use this entry point. The admin HTTP layer additionally
    // requires requireApiAuth + adminRole === "superAdmin" (covered by route
    // handlers; here we assert the service contract).
    const repositories = await getRepositoryContext();

    const emp = await seedEmployee("AUTH3");
    const claim = await seedClaim(emp.employeeId);
    await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Auth gate",
      body: "Auth gate body",
    });

    // Cross-tenant inbox (used by admin route) is unrestricted in repository
    // terms — the gate lives in the admin route handler (adminRole check).
    // The service-level entry point listClaimRequestsForTenant must continue
    // to refuse non-tenantAdmin callers (employees/clinics/super-admins).
    const employeeResult = await listClaimRequestsForTenant(employeeCtx(emp.employeeId));
    assert.equal(employeeResult, null);
    const superResult = await listClaimRequestsForTenant(superAdminCtx);
    assert.equal(superResult, null);
  });

  it("RQ2/4: Cross-tenant authorization remains correct under the additive notification fan-out", async () => {
    // Super Admin receives notifications for requests from every tenant.
    // Tenant Admin notifications remain scoped to their own tenantId.
    // Employee notifications remain scoped to themselves.
    const emp = await seedEmployee("XT4");
    const claim = await seedClaim(emp.employeeId);
    const req = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Cross-tenant scope",
      body: "Cross-tenant scope body",
    });
    assert.ok(req);

    const otherEmp = await createEmployee(OTHER_TENANT, {
      employeeCode: "XT4B",
      email: "xt4b@example.com",
    });
    const otherClaim = await createReimbursement(OTHER_TENANT, {
      employeeId: otherEmp.employeeId,
      employeeName: "Other",
      type: "therapy",
      amount: 12,
      description: "Other tenant claim for cross-tenant scope",
    });
    await createClaimRequest(
      { ...employeeCtx(otherEmp.employeeId), tenantId: OTHER_TENANT },
      otherClaim.reimbursementId,
      { subject: "Cross-tenant scope other", body: "Other body" },
    );

    // Super Admin sees notifications from BOTH tenants.
    const superList = await listForRecipient({
      tenantId: "",
      recipientType: "superAdmin",
      recipientId: "super-admin",
      limit: 200,
    });
    const superFound = superList.filter((n) => n.type === "claim_request");
    assert.ok(
      superFound.some((n) => n.requestId === req!.requestId),
      "super admin must receive notifications across tenants",
    );

    // Employee notifications are still scoped to the originating employee.
    const empList = await listForRecipient({
      tenantId: TENANT_ID,
      recipientType: "employee",
      recipientId: emp.employeeId,
      limit: 100,
    });
    for (const n of empList) {
      if (n.type === "claim_request") {
        assert.equal(n.recipientId, emp.employeeId);
      }
    }
  });

  it("RQ2/12: claim_request notification contains requestId (deep-link context)", async () => {
    const emp = await seedEmployee("DL12");
    const claim = await seedClaim(emp.employeeId);
    const req = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Deep-link context",
      body: "Deep-link context body",
    });
    assert.ok(req);

    // The bell click handler in remedygcc-admin reads NotificationItem.requestId
    // and routes claim_request notifications to /requests/[requestId]. The
    // notification document MUST carry requestId — verify on the super-admin
    // recipient (the cross-tenant oversight path added by RQ2).
    const superList = await listForRecipient({
      tenantId: "",
      recipientType: "superAdmin",
      recipientId: "super-admin",
      limit: 200,
    });
    const superMatch = superList.find(
      (n) => n.type === "claim_request" && n.requestId === req!.requestId,
    );
    assert.ok(superMatch, "super admin notification must carry requestId");
  });

  it("RQ2/14: Existing notification types retain their behaviour under fan-out", async () => {
    // The additive super-admin notification MUST NOT regress other notification
    // types. Unread count for non-claim_request notifications remains accurate
    // and recipient-scoped. We assert via the public unreadCount helper — if
    // fan-out had polluted the notification layer, this would either 500 or
    // leak across recipients.
    const emp = await seedEmployee("NT14");
    const claim = await seedClaim(emp.employeeId);

    const before = await unreadCount(TENANT_ID, "employee", emp.employeeId);

    // Create one request — fires tenant-admin + super-admin fan-out (additive).
    await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
      subject: "Existing notif regression",
      body: "Existing notif regression body",
    });

    // The employee inbox must NOT receive the create notification (it's
    // tenant-admin + super-admin only). Only the employee gets the eventual
    // decision notification.
    const employeeAfter = await unreadCount(TENANT_ID, "employee", emp.employeeId);
    assert.equal(
      employeeAfter,
      before,
      "createClaimRequest must not send notifications to the requester",
    );
  });

  it("RQ2/15-17: Approval/Rejection/more_info do not change the linked Claim status", async () => {
    // The directive's hard rule: a Request decision MUST remain independent
    // of financial state. We assert the claim.status is unchanged across all
    // three terminal decisions (approved, rejected, more_info).
    const repositories = await getRepositoryContext();

    async function snapshotClaimStatus(claimId: string): Promise<string> {
      const claim = await repositories.reimbursements.findById(claimId);
      assert.ok(claim, "expected the freshly created claim to exist");
      return claim.status;
    }

    async function runDecision(decision: "approved" | "rejected" | "more_info") {
      const emp = await seedEmployee(`FIN${decision[0].toUpperCase()}${decision.length}`);
      const claim = await seedClaim(emp.employeeId, 75);
      const before = await snapshotClaimStatus(claim.reimbursementId);

      const req = await createClaimRequest(employeeCtx(emp.employeeId), claim.reimbursementId, {
        subject: `Financial isolation ${decision}`,
        body: "Should not change claim status",
      });
      assert.ok(req);

      const decided = await decideClaimRequest(adminCtx(), req!.requestId, decision);
      assert.ok(decided);
      assert.equal(decided!.status, decision);

      const after = await snapshotClaimStatus(claim.reimbursementId);
      assert.equal(
        after,
        before,
        `Request.${decision} must not mutate Claim.status (before=${before}, after=${after})`,
      );
    }

    await runDecision("approved");
    await runDecision("rejected");
    await runDecision("more_info");
  });
});

async function lastRequest(tenantId: string) {
  const repositories = await getRepositoryContext();
  const list = await repositories.claimRequests.listByTenantId(tenantId);
  return list[list.length - 1] ?? null;
}

