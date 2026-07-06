import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { AuditEventDocument, EmployeeDocument } from "@/src/server/db/documents";
import type {
  FindEmployeesOptions,
  FindEmployeesResult,
} from "@/src/server/repositories/contracts";

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum consecutive failed login attempts before lockout. */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Duration (in minutes) an employee is locked out after exceeding max attempts. */
export const LOCKOUT_MINUTES = 15;

/** Minimum PIN length after trimming whitespace. */
export const MIN_PIN_LENGTH = 4;

// ── PIN Hashing (Node.js crypto.scryptSync) ──────────────────────────────────

/** Length (bytes) of the scrypt derived key. */
const KEY_LENGTH = 64;

/**
 * Hash a plain-text PIN using scrypt with a random salt.
 * Returns `salt:hash` (both hex) for storage.
 *
 * Note: callers should trim whitespace via normalizePin() before hashing.
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

// ── PIN Validation & Normalization ───────────────────────────────────────────

/**
 * Normalize a PIN by trimming whitespace.
 * Used consistently across create, update, reset, and login flows.
 */
export function normalizePin(pin: string): string {
  return pin.trim();
}

/**
 * Validate a PIN meets server-side requirements.
 * Returns an error message string, or null if valid.
 */
export function validatePin(pin: unknown): string | null {
  if (typeof pin !== "string" || !pin) {
    return "PIN is required.";
  }
  const trimmed = pin.trim();
  if (trimmed.length < MIN_PIN_LENGTH) {
    return `PIN must be at least ${MIN_PIN_LENGTH} characters.`;
  }
  return null;
}

// ── Authentication Logging ───────────────────────────────────────────────────

function logAuthEvent(event: string, detail?: Record<string, unknown>) {
  const prefix = "[AUTH]";
  const timestamp = new Date().toISOString();
  const parts = detail
    ? Object.entries(detail).map(([k, v]) => `${k}=${v}`)
    : [];
  console.log(`${timestamp} ${prefix} ${event}${parts.length ? " " + parts.join(" ") : ""}`);
}

/**
 * Verify a plain-text PIN against a stored `salt:hash` string.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyPin(stored: string, pin: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;

  const [salt, hash] = parts;
  if (!salt || !hash) return false;

  const derived = scryptSync(pin, salt, KEY_LENGTH).toString("hex");
  const derivedBuf = Buffer.from(derived, "hex");
  const hashBuf = Buffer.from(hash, "hex");

  if (derivedBuf.length !== hashBuf.length) return false;

  return timingSafeEqual(derivedBuf, hashBuf);
}

// ── Types ────────────────────────────────────────────────────────────────────

/** Employee profile returned to clients — never includes pinHash. */
export interface SafeEmployee {
  employeeId: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  lastAccessAt: string | null;
}

export type LoginErrorCode =
  | "TENANT_NOT_FOUND"
  | "EMPLOYEE_NOT_FOUND"
  | "EMPLOYEE_INACTIVE"
  | "EMPLOYEE_LOCKED"
  | "INVALID_PIN";

export interface LoginResult {
  success: boolean;
  employee?: SafeEmployee;
  error?: string;
  errorCode?: LoginErrorCode;
  lockedUntil?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toSafeEmployee(employee: EmployeeDocument): SafeEmployee {
  return {
    employeeId: employee.employeeId,
    tenantId: employee.tenantId,
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    lastAccessAt: employee.lastAccessAt,
  };
}

// ── Existing Public API ──────────────────────────────────────────────────────

/** Employee document returned to clients — never includes pinHash. */
export type SafeEmployeeDocument = Omit<EmployeeDocument, "pinHash">;

export async function listEmployees(
  tenantId: string,
  options?: FindEmployeesOptions,
): Promise<{ employees: SafeEmployeeDocument[]; total: number }> {
  const repositories = await getRepositoryContext();
  const result = await repositories.employees.findByTenantId(tenantId, options);

  // Strip pinHash from every employee before returning to clients
  const safeEmployees: SafeEmployeeDocument[] = result.employees.map(
    ({ pinHash: _pinHash, ...safe }) => safe,
  );

  return { employees: safeEmployees, total: result.total };
}

export async function getEmployee(
  tenantId: string,
  employeeId: string,
) {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee || employee.tenantId !== tenantId) {
    return null;
  }

