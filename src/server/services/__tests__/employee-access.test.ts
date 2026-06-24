import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashPin,
  verifyPin,
  resetEmployeePin,
  unlockEmployee,
  getEmployeeAccessDetail,
} from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { EmployeeDocument } from "@/src/server/db/documents";

/**
 * Resolve a seeded employee from the memory store for testing.
 * Uses the known Omantel seed data from memoryRepositoryContext.ts.
 */
async function getTestEmployee(): Promise<EmployeeDocument> {
  const ctx = await getRepositoryContext();
  const result = await ctx.employees.findByTenantId("tenant-omantel");
  const emp = result.employees[0];
  if (!emp) throw new Error("No seeded employee found. Memory store may not be seeded.");
  return emp;
}

const TEST_TENANT_ID = "tenant-omantel";

// ── PIN Hashing ─────────────────────────────────────────────────────────────

describe("Employee PIN Hashing", () => {
  it("hashes a PIN and can verify it", () => {
    const pin = "123456";
    const stored = hashPin(pin);

    // Format should be "salt:hash" (both hex)
    const parts = stored.split(":");
    assert.equal(parts.length, 2);
    assert.equal(parts[0].length, 32); // 16 bytes = 32 hex chars
    assert.equal(parts[1].length, 128); // 64 bytes = 128 hex chars

    // Verify correct PIN
    assert.equal(verifyPin(stored, pin), true);

    // Verify wrong PIN fails
    assert.equal(verifyPin(stored, "wrong-pin"), false);
  });

  it("produces different hashes for the same PIN (different salts)", () => {
    const pin = "123456";
    const hash1 = hashPin(pin);
    const hash2 = hashPin(pin);

    const salt1 = hash1.split(":")[0];
    const salt2 = hash2.split(":")[0];
    assert.notEqual(salt1, salt2);

    assert.equal(verifyPin(hash1, pin), true);
    assert.equal(verifyPin(hash2, pin), true);
  });

  it("rejects malformed stored hashes", () => {
    assert.equal(verifyPin("invalid-hash", "1234"), false);
    assert.equal(verifyPin("", "1234"), false);
    assert.equal(verifyPin("salt:hash:extra", "1234"), false);
  });

  it("handles short and long PINs within the valid range", () => {
    const shortPin = "1234";
    const stored = hashPin(shortPin);
    assert.equal(verifyPin(stored, shortPin), true);

    const longPin = "a".repeat(20);
    const stored2 = hashPin(longPin);
    assert.equal(verifyPin(stored2, longPin), true);
  });
});

// ── Employee Access Management ──────────────────────────────────────────────

