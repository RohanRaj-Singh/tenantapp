import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, beforeEach } from "node:test";
import type { EmployeeDocument } from "@/src/server/db/documents";
import { getRepositoryContext } from "@/src/server/repositories/context";
import {
  loginEmployee,
  requestPasswordReset,
  resetPassword,
  hashPassword,
  PASSWORD_RESET_TTL_MS,
} from "@/src/server/services/employeeService";
import { checkRateLimit, resetRateLimiter } from "@/src/server/services/rateLimiter";

/** bcrypt hash of "OldPass1234" is generated on the fly to keep the test self-contained. */
const OLD_PASSWORD = "OldPass1234";
const NEW_PASSWORD = "NewPass5678";

/**
 * Insert a fresh, active, registered employee with a unique tenant + email so
 * each test is isolated within the shared in-memory store.
 */
async function seedActiveEmployee(): Promise<{
  tenantId: string;
  email: string;
  employeeId: string;
}> {
  const repositories = await getRepositoryContext();
  const unique = randomUUID();
  const tenantId = `tenant-test-${unique}`;
  const email = `user.${unique}@example.test`;
  const employeeId = `emp_test_${unique}`;
  const now = new Date().toISOString();

  const doc: EmployeeDocument = {
    employeeId,
    tenantId,
    employeeCode: `TC-${unique.slice(0, 8)}`,
    name: "Test User",
    email,
    status: "active",
    passwordHash: hashPassword(OLD_PASSWORD),
    mustChangePassword: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await repositories.employees.insert(doc);
  return { tenantId, email, employeeId };
}

describe("Password Reset Service (Phase D)", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("issues a single-use reset token for an active employee", async () => {
    const { tenantId, email, employeeId } = await seedActiveEmployee();
    const repositories = await getRepositoryContext();

    await requestPasswordReset(tenantId, email);

    const employee = await repositories.employees.findById(employeeId);
    assert.ok(employee, "employee should exist");
    assert.ok(employee!.passwordResetToken, "a reset token should be stored");
    assert.match(
      employee!.passwordResetToken!,
      /^[0-9a-f]{64}$/,
      "token should be 32 random bytes as hex (64 chars)",
    );
    assert.ok(
      employee!.passwordResetTokenExpiresAt,
      "an expiry timestamp should be stored",
    );

    // Expiry should be ~1 hour in the future.
    const expiresMs = new Date(employee!.passwordResetTokenExpiresAt!).getTime();
    const deltaMs = expiresMs - Date.now();
    assert.ok(
      deltaMs > PASSWORD_RESET_TTL_MS - 60_000 && deltaMs <= PASSWORD_RESET_TTL_MS + 1_000,
      `expiry should be ~1h out, got ${deltaMs}ms`,
    );
  });

  it("resets the password with a valid token and clears the token", async () => {
    const { tenantId, email, employeeId } = await seedActiveEmployee();
    const repositories = await getRepositoryContext();

    await requestPasswordReset(tenantId, email);
    const issued = await repositories.employees.findById(employeeId);
    const token = issued!.passwordResetToken!;

    const result = await resetPassword(token, NEW_PASSWORD);
    assert.equal(result.employeeId, employeeId);

    // Token cleared (single-use).
    const after = await repositories.employees.findById(employeeId);
    assert.equal(after!.passwordResetToken ?? null, null);
    assert.equal(after!.passwordResetTokenExpiresAt ?? null, null);

    // New password works, old one does not.
    const goodLogin = await loginEmployee(tenantId, email, NEW_PASSWORD);
    assert.equal(goodLogin.success, true);

    const badLogin = await loginEmployee(tenantId, email, OLD_PASSWORD);
    assert.equal(badLogin.success, false);
  });

  it("rejects a token that has already been used (single-use)", async () => {
    const { tenantId, email, employeeId } = await seedActiveEmployee();
    const repositories = await getRepositoryContext();

    await requestPasswordReset(tenantId, email);
    const issued = await repositories.employees.findById(employeeId);
    const token = issued!.passwordResetToken!;

    await resetPassword(token, NEW_PASSWORD);

    await assert.rejects(
      () => resetPassword(token, "AnotherPass9012"),
      /invalid or has expired/i,
    );
  });

  it("rejects an expired token", async () => {
    const { tenantId, email, employeeId } = await seedActiveEmployee();
    const repositories = await getRepositoryContext();

    await requestPasswordReset(tenantId, email);
    const issued = await repositories.employees.findById(employeeId);
    const token = issued!.passwordResetToken!;

    // Force the token to be expired.
    await repositories.employees.update(employeeId, {
      passwordResetTokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });

    await assert.rejects(
      () => resetPassword(token, NEW_PASSWORD),
      /invalid or has expired/i,
    );

    // The stale token should be cleared on the failed attempt.
    const after = await repositories.employees.findById(employeeId);
    assert.equal(after!.passwordResetToken ?? null, null);
  });

  it("rejects a weak new password before touching the token", async () => {
    const { tenantId, email, employeeId } = await seedActiveEmployee();
    const repositories = await getRepositoryContext();

    await requestPasswordReset(tenantId, email);
    const issued = await repositories.employees.findById(employeeId);
    const token = issued!.passwordResetToken!;

    await assert.rejects(
      () => resetPassword(token, "weak"),
      /Password must be at least 8 characters/i,
    );

    // Token untouched — user can still retry with a strong password.
    const after = await repositories.employees.findById(employeeId);
    assert.equal(after!.passwordResetToken, token);
  });

  it("rejects an unknown token", async () => {
    await assert.rejects(
      () => resetPassword("0".repeat(64), NEW_PASSWORD),
      /invalid or has expired/i,
    );
  });

  it("is a no-op for an unknown email (enumeration-safe)", async () => {
    const { tenantId } = await seedActiveEmployee();

    // Should resolve without throwing and issue no token.
    await assert.doesNotReject(() =>
      requestPasswordReset(tenantId, `missing.${randomUUID()}@example.test`),
    );
  });

  it("does not issue a token for a not-yet-registered employee", async () => {
    const repositories = await getRepositoryContext();
    const unique = randomUUID();
    const tenantId = `tenant-test-${unique}`;
    const email = `unregistered.${unique}@example.test`;
    const employeeId = `emp_test_${unique}`;
    const now = new Date().toISOString();

    await repositories.employees.insert({
      employeeId,
      tenantId,
      employeeCode: `TC-${unique.slice(0, 8)}`,
      name: null,
      email,
      status: "not_registered",
      passwordHash: null,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await requestPasswordReset(tenantId, email);

    const employee = await repositories.employees.findById(employeeId);
    assert.equal(employee!.passwordResetToken ?? null, null);
  });
});

describe("Rate Limiter (Phase D)", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows the first request and blocks a repeat within the window", () => {
    const key = `forgot-password:${randomUUID()}@example.test`;
    const windowMs = 5 * 60 * 1000;

    assert.equal(checkRateLimit(key, windowMs), true, "first request allowed");
    assert.equal(checkRateLimit(key, windowMs), false, "second request blocked");
  });

  it("allows the request again once the window has elapsed", () => {
    const key = `forgot-password:${randomUUID()}@example.test`;

    // Use a 0ms window to simulate the window having fully elapsed.
    assert.equal(checkRateLimit(key, 0), true);
    assert.equal(checkRateLimit(key, 0), true);
  });

  it("tracks distinct keys independently", () => {
    const windowMs = 5 * 60 * 1000;
    const keyA = `forgot-password:a.${randomUUID()}`;
    const keyB = `forgot-password:b.${randomUUID()}`;

    assert.equal(checkRateLimit(keyA, windowMs), true);
    assert.equal(checkRateLimit(keyB, windowMs), true, "different key not blocked");
    assert.equal(checkRateLimit(keyA, windowMs), false, "same key blocked");
  });
});