  return employee;
}

export async function createEmployee(
  tenantId: string,
  data: {
    employeeCode: string;
    name: string;
    email: string;
    pin: string;
  },
) {
  const pinError = validatePin(data.pin);
  if (pinError) {
    throw new Error(pinError);
  }

  const now = new Date().toISOString();
  const employee: EmployeeDocument = {
    employeeId: `emp_${randomUUID()}`,
    tenantId,
    employeeCode: data.employeeCode.trim(),
    name: data.name.trim(),
    email: data.email.trim(),
    status: "active",
    pinHash: hashPin(normalizePin(data.pin)),
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.employees.insert(employee);

  return employee;
}

export async function updateEmployee(
  tenantId: string,
  employeeId: string,
  data: {
    employeeCode?: string;
    name?: string;
    email?: string;
    status?: "active" | "inactive";
  },
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const updates: Partial<EmployeeDocument> = {};
  if (data.employeeCode !== undefined) updates.employeeCode = data.employeeCode.trim();
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.email !== undefined) updates.email = data.email.trim();
  if (data.status !== undefined) updates.status = data.status;
  updates.updatedAt = new Date().toISOString();

  return repositories.employees.update(employeeId, updates);
}

export async function disableEmployee(
  tenantId: string,
  employeeId: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  return repositories.employees.update(employeeId, {
    status: "inactive",
    updatedAt: new Date().toISOString(),
  });
}

// ── Employee Auth ────────────────────────────────────────────────────────────

/**
 * Authenticate an employee using employeeCode + PIN.
 *
 * Handles lockout state, tracks failed attempts, and resets on success.
 * Returns a SafeEmployee (no pinHash) on success.
 */
export async function loginEmployee(
  tenantId: string,
  employeeCode: string,
  pin: string,
): Promise<LoginResult> {
  const repositories = await getRepositoryContext();

  // 1. Find employee by tenantId + employeeCode
  const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode);
  if (!employee) {
    logAuthEvent("LOGIN_FAIL", { tenantId, reason: "employee_not_found" });
    return {
      success: false,
      error: "Invalid employee ID or PIN.",
      errorCode: "INVALID_PIN",
    };
  }

  // 2. Check employee status
  if (employee.status !== "active") {
    logAuthEvent("LOGIN_BLOCKED", { tenantId, employeeId: employee.employeeId, reason: "inactive", status: employee.status });
    return {
      success: false,
      error: "Your account is not active. Please contact your administrator.",
      errorCode: "EMPLOYEE_INACTIVE",
    };
  }

  // 3. Check lockout
  const now = new Date();
  if (employee.lockedUntil) {
    const lockedUntil = new Date(employee.lockedUntil);
    if (lockedUntil > now) {
      logAuthEvent("LOGIN_BLOCKED", { tenantId, employeeId: employee.employeeId, reason: "locked", lockedUntil: employee.lockedUntil });
      return {
        success: false,
        error: `Too many failed attempts. Please try again later.`,
        errorCode: "EMPLOYEE_LOCKED",
        lockedUntil: employee.lockedUntil,
      };
    }

    // Lockout expired — reset
    await repositories.employees.update(employee.employeeId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now.toISOString(),
    });
    employee.failedLoginAttempts = 0;
    employee.lockedUntil = null;
  }

  // 4. Verify PIN (normalize before comparison)
  const normalizedPin = normalizePin(pin);
  const pinValid = verifyPin(employee.pinHash, normalizedPin);

  if (!pinValid) {
    const newAttempts = employee.failedLoginAttempts + 1;
    const updates: Partial<EmployeeDocument> = {
      failedLoginAttempts: newAttempts,
      updatedAt: now.toISOString(),
    };

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      updates.lockedUntil = lockedUntil;

      await repositories.employees.update(employee.employeeId, updates);

      logAuthEvent("LOGIN_LOCKED", { tenantId, employeeId: employee.employeeId, attempts: newAttempts, lockedUntil });

      return {
        success: false,
        error: "Too many failed attempts. Your access has been locked for 15 minutes.",
        errorCode: "EMPLOYEE_LOCKED",
        lockedUntil,
      };
    }

    await repositories.employees.update(employee.employeeId, updates);

    logAuthEvent("LOGIN_FAIL", { tenantId, employeeId: employee.employeeId, attempts: newAttempts });
    return {
      success: false,
      error: "Invalid employee ID or PIN.",
      errorCode: "INVALID_PIN",
    };
  }

  // 5. Success — reset attempts and update last access
  await repositories.employees.update(employee.employeeId, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastAccessAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  // Fetch fresh employee data after updates
  const fresh = await repositories.employees.findById(employee.employeeId);

  logAuthEvent("LOGIN_OK", { tenantId, employeeId: employee.employeeId });

  return {
    success: true,
    employee: toSafeEmployee(fresh ?? employee),
  };
}

