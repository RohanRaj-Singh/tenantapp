import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  loginEmployee,
  changePassword,
  unlockEmployee,
  resetEmployeePassword,
  getEmployeeAccessDetail,
  createEmployee,
  registerEmployee,
  disableEmployee,
  suspendEmployee,
  MAX_LOGIN_ATTEMPTS,
} from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { AuditEventDocument, EmployeeDocument } from "@/src/server/db/documents";

const OMT_TENANT = "tenant-omantel";
const OQ_TENANT = "tenant-oq";
const KNOWN_PASSWORD = "Password123";

/**
 * Resolve a seeded ACTIVE employee from Omantel (OMT-001) by employee code.
 * The findByTenantId method sorts by name, and unregistered employees have
 * name=null which sorts first — so we look up by code instead.
 * Read-only — do not mutate unless you restore state afterward.
 */
async function getTestEmployee(): Promise<EmployeeDocument> {
  const ctx = await getRepositoryContext();
  const emp = await ctx.employees.findByEmployeeCode(OMT_TENANT, "OMT-001");
  if (!emp) throw new Error("Seeded employee OMT-001 not found. Memory store may not be seeded.");
  return emp;
}

function getMemoryStore() {
  const g = globalThis as {
    __remedygccMemoryStore__?: { auditEvents: AuditEventDocument[]; employees: Map<string, EmployeeDocument> };
  };
  if (!g.__remedygccMemoryStore__) throw new Error("Memory store not initialized");
  return g.__remedygccMemoryStore__;
}

// ── Password Hashing ─────────────────────────────────────────────────────────

describe("Password Hashing", () => {
  it("hashPassword produces a valid bcrypt hash", () => {
    const hash = hashPassword("MyPassword123");
    assert.ok(hash.startsWith("$2b$"), `Expected bcrypt hash to start with $2b$, got ${hash}`);
    assert.equal(hash.length, 60, `Expected bcrypt hash to be 60 characters, got ${hash.length}`);
  });

  it("verifyPassword matches correct password", () => {
    const hash = hashPassword("TestPass789");
    assert.equal(verifyPassword("TestPass789", hash), true);
  });

  it("verifyPassword rejects wrong password", () => {
    const hash = hashPassword("TestPass789");
    assert.equal(verifyPassword("WrongPass1", hash), false);
  });

  it("produces different hashes for the same password (different salts)", () => {
    const pw = "Consistent1";
    const h1 = hashPassword(pw);
    const h2 = hashPassword(pw);
    assert.notEqual(h1, h2, "bcrypt should use different salts");
    assert.equal(verifyPassword(pw, h1), true);
    assert.equal(verifyPassword(pw, h2), true);
  });
});

// ── Password Strength ─────────────────────────────────────────────────────────