describe("Employee Access Management", () => {
  it("resets an employee PIN and returns the new PIN", async () => {
    const emp = await getTestEmployee();
    const result = await resetEmployeePin(TEST_TENANT_ID, emp.employeeId);

    assert.ok(result, "Expected a result from resetEmployeePin");
    assert.equal(result.employee.employeeId, emp.employeeId);
    assert.equal(result.employee.tenantId, TEST_TENANT_ID);

    // New PIN should be a 6-digit string
    assert.ok(/^\d{6}$/.test(result.newPin), `Expected 6-digit PIN, got "${result.newPin}"`);

    // Verify the new PIN is actually hashed and stored
    const ctx = await getRepositoryContext();
    const updated = await ctx.employees.findById(emp.employeeId);
    assert.ok(updated, "Expected employee to exist after reset");
    assert.equal(verifyPin(updated!.pinHash, result.newPin), true);

    // Verify failed login attempts were reset
    assert.equal(updated!.failedLoginAttempts, 0);

    // Verify lock was cleared
    assert.equal(updated!.lockedUntil, null);
  });

  it("unlocks an employee who is currently locked", async () => {
    const emp = await getTestEmployee();
    const ctx = await getRepositoryContext();

    // Manually lock the employee
    const futureLock = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await ctx.employees.update(emp.employeeId, {
      failedLoginAttempts: 5,
      lockedUntil: futureLock,
      updatedAt: new Date().toISOString(),
    });

    // Verify lock is in place
    const locked = await ctx.employees.findById(emp.employeeId);
    assert.ok(locked!.lockedUntil, "Expected employee to be locked");

    // Unlock
    const result = await unlockEmployee(TEST_TENANT_ID, emp.employeeId);
    assert.ok(result, "Expected a result from unlockEmployee");
    assert.equal(result!.employeeId, emp.employeeId);

    // Verify lock is cleared
    const updated = await ctx.employees.findById(emp.employeeId);
    assert.equal(updated!.failedLoginAttempts, 0);
    assert.equal(updated!.lockedUntil, null);
  });

  it("rejects unlocking an employee who is not locked", async () => {
    const emp = await getTestEmployee();
    const ctx = await getRepositoryContext();

    // Ensure employee is not locked
    await ctx.employees.update(emp.employeeId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    });

    await assert.rejects(
      () => unlockEmployee(TEST_TENANT_ID, emp.employeeId),
      { message: "Employee is not currently locked." },
    );
  });

  it("rejects resetting PIN for an inactive employee", async () => {
    const emp = await getTestEmployee();
    const ctx = await getRepositoryContext();

    // Set employee to inactive
    await ctx.employees.update(emp.employeeId, {
      status: "inactive",
      updatedAt: new Date().toISOString(),
    });

    try {
      await resetEmployeePin(TEST_TENANT_ID, emp.employeeId);
      assert.fail("Expected error for inactive employee");
    } catch (err) {
      assert.equal((err as Error).message, "Cannot reset PIN for an inactive employee.");
    }

    // Restore to active
    await ctx.employees.update(emp.employeeId, {
      status: "active",
      updatedAt: new Date().toISOString(),
    });
  });

  it("returns null for non-existent employee", async () => {
    const result = await resetEmployeePin(TEST_TENANT_ID, "emp_nonexistent");
    assert.equal(result, null);

    const unlockResult = await unlockEmployee(TEST_TENANT_ID, "emp_nonexistent");
    assert.equal(unlockResult, null);
  });

  it("returns access detail without pinHash", async () => {
    const emp = await getTestEmployee();
    const detail = await getEmployeeAccessDetail(emp.employeeId, TEST_TENANT_ID);

    assert.ok(detail, "Expected access detail");
    assert.equal(detail!.employeeId, emp.employeeId);
    assert.equal(detail!.tenantId, TEST_TENANT_ID);

    // Should have access fields
    assert.ok("failedLoginAttempts" in detail!);
    assert.ok("lockedUntil" in detail!);
    assert.ok("lastAccessAt" in detail!);

    // Should NOT have pinHash
    assert.ok(!("pinHash" in detail!));
  });

  it("returns null for tenant mismatch on access detail", async () => {
    const emp = await getTestEmployee();
    const detail = await getEmployeeAccessDetail(emp.employeeId, "tenant-oq");
    assert.equal(detail, null);
  });
});

// ── Audit Event Recording ──────────────────────────────────────────────────

describe("Employee Audit Events", () => {
  it("records an audit event on PIN reset", async () => {
    const emp = await getTestEmployee();
    await resetEmployeePin(TEST_TENANT_ID, emp.employeeId, "test-admin");

    // Check the most recent pin_reset event for this employee
    const events = getMemoryStore().auditEvents;
    const pinResetEvents = events
      .filter((e) => e.action === "pin_reset" && e.employeeId === emp.employeeId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    assert.ok(pinResetEvents.length >= 1, "Expected at least one pin_reset audit event");
    assert.equal(pinResetEvents[0]!.performedBy, "test-admin");
  });

  it("records an audit event on employee unlock", async () => {
    const emp = await getTestEmployee();
    const ctx = await getRepositoryContext();

    // Lock the employee first
    await ctx.employees.update(emp.employeeId, {
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await unlockEmployee(TEST_TENANT_ID, emp.employeeId, "test-admin");

    // Check the most recent employee_unlock event for this employee
    const events = getMemoryStore().auditEvents;
    const unlockEvents = events
      .filter((e) => e.action === "employee_unlock" && e.employeeId === emp.employeeId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    assert.ok(unlockEvents.length >= 1, "Expected at least one employee_unlock audit event");
    assert.equal(unlockEvents[0]!.performedBy, "test-admin");
  });
});

// Helper to access the global memory store for audit assertions
function getMemoryStore() {
  const g = globalThis as { __remedygccMemoryStore__?: { auditEvents: unknown[] } };
  if (!g.__remedygccMemoryStore__) throw new Error("Memory store not initialized");
  return g.__remedygccMemoryStore__;
}