/**
 * Generate a new random 6-digit PIN, hash and store it, reset lockout state.
 * Returns the employee (safe) and the plain-text new PIN.
 */
/**
 * Update an employee's PIN through the single authoritative path.
 * Validates, normalizes, hashes, persists, and records audit.
 *
 * This is the ONLY place PIN hashes should be written (outside login/reset).
 */
export async function updateEmployeePin(
  tenantId: string,
  employeeId: string,
  pin: string,
  performedBy?: string,
  auditAction: AuditEventDocument["action"] = "pin_reset",
): Promise<SafeEmployee | null> {
  const pinError = validatePin(pin);
  if (pinError) {
    throw new Error(pinError);
  }

  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  if (existing.status === "inactive") {
    throw new Error("Cannot update PIN for an inactive employee.");
  }

  const now = new Date().toISOString();
  const normalizedPin = normalizePin(pin);

  const updated = await repositories.employees.update(employeeId, {
    pinHash: hashPin(normalizedPin),
    failedLoginAttempts: 0,
    lockedUntil: null,
    updatedAt: now,
  });

  if (!updated) return null;

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: auditAction,
    employeeId,
    tenantId,
    performedBy,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  return toSafeEmployee(updated);
}

export async function resetEmployeePin(
  tenantId: string,
  employeeId: string,
  performedBy?: string,
): Promise<{ employee: SafeEmployee; newPin: string } | null> {
  const newPin = Math.floor(100000 + Math.random() * 900000).toString();

  const safe = await updateEmployeePin(tenantId, employeeId, newPin, performedBy, "pin_reset");
  if (!safe) return null;

  return { employee: safe, newPin };
}

/**
 * Unlock an employee by resetting failed login attempts and clearing lockout.
 * Returns null if not found, throws if employee is not currently locked.
 */
export async function unlockEmployee(
  tenantId: string,
  employeeId: string,
  performedBy?: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  // Validate employee is actually locked
  if (!existing.lockedUntil) {
    throw new Error("Employee is not currently locked.");
  }

  const lockedUntil = new Date(existing.lockedUntil);
  if (lockedUntil <= new Date()) {
    throw new Error("Employee lock has already expired. They can try logging in again.");
  }

  const now = new Date().toISOString();
  const updated = await repositories.employees.update(employeeId, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    updatedAt: now,
  });

  if (!updated) return null;

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: "employee_unlock",
    employeeId,
    tenantId,
    performedBy,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  return toSafeEmployee(updated);
}

/**
 * Get employee detail with access info — includes failedLoginAttempts and
 * lockedUntil but never exposes pinHash.
 */
export async function getEmployeeAccessDetail(
  employeeId: string,
  tenantId: string,
): Promise<(SafeEmployee & { failedLoginAttempts: number; lockedUntil: string | null }) | null> {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee || employee.tenantId !== tenantId) {
    return null;
  }

  return {
    ...toSafeEmployee(employee),
    failedLoginAttempts: employee.failedLoginAttempts,
    lockedUntil: employee.lockedUntil,
  };
}

/**
 * Get a safe employee profile (no pinHash) by employeeId + tenantId.
 * Returns null if not found or tenant mismatch.
 */
export async function getSafeEmployee(
  employeeId: string,
  tenantId: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee || employee.tenantId !== tenantId) {
    return null;
  }

  return toSafeEmployee(employee);
}