describe("validatePasswordStrength", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const err = validatePasswordStrength("Ab1");
    assert.ok(err !== null, "Expected error for short password");
  });

  it("rejects password with no uppercase letter", () => {
    const err = validatePasswordStrength("abcdefgh1");
    assert.ok(err !== null, "Expected error for missing uppercase");
  });

  it("rejects password with no lowercase letter", () => {
    const err = validatePasswordStrength("ABCDEFG1");
    assert.ok(err !== null, "Expected error for missing lowercase");
  });

  it("rejects password with no digit", () => {
    const err = validatePasswordStrength("Abcdefgh");
    assert.ok(err !== null, "Expected error for missing digit");
  });

  it("accepts a valid password meeting all criteria", () => {
    assert.equal(validatePasswordStrength("Password1"), null);
    assert.equal(validatePasswordStrength("MyStr0ng!"), null);
    assert.equal(validatePasswordStrength("aB3defgh"), null);
    assert.equal(validatePasswordStrength("LongEnough1"), null);
  });

  it("rejects null, undefined, number, and empty string", () => {
    assert.ok(validatePasswordStrength(null) !== null);
    assert.ok(validatePasswordStrength(undefined) !== null);
    assert.ok(validatePasswordStrength(12345) !== null);
    assert.ok(validatePasswordStrength("") !== null);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe("loginEmployee", () => {
  it("succeeds with valid tenantId + email + password", async () => {
    const emp = await getTestEmployee();
    const result = await loginEmployee(OMT_TENANT, emp.email, KNOWN_PASSWORD);
    assert.ok(result.success, `Expected successful login, got errorCode=${result.errorCode}`);
    assert.ok(result.employee, "Expected employee in result");
    assert.equal(result.employee!.employeeId, emp.employeeId);
    assert.equal(result.employee!.email, emp.email);
    assert.ok(!("passwordHash" in result.employee!), "passwordHash must not be in response");
  });

  it("returns NOT_REGISTERED for a not_registered employee", async () => {
    const result = await loginEmployee(OMT_TENANT, "new.employee@omantel.om", "SomePass1");
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "NOT_REGISTERED");
  });

  it("returns INVALID_PASSWORD for wrong password", async () => {
    const emp = await getTestEmployee();
    const result = await loginEmployee(OMT_TENANT, emp.email, "WrongPassword99");
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "INVALID_PASSWORD");
  });

  it("returns EMPLOYEE_INACTIVE for an inactive employee", async () => {
    const subTenant = "tenant-test-inactive-login";
    const created = await createEmployee(subTenant, {
      employeeCode: "INACTIVE-LOGIN",
      email: "inact-login@test.com",
    });
    await registerEmployee(subTenant, "INACTIVE-LOGIN", "inact-login@test.com", "TempPass1", "Inactive Login");
    await disableEmployee(subTenant, created.employeeId);

    const result = await loginEmployee(subTenant, "inact-login@test.com", "TempPass1");
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "EMPLOYEE_INACTIVE");
  });

  it("returns EMPLOYEE_SUSPENDED for a suspended employee", async () => {
    const subTenant = "tenant-test-suspended-login";
    const created = await createEmployee(subTenant, {
      employeeCode: "SUSPEND-LOGIN",
      email: "suspend-login@test.com",
    });
    await registerEmployee(subTenant, "SUSPEND-LOGIN", "suspend-login@test.com", "TempPass1", "Suspended Login");
    await suspendEmployee(subTenant, created.employeeId);

    const result = await loginEmployee(subTenant, "suspend-login@test.com", "TempPass1");
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "EMPLOYEE_SUSPENDED");
  });

  it("returns mustChangePassword flag when the employee has mustChangePassword=true", async () => {
    const emp = await getTestEmployee();
    const resetResult = await resetEmployeePassword(OMT_TENANT, emp.employeeId, "test-admin");
    assert.ok(resetResult, "Password reset should succeed");

    const result = await loginEmployee(OMT_TENANT, emp.email, resetResult!.temporaryPassword);
    assert.ok(result.success, "Login with temp password should succeed");
    assert.equal(result.mustChangePassword, true, "mustChangePassword should be true after reset");

    // Restore the employee's password and flag
    const ctx = await getRepositoryContext();
    await ctx.employees.update(emp.employeeId, {
      passwordHash: hashPassword(KNOWN_PASSWORD),
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    });
  });

  it("locks the employee after MAX_LOGIN_ATTEMPTS failed attempts", async () => {
    const subTenant = "tenant-test-lockout";
    const created = await createEmployee(subTenant, {
      employeeCode: "LOCKOUT-TEST",
      email: "lockout@test.com",
    });
    await registerEmployee(subTenant, "LOCKOUT-TEST", "lockout@test.com", "TempPass1", "Lockout Test");

    // Attempt login with wrong password MAX_LOGIN_ATTEMPTS times
    let lastResult;
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      lastResult = await loginEmployee(subTenant, "lockout@test.com", "WrongPass99");
    }

    assert.equal(lastResult!.success, false);
    assert.equal(lastResult!.errorCode, "EMPLOYEE_LOCKED");
    assert.ok(lastResult!.lockedUntil, "lockedUntil should be set");
  });

  it("resets failedLoginAttempts on successful login", async () => {
    const subTenant = "tenant-test-reset-attempts";
    const created = await createEmployee(subTenant, {
      employeeCode: "RESET-ATTEMPTS",
      email: "reset-attempts@test.com",
    });
    await registerEmployee(subTenant, "RESET-ATTEMPTS", "reset-attempts@test.com", "TempPass1", "Reset Attempts");

    // Fail login once
    await loginEmployee(subTenant, "reset-attempts@test.com", "WrongPass1");

    // Now succeed
    const result = await loginEmployee(subTenant, "reset-attempts@test.com", "TempPass1");
    assert.ok(result.success, "Login should succeed");

    // Verify failed attempts reset
    const ctx = await getRepositoryContext();
    const emp = await ctx.employees.findByEmployeeCode(subTenant, "RESET-ATTEMPTS");
    assert.equal(emp!.failedLoginAttempts, 0, "Failed attempts should reset on success");
  });
});

