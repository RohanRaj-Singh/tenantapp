import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createClinicUserAccount,
  loginClinicUser,
  validateClinicSession,
} from "@/src/modules/clinic-auth/services/auth-service";
import type { ClinicUserProfile } from "@/src/modules/clinic-auth/contracts/types";
import { resetClinicLoginRateLimiter } from "@/src/modules/clinic-auth/utils/rate-limit";
import {
  createClinicReimbursement,
  getClinicReimbursement,
  listClinicReimbursements,
  resolveClinicParticipant,
} from "@/src/server/services/clinicPortalService";
import {
  listChatMessages,
  postChatMessage,
} from "@/src/server/services/claimMessageService";
import { createEmployee } from "@/src/server/services/employeeService";
import { createEmployeeReimbursement } from "@/src/server/services/reimbursementService";

const TENANT_A = "tenant-clinic-a";
const TENANT_B = "tenant-clinic-b";
const CLINIC_X = "clinic-test-x";
const CLINIC_Y = "clinic-test-y";

function userProfile(input: {
  clinicUserId: string;
  email: string;
  name: string;
  clinicIds: string[];
  tenantIds: string[];
  mustChangePassword?: boolean;
}): ClinicUserProfile {
  const now = new Date().toISOString();
  return {
    clinicUserId: input.clinicUserId,
    email: input.email,
    name: input.name,
    clinicIds: input.clinicIds,
    tenantIds: input.tenantIds,
    status: "active",
    mustChangePassword: input.mustChangePassword ?? false,
    lastAccessAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedEmployee(tenantId: string, code: string) {
  return createEmployee(tenantId, {
    employeeCode: code,
    email: `${code.toLowerCase()}@test.com`,
  });
}

async function seedClaim(tenantId: string, employeeId: string, clinicId: string, clinicName: string) {
  return createEmployeeReimbursement(tenantId, employeeId, `Employee ${clinicId}`, {
    clinicId,
    clinicName,
    amount: 25,
    description: "Clinic test claim",
    bankAccountNumber: "OM000000001",
    bankName: "Test Bank",
    contactCountryCode: "+968",
    contactNumber: "99999999",
  });
}

describe("Clinic Portal — Auth", () => {
  it("login succeeds with valid credentials and sets a session", async () => {
    resetClinicLoginRateLimiter();
    const created = await createClinicUserAccount({
      email: "clinic-auth-1@test.com",
      name: "Clinic Auth One",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
      initialPassword: "ClinicPass1234",
      createdBy: "test",
    });

    const result = await loginClinicUser({
      email: "clinic-auth-1@test.com",
      password: created.initialPassword,
    });

    assert.equal(result.success, true);
    assert.equal(result.user?.email, "clinic-auth-1@test.com");
    assert.ok(result.session?.sessionToken);
    assert.equal(result.requiresPasswordChange, true);
  });

  it("locks the clinic account after 5 failed attempts", async () => {
    resetClinicLoginRateLimiter();
    const created = await createClinicUserAccount({
      email: "clinic-lockout@test.com",
      name: "Clinic Lockout",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
      initialPassword: "ClinicPass1234",
      createdBy: "test",
    });

    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await loginClinicUser({
        email: "clinic-lockout@test.com",
        password: "WrongPass1234",
      });
    }

    assert.equal(last!.success, false);
    assert.equal(last!.reason, "USER_LOCKED");
    assert.ok(last!.lockedUntil);

    // A valid password is still blocked while locked. The login rate limiter
    // (email+IP) engages on the 6th call and denies with a retry window before
    // the persisted user-document lock is consulted — mirroring tenant-auth.
    const blocked = await loginClinicUser({
      email: "clinic-lockout@test.com",
      password: created.initialPassword,
    });
    assert.equal(blocked.success, false);
    assert.ok(
      blocked.reason === "USER_LOCKED" ||
        (blocked.reason === "INVALID_CREDENTIALS" &&
          (blocked.retryAfterSeconds ?? 0) > 0),
      `expected locked-out response, got reason=${blocked.reason} retryAfter=${blocked.retryAfterSeconds}`,
    );
  });

  it("restores a valid session from the token", async () => {
    resetClinicLoginRateLimiter();
    const created = await createClinicUserAccount({
      email: "clinic-session@test.com",
      name: "Clinic Session",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
      initialPassword: "ClinicPass1234",
      createdBy: "test",
    });

    const login = await loginClinicUser({
      email: "clinic-session@test.com",
      password: created.initialPassword,
    });
    assert.ok(login.success && login.session);

    const validation = await validateClinicSession(login.session!.sessionToken);
    assert.equal(validation.success, true);
    assert.equal(validation.context?.user.email, "clinic-session@test.com");
  });
});

describe("Clinic Portal — Claims", () => {
  it("clinic can list its own clinic's claims with anonymity", async () => {
    const emp = await seedEmployee(TENANT_A, "CL-A1");
    await seedClaim(TENANT_A, emp.employeeId, CLINIC_X, "Clinic X");
    // A claim from a different clinic must not appear.
    await seedClaim(TENANT_A, emp.employeeId, CLINIC_Y, "Clinic Y");

    const user = userProfile({
      clinicUserId: "clinic-user-list",
      email: "list@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    const result = await listClinicReimbursements(user);
    assert.equal(result.total, 1);
    const claim = result.claims[0]!;
    assert.equal(claim.clinicId, CLINIC_X);

    // Anonymity: no employee name / bank / contact fields.
    assert.ok(!("employeeName" in claim), "employeeName must be stripped");
    assert.ok(!("bankAccountNumber" in claim), "bankAccountNumber must be stripped");
    assert.ok(!("bankName" in claim), "bankName must be stripped");
    assert.ok(!("contactCountryCode" in claim), "contactCountryCode must be stripped");
    assert.ok(!("contactNumber" in claim), "contactNumber must be stripped");
    // Employee code is present and resolves.
    assert.equal(claim.employeeCode, "CL-A1");
  });

  it("getClinicReimbursement returns the anonymized detail for its clinic", async () => {
    const emp = await seedEmployee(TENANT_A, "CL-A2");
    const claim = await seedClaim(TENANT_A, emp.employeeId, CLINIC_X, "Clinic X");

    const user = userProfile({
      clinicUserId: "clinic-user-detail",
      email: "detail@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    const view = await getClinicReimbursement(user, claim.reimbursementId);
    assert.ok(view);
    assert.equal(view!.reimbursementId, claim.reimbursementId);
    assert.equal(view!.employeeCode, "CL-A2");
    assert.ok(!("employeeName" in view!));
    assert.ok(!("bankName" in view!));
  });

  it("clinic cannot access another clinic's claim (cross-clinic denied)", async () => {
    const emp = await seedEmployee(TENANT_A, "CL-A3");
    const claim = await seedClaim(TENANT_A, emp.employeeId, CLINIC_Y, "Clinic Y");

    const user = userProfile({
      clinicUserId: "clinic-user-cross",
      email: "cross@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    assert.equal(await getClinicReimbursement(user, claim.reimbursementId), null);
  });

  it("clinic cannot access a claim from another tenant (cross-tenant denied)", async () => {
    const emp = await seedEmployee(TENANT_B, "CL-B1");
    const claim = await seedClaim(TENANT_B, emp.employeeId, CLINIC_X, "Clinic X");

    const user = userProfile({
      clinicUserId: "clinic-user-tenant",
      email: "tenant@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    assert.equal(await getClinicReimbursement(user, claim.reimbursementId), null);
  });

  it("clinic submits a claim for an employee chosen by employeeCode", async () => {
    const emp = await seedEmployee(TENANT_A, "CL-SUB1");
    const user = userProfile({
      clinicUserId: "clinic-user-submit",
      email: "submit@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    const claim = await createClinicReimbursement(user, "Clinic X", {
      tenantId: TENANT_A,
      clinicId: CLINIC_X,
      employeeCode: "CL-SUB1",
      amount: 120,
      description: "Therapy session",
    });

    assert.ok(claim.reimbursementId);
    assert.equal(claim.employeeId, emp.employeeId);
    assert.equal(claim.tenantId, TENANT_A);
    assert.equal(claim.clinicId, CLINIC_X);
    assert.equal(claim.clinicName, "Clinic X");
    assert.equal(claim.status, "pending");
  });

  it("clinic cannot submit for an employee outside its tenant", async () => {
    // Employee belongs to TENANT_B; clinic user is scoped to TENANT_A.
    await seedEmployee(TENANT_B, "CL-B2");
    const user = userProfile({
      clinicUserId: "clinic-user-submit-bad",
      email: "submitbad@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    await assert.rejects(
      () =>
        createClinicReimbursement(user, "Clinic X", {
          tenantId: TENANT_A,
          clinicId: CLINIC_X,
          employeeCode: "CL-B2",
          amount: 10,
          description: "Nope",
        }),
      /Employee not found/,
    );
  });
});

describe("Clinic Portal — Chat Participant", () => {
  it("clinic participant can post and read messages on a claim for its clinic", async () => {
    const emp = await seedEmployee(TENANT_A, "CL-CHAT1");
    const claim = await seedClaim(TENANT_A, emp.employeeId, CLINIC_X, "Clinic X");

    const user = userProfile({
      clinicUserId: "clinic-user-chat",
      email: "chat@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    const context = {
      tenantId: TENANT_A,
      participant: resolveClinicParticipant(user),
      clinicScope: { clinicIds: user.clinicIds, tenantIds: user.tenantIds },
    };

    const posted = await postChatMessage(context, claim.reimbursementId, "Hello from the clinic");
    assert.ok(posted);
    assert.equal(posted!.participant.role, "clinic");
    assert.equal(posted!.participant.name, "Clinic X");

    const view = await listChatMessages(context, claim.reimbursementId);
    assert.ok(view);
    const clinicMessages = view!.messages.filter((m) => m.participant.role === "clinic");
    assert.equal(clinicMessages.length, 1);
    assert.equal(clinicMessages[0]!.body, "Hello from the clinic");
  });

  it("clinic participant cannot read a claim for another clinic", async () => {
    const emp = await seedEmployee(TENANT_A, "CL-CHAT2");
    const claim = await seedClaim(TENANT_A, emp.employeeId, CLINIC_Y, "Clinic Y");

    const user = userProfile({
      clinicUserId: "clinic-user-chat-cross",
      email: "chatcross@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    const context = {
      tenantId: TENANT_A,
      participant: resolveClinicParticipant(user),
      clinicScope: { clinicIds: user.clinicIds, tenantIds: user.tenantIds },
    };

    const view = await listChatMessages(context, claim.reimbursementId);
    assert.equal(view, null);
  });

  it("clinic participant cannot read a claim for another tenant", async () => {
    const emp = await seedEmployee(TENANT_B, "CL-CHAT3");
    const claim = await seedClaim(TENANT_B, emp.employeeId, CLINIC_X, "Clinic X");

    const user = userProfile({
      clinicUserId: "clinic-user-chat-tenant",
      email: "chattenant@test.com",
      name: "Clinic X",
      clinicIds: [CLINIC_X],
      tenantIds: [TENANT_A],
    });

    const context = {
      tenantId: TENANT_A,
      participant: resolveClinicParticipant(user),
      clinicScope: { clinicIds: user.clinicIds, tenantIds: user.tenantIds },
    };

    const view = await listChatMessages(context, claim.reimbursementId);
    assert.equal(view, null);
  });
});