// ── Password Change ──────────────────────────────────────────────────────────

describe("changePassword", () => {
  it("successfully changes password with correct current password", async () => {
    const subTenant = "tenant-test-pw-change";
    const created = await createEmployee(subTenant, {
      employeeCode: "PW-CHANGE",
      email: "pw-change@test.com",
    });
    await registerEmployee(subTenant, "PW-CHANGE", "pw-change@test.com", "TempPass1", "PW Change");

    const result = await changePassword(created.employeeId, "TempPass1", "NewPass123");
    assert.ok(result, "Change password should succeed");
    assert.equal(result.employeeId, created.employeeId);
  });

  it("rejects wrong current password", async () => {
    const subTenant = "tenant-test-pw-wrong";
    const created = await createEmployee(subTenant, {
      employeeCode: "PW-WRONG",
      email: "pw-wrong@test.com",
    });
    await registerEmployee(subTenant, "PW-WRONG", "pw-wrong@test.com", "TempPass1", "PW Wrong");

    await assert.rejects(
      () => changePassword(created.employeeId, "WrongPass1", "NewPass123"),
      { message: "Current password is incorrect." },
    );
  });

  it("rejects weak new password", async () => {
    const subTenant = "tenant-test-pw-weak";
    const created = await createEmployee(subTenant, {
      employeeCode: "PW-WEAK",
      email: "pw-weak@test.com",
    });
    await registerEmployee(subTenant, "PW-WEAK", "pw-weak@test.com", "TempPass1", "PW Weak");

    await assert.rejects(
      () => changePassword(created.employeeId, "TempPass1", "short"),
      (err: Error) => {
        assert.ok(err.message.includes("Password must"), `Expected password error, got: ${err.message}`);
        return true;
      },
    );
  });

  it("clears mustChangePassword flag", async () => {
    const subTenant = "tenant-test-pw-clear-flag";
    const created = await createEmployee(subTenant, {
      employeeCode: "PW-CLEAR",
      email: "pw-clear@test.com",
    });
    await registerEmployee(subTenant, "PW-CLEAR", "pw-clear@test.com", "TempPass1", "PW Clear");

    // Force mustChangePassword to true via Super Admin reset
    const resetResult = await resetEmployeePassword(subTenant, created.employeeId, "test-admin");
    assert.ok(resetResult, "Reset should succeed");

    // Change password
    await changePassword(created.employeeId, resetResult!.temporaryPassword, "NewPass123");

    // Verify flag is cleared
    const ctx = await getRepositoryContext();
    const emp = await ctx.employees.findById(created.employeeId);
    assert.equal(emp!.mustChangePassword, false, "mustChangePassword should be false after change");
  });

  it("resets failedLoginAttempts after password change", async () => {
    const subTenant = "tenant-test-pw-reset-attempts";
    const created = await createEmployee(subTenant, {
      employeeCode: "PW-RESET-ATT",
      email: "pw-reset-att@test.com",
    });
    await registerEmployee(subTenant, "PW-RESET-ATT", "pw-reset-att@test.com", "TempPass1", "PW Reset");

    // Increment failed attempts
    await loginEmployee(subTenant, "pw-reset-att@test.com", "WrongPass1");

    // Change password
    await changePassword(created.employeeId, "TempPass1", "NewPass123");

    // Verify attempts reset
    const ctx = await getRepositoryContext();
    const emp = await ctx.employees.findById(created.employeeId);
    assert.equal(emp!.failedLoginAttempts, 0, "failedLoginAttempts should reset after password change");
  });

  it("new password works for login after change", async () => {
    const subTenant = "tenant-test-pw-new-works";
    const created = await createEmployee(subTenant, {
      employeeCode: "PW-NEW-WORKS",
      email: "pw-newworks@test.com",
    });
    await registerEmployee(subTenant, "PW-NEW-WORKS", "pw-newworks@test.com", "TempPass1", "PW New Works");

    await changePassword(created.employeeId, "TempPass1", "NewPass123");

    // New password should work
    const result = await loginEmployee(subTenant, "pw-newworks@test.com", "NewPass123");
    assert.ok(result.success, "Login with new password should succeed");

    // Old password should fail
    const oldResult = await loginEmployee(subTenant, "pw-newworks@test.com", "TempPass1");
    assert.equal(oldResult.success, false, "Old password should not work");
  });
});

// ── Access Management ──────────────────────────────────────────────────────────

describe("Employee Access Management", () => {
  it("unlocks a locked employee", async () => {
    const subTenant = "tenant-test-unlock";
    const created = await createEmployee(subTenant, {
      employeeCode: "UNLOCK-TEST",
      email: "unlock@test.com",
    });
    await registerEmployee(subTenant, "UNLOCK-TEST", "unlock@test.com", "TempPass1", "Unlock Test");
    const ctx = await getRepositoryContext();

    // Lock the employee manually
    await ctx.employees.update(created.employeeId, {
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await unlockEmployee(subTenant, created.employeeId);
    assert.ok(result, "Unlock should succeed");
    assert.equal(result!.employeeId, created.employeeId);

    // Verify lock cleared
    const updated = await ctx.employees.findById(created.employeeId);
    assert.equal(updated!.failedLoginAttempts, 0);
    assert.equal(updated!.lockedUntil, null);
  });

  it("rejects unlocking an employee who is not locked", async () => {
    const emp = await getTestEmployee();
    const ctx = await getRepositoryContext();

    // Ensure not locked
    await ctx.employees.update(emp.employeeId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    });

    await assert.rejects(
      () => unlockEmployee(OMT_TENANT, emp.employeeId),
      { message: "Employee is not currently locked." },
    );
  });

  it("returns null for non-existent employee on unlock", async () => {
    const result = await unlockEmployee(OMT_TENANT, "emp_nonexistent");
    assert.equal(result, null);
  });

  it("returns access detail without passwordHash", async () => {
    const emp = await getTestEmployee();
    const detail = await getEmployeeAccessDetail(emp.employeeId, OMT_TENANT);

    assert.ok(detail, "Expected access detail");
    assert.equal(detail!.employeeId, emp.employeeId);
    assert.ok("failedLoginAttempts" in detail!);
    assert.ok("lockedUntil" in detail!);
    assert.ok("lastAccessAt" in detail!);
    assert.ok(!("passwordHash" in detail!));
  });

  it("returns null for tenant mismatch on access detail", async () => {
    const emp = await getTestEmployee();
    const detail = await getEmployeeAccessDetail(emp.employeeId, OQ_TENANT);
    assert.equal(detail, null);
  });
});

// ── Audit Events ──────────────────────────────────────────────────────────────

describe("Employee Audit Events", () => {
  it("records an audit event on password reset", async () => {
    const emp = await getTestEmployee();
    await resetEmployeePassword(OMT_TENANT, emp.employeeId, "super-admin-001");

    const events = getMemoryStore().auditEvents;
    const pwResetEvents = events.filter(
      (e) => e.action === "password_reset" && e.employeeId === emp.employeeId && e.performedBy === "super-admin-001",
    );

    assert.ok(pwResetEvents.length >= 1, "Expected at least one password_reset audit event");
  });

  it("records an audit event on employee unlock", async () => {
    const subTenant = "tenant-audit-unlock";
    const created = await createEmployee(subTenant, {
      employeeCode: "AUD-UNLOCK",
      email: "audit-unlock@test.com",
    });
    await registerEmployee(subTenant, "AUD-UNLOCK", "audit-unlock@test.com", "TempPass1", "Audit Unlock");
    const ctx = await getRepositoryContext();

    // Lock employee
    await ctx.employees.update(created.employeeId, {
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await unlockEmployee(subTenant, created.employeeId, "super-admin-001");

    const events = getMemoryStore().auditEvents;
    const unlockEvents = events.filter(
      (e) => e.action === "employee_unlock" && e.employeeId === created.employeeId,
    );

    assert.ok(unlockEvents.length >= 1, "Expected at least one employee_unlock audit event");
  });

  it("records an audit event on password change", async () => {
    const subTenant = "tenant-audit-pwchange";
    const created = await createEmployee(subTenant, {
      employeeCode: "AUD-PWCHANGE",
      email: "audit-pwchange@test.com",
    });
    await registerEmployee(subTenant, "AUD-PWCHANGE", "audit-pwchange@test.com", "TempPass1", "Audit PW Change");

    const beforeCount = getMemoryStore().auditEvents.length;

    await changePassword(created.employeeId, "TempPass1", "NewPass123");

    const events = getMemoryStore().auditEvents;
    const pwChangeEvents = events.filter(
      (e) => e.action === "password_changed" && e.employeeId === created.employeeId,
    );

    assert.ok(pwChangeEvents.length >= 1, "Expected at least one password_changed audit event");
  });
});
