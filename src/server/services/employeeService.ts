import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { AuditEventDocument, EmployeeDocument, EmployeeStatus } from "@/src/server/db/documents";
import type {
  FindEmployeesOptions,
} from "@/src/server/repositories/contracts";
import { completeInvitation } from "@/src/server/services/invitationService";

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum consecutive failed login attempts before lockout. */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Duration (in minutes) an employee is locked out after exceeding max attempts. */
export const LOCKOUT_MINUTES = 15;

/** Minimum password length. */
export const MIN_PASSWORD_LENGTH = 8;

// ── Types ────────────────────────────────────────────────────────────────────

export type CallerRole = "super_admin" | "tenant_admin";

/** Employee profile returned to clients — never includes passwordHash. */
export interface SafeEmployee {
  employeeId: string;
  tenantId: string;
  employeeCode: string;
  name: string | null;
  email: string;
  status: EmployeeStatus;
  phoneNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LoginErrorCode =
  | "TENANT_NOT_FOUND"
  | "EMPLOYEE_NOT_FOUND"
  | "NOT_REGISTERED"
  | "EMPLOYEE_INACTIVE"
  | "EMPLOYEE_SUSPENDED"
  | "EMPLOYEE_LOCKED"
  | "INVALID_PASSWORD";

export interface LoginResult {
  success: boolean;
  employee?: SafeEmployee;
  mustChangePassword?: boolean;
  error?: string;
  errorCode?: LoginErrorCode;
  lockedUntil?: string | null;
}

// ── Shared API Contracts (DTOs) ──────────────────────────────────────────────

export interface CreateEmployeeRequest {
  employeeCode: string;
  email: string;
}

export interface CreateEmployeeResponse {
  employeeId: string;
  employeeCode: string;
  email: string;
  status: "not_registered";
  createdAt: string;
}

export interface EmployeeListItem {
  employeeId: string;
  employeeCode: string;
  email: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListEmployeesResponse {
  employees: EmployeeListItem[];
  total: number;
}

export interface RegisterEmployeeRequest {
  tenantSlug: string;
  employeeCode: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface RegisterEmployeeResponse {
  success: true;
  employee: SafeEmployee;
}

export interface LoginRequest {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  employee: SafeEmployee;
  mustChangePassword?: boolean;
}

export interface ChangePasswordRequest {
  employeeId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: true;
  employee: SafeEmployee;
}

export interface SuperAdminEmployeeListItem {
  employeeId: string;
  employeeCode: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  status: EmployeeStatus;
  tenantId: string;
  tenantName?: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastAccessAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
  mustChangePassword: true;
}

export interface SuperAdminActionResponse {
  success: true;
  employee: SuperAdminEmployeeListItem;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode: string;
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

// ── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a plain-text password using bcrypt with salt rounds 12.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Verify a plain-text password against a stored bcrypt hash.
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Validate password strength.
 * Returns an error message string, or null if valid.
 *
 * Rules:
 * - Must be a string
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 */
export function validatePasswordStrength(password: unknown): string | null {
  if (typeof password !== "string" || !password) {
    return "Password is required.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "Password must be at least 8 characters with uppercase, lowercase, and a digit.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must be at least 8 characters with uppercase, lowercase, and a digit.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must be at least 8 characters with uppercase, lowercase, and a digit.";
  }
  if (!/\d/.test(password)) {
    return "Password must be at least 8 characters with uppercase, lowercase, and a digit.";
  }
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Employee document returned to clients — never includes passwordHash. */
export type SafeEmployeeDocument = Omit<EmployeeDocument, "passwordHash">;

function toSafeEmployee(employee: EmployeeDocument): SafeEmployee {
  return {
    employeeId: employee.employeeId,
    tenantId: employee.tenantId,
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    status: employee.status,
    phoneNumber: employee.phoneNumber,
    bankAccountNumber: employee.bankAccountNumber,
    bankName: employee.bankName,
    mustChangePassword: employee.mustChangePassword,
    failedLoginAttempts: employee.failedLoginAttempts,
    lockedUntil: employee.lockedUntil,
    lastAccessAt: employee.lastAccessAt,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

/**
 * Strip sensitive fields from a SafeEmployee for Tenant Admin callers.
 * Returns a partial employee with only: employeeId, employeeCode, email, status, createdAt, updatedAt.
 */
function toSafeEmployeeListItem(employee: SafeEmployee): EmployeeListItem {
  return {
    employeeId: employee.employeeId,
    employeeCode: employee.employeeCode,
    email: employee.email,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

// ── Employee CRUD ────────────────────────────────────────────────────────────

export async function listEmployees(
  tenantId: string,
  options?: FindEmployeesOptions,
  callerRole: CallerRole = "tenant_admin",
): Promise<{ employees: SafeEmployee[]; total: number }> {
  const repositories = await getRepositoryContext();
  const result = await repositories.employees.findByTenantId(tenantId, options);

  const safeEmployees: SafeEmployee[] = result.employees.map(toSafeEmployee);

  if (callerRole === "tenant_admin") {
    // Strip sensitive fields for Tenant Admin
    const filtered = safeEmployees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      email: emp.email,
      status: emp.status,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));
    // Return as SafeEmployee[] (callers access only the fields they need)
    return { employees: filtered as SafeEmployee[], total: result.total };
  }

  return { employees: safeEmployees, total: result.total };
}

export async function getEmployee(
  employeeId: string,
  tenantId: string,
  callerRole: CallerRole = "tenant_admin",
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee || employee.tenantId !== tenantId) {
    return null;
  }

  const safe = toSafeEmployee(employee);

  if (callerRole === "tenant_admin") {
    // Strip sensitive fields for Tenant Admin
    return {
      employeeId: safe.employeeId,
      employeeCode: safe.employeeCode,
      email: safe.email,
      status: safe.status,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt,
    } as SafeEmployee;
  }

  return safe;
}

export async function createEmployee(
  tenantId: string,
  data: CreateEmployeeRequest,
): Promise<EmployeeDocument> {
  const now = new Date().toISOString();
  const employee: EmployeeDocument = {
    employeeId: `emp_${randomUUID()}`,
    tenantId,
    employeeCode: data.employeeCode.trim(),
    name: null,
    email: data.email.toLowerCase().trim(),
    status: "not_registered",
    passwordHash: null,
    mustChangePassword: false,
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

// ── Profile Update ────────────────────────────────────────────────────────────

/**
 * Update an employee's own profile fields.
 * Only the employee themselves (or Super Admin) can update these fields.
 * Tenant Admin cannot update employee profile data.
 */
export async function updateEmployeeProfile(
  employeeId: string,
  data: {
    name?: string;
    phoneNumber?: string;
    bankAccountNumber?: string;
    bankName?: string;
  },
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing) {
    return null;
  }

  const updates: Partial<EmployeeDocument> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber.trim();
  if (data.bankAccountNumber !== undefined) updates.bankAccountNumber = data.bankAccountNumber.trim();
  if (data.bankName !== undefined) updates.bankName = data.bankName.trim();
  updates.updatedAt = new Date().toISOString();

  const updated = await repositories.employees.update(employeeId, updates);
  return updated ? toSafeEmployee(updated) : null;
}

// ── Employee Auth ────────────────────────────────────────────────────────────

/**
 * Authenticate an employee using tenantId + email + password.
 *
 * Handles lockout state, tracks failed attempts, and resets on success.
 * Returns a SafeEmployee (no passwordHash) on success.
 */
export async function loginEmployee(
  tenantId: string,
  email: string,
  password: string,
): Promise<LoginResult> {
  const repositories = await getRepositoryContext();

  // 1. Find employee by tenantId + email
  const employee = await repositories.employees.findByTenantAndEmail(tenantId, email);
  if (!employee) {
    logAuthEvent("LOGIN_FAIL", { tenantId, reason: "employee_not_found" });
    return {
      success: false,
      error: "Invalid email or password.",
      errorCode: "EMPLOYEE_NOT_FOUND",
    };
  }

  // 2. Check employee status
  if (employee.status === "not_registered") {
    logAuthEvent("LOGIN_BLOCKED", { tenantId, employeeId: employee.employeeId, reason: "not_registered" });
    return {
      success: false,
      error: "Please complete registration first.",
      errorCode: "NOT_REGISTERED",
    };
  }

  if (employee.status === "inactive") {
    logAuthEvent("LOGIN_BLOCKED", { tenantId, employeeId: employee.employeeId, reason: "inactive" });
    return {
      success: false,
      error: "Your account is not active. Please contact your administrator.",
      errorCode: "EMPLOYEE_INACTIVE",
    };
  }

  if (employee.status === "suspended") {
    logAuthEvent("LOGIN_BLOCKED", { tenantId, employeeId: employee.employeeId, reason: "suspended" });
    return {
      success: false,
      error: "This account has been suspended. Please contact your administrator.",
      errorCode: "EMPLOYEE_SUSPENDED",
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
        error: "Too many failed attempts. Please try again later.",
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

  // 4. Verify password
  if (!employee.passwordHash) {
    logAuthEvent("LOGIN_FAIL", { tenantId, employeeId: employee.employeeId, reason: "no_password_hash" });
    return {
      success: false,
      error: "Please complete registration first.",
      errorCode: "NOT_REGISTERED",
    };
  }

  const passwordValid = verifyPassword(password, employee.passwordHash);

  if (!passwordValid) {
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
      error: "Invalid email or password.",
      errorCode: "INVALID_PASSWORD",
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

  const safe = toSafeEmployee(fresh ?? employee);

  return {
    success: true,
    employee: safe,
    mustChangePassword: safe.mustChangePassword || undefined,
  };
}

// ── Employee Registration ────────────────────────────────────────────────────

/**
 * Register an employee (complete self-registration).
 *
 * Validates:
 * - Employee exists (tenantId + employeeCode)
 * - Email matches stored email (case-insensitive)
 * - Status is not_registered (not already registered)
 * - Account is not inactive or suspended
 * - Password meets strength requirements
 * - Name is provided
 */
export async function registerEmployee(
  tenantId: string,
  employeeCode: string,
  email: string,
  password: string,
  name: string,
  phone?: string,
  inviteToken?: string,
): Promise<SafeEmployee> {
  // Validate name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Name is required.");
  }
  if (name.trim().length > 100) {
    throw new Error("Name must be 100 characters or fewer.");
  }

  // Validate password strength
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    throw new Error(pwError);
  }

  const repositories = await getRepositoryContext();

  // Find employee by tenantId + employeeCode
  const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode);
  if (!employee) {
    throw new Error("Employee not found.");
  }

  // Verify email matches (case-insensitive)
  if (employee.email.toLowerCase() !== email.toLowerCase().trim()) {
    throw new Error("Email does not match our records.");
  }

  // Check status
  if (employee.status === "not_registered") {
    // This is the expected state — continue
  } else if (employee.status === "active") {
    throw new Error("This account has already been registered.");
  } else if (employee.status === "inactive" || employee.status === "suspended") {
    throw new Error("This account is not available for registration.");
  }

  const now = new Date().toISOString();

  // Update employee document
  const updated = await repositories.employees.update(employee.employeeId, {
    status: "active",
    passwordHash: hashPassword(password),
    name: name.trim(),
    phoneNumber: phone?.trim() || undefined,
    mustChangePassword: false,
    lastAccessAt: now,
    updatedAt: now,
  });

  if (!updated) {
    throw new Error("Registration failed.");
  }

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: "employee_registered",
    employeeId: employee.employeeId,
    tenantId,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  // If registration was initiated via an invitation token, mark it as completed
  if (inviteToken) {
    await completeInvitation(inviteToken);
  }

  return toSafeEmployee(updated);
}

// ── Password Change ──────────────────────────────────────────────────────────

/**
 * Change an employee's password.
 * Validates current password, then sets new password and clears mustChangePassword.
 */
export async function changePassword(
  employeeId: string,
  currentPassword: string,
  newPassword: string,
): Promise<SafeEmployee> {
  // Validate new password strength
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) {
    throw new Error(pwError);
  }

  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee) {
    throw new Error("Employee not found.");
  }

  if (!employee.passwordHash) {
    throw new Error("Account has not been registered yet.");
  }

  // Verify current password
  if (!verifyPassword(currentPassword, employee.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }

  const now = new Date().toISOString();

  const updated = await repositories.employees.update(employeeId, {
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    updatedAt: now,
  });

  if (!updated) {
    throw new Error("Password change failed.");
  }

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: "password_changed",
    employeeId,
    tenantId: employee.tenantId,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  return toSafeEmployee(updated);
}

// ── Cross-Tenant Service Functions (Super Admin) ──────────────────────────────

/**
 * List all employees across all tenants (Super Admin only).
 * Supports optional tenantId filter, search, and pagination.
 */
export async function listAllEmployees(
  options?: FindEmployeesOptions & { tenantId?: string },
  callerRole: CallerRole = "super_admin",
): Promise<{ employees: SafeEmployee[]; total: number; employeesRaw?: EmployeeDocument[] }> {
  const repositories = await getRepositoryContext();
  const result = await repositories.employees.findAll(options);

  const safeEmployees: SafeEmployee[] = result.employees.map(toSafeEmployee);

  if (callerRole === "tenant_admin") {
    const filtered = safeEmployees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      email: emp.email,
      status: emp.status,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    })) as SafeEmployee[];
    return { employees: filtered, total: result.total };
  }

  return { employees: safeEmployees, total: result.total, employeesRaw: result.employees };
}

/**
 * Get employee by ID (cross-tenant, no tenant scope check).
 * Returns full SafeEmployee for Super Admin, or limited view for Tenant Admin.
 */
export async function getEmployeeById(
  employeeId: string,
  callerRole: CallerRole = "super_admin",
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee) {
    return null;
  }

  const safe = toSafeEmployee(employee);

  if (callerRole === "tenant_admin") {
    return {
      employeeId: safe.employeeId,
      employeeCode: safe.employeeCode,
      email: safe.email,
      status: safe.status,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt,
    } as SafeEmployee;
  }

  return safe;
}

/**
 * Reset employee password by employee ID (cross-tenant).
 * Looks up the employee's tenantId internally.
 */
export async function resetEmployeePasswordById(
  employeeId: string,
  performedBy?: string,
): Promise<{ temporaryPassword: string; employee: SafeEmployee } | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing) {
    return null;
  }

  // Delegate to the tenant-scoped function with the resolved tenantId
  return resetEmployeePassword(existing.tenantId, employeeId, performedBy);
}

/**
 * Unlock employee by employee ID (cross-tenant).
 * Looks up the employee's tenantId internally.
 */
export async function unlockEmployeeById(
  employeeId: string,
  performedBy?: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing) {
    return null;
  }

  return unlockEmployee(existing.tenantId, employeeId, performedBy);
}

/**
 * Suspend employee by employee ID (cross-tenant).
 * Looks up the employee's tenantId internally.
 */
export async function suspendEmployeeById(
  employeeId: string,
  performedBy?: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing) {
    return null;
  }

  return suspendEmployee(existing.tenantId, employeeId, performedBy);
}

/**
 * Unsuspend employee by employee ID (cross-tenant).
 * Looks up the employee's tenantId internally.
 */
export async function unsuspendEmployeeById(
  employeeId: string,
  performedBy?: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing) {
    return null;
  }

  return unsuspendEmployee(existing.tenantId, employeeId, performedBy);
}

// ── Super Admin Actions ──────────────────────────────────────────────────────

/**
 * Generate a 12-character alphanumeric temporary password.
 */
function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Super Admin password reset.
 * Generates a temporary password, bcrypt hashes it, sets mustChangePassword=true.
 * Returns the plaintext temporary password ONCE (not stored).
 */
export async function resetEmployeePassword(
  tenantId: string,
  employeeId: string,
  performedBy?: string,
): Promise<{ temporaryPassword: string; employee: SafeEmployee } | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const temporaryPassword = generateTemporaryPassword();
  const now = new Date().toISOString();

  const updated = await repositories.employees.update(employeeId, {
    passwordHash: hashPassword(temporaryPassword),
    mustChangePassword: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    updatedAt: now,
  });

  if (!updated) return null;

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: "password_reset",
    employeeId,
    tenantId,
    performedBy,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  return {
    temporaryPassword,
    employee: toSafeEmployee(updated),
  };
}

/**
 * Suspend an employee (Super Admin action).
 * Sets status to "suspended".
 */
export async function suspendEmployee(
  tenantId: string,
  employeeId: string,
  performedBy?: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const now = new Date().toISOString();

  const updated = await repositories.employees.update(employeeId, {
    status: "suspended",
    updatedAt: now,
  });

  if (!updated) return null;

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: "employee_suspended",
    employeeId,
    tenantId,
    performedBy,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  return toSafeEmployee(updated);
}

/**
 * Unsuspend an employee (Super Admin action).
 * Sets status back to "active".
 */
export async function unsuspendEmployee(
  tenantId: string,
  employeeId: string,
  performedBy?: string,
): Promise<SafeEmployee | null> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const now = new Date().toISOString();

  const updated = await repositories.employees.update(employeeId, {
    status: "active",
    updatedAt: now,
  });

  if (!updated) return null;

  // Record audit event
  const auditEvent: AuditEventDocument = {
    eventId: `audit_${randomUUID()}`,
    action: "employee_unsuspended",
    employeeId,
    tenantId,
    performedBy,
    timestamp: now,
  };
  await repositories.employees.insertAuditEvent(auditEvent);

  return toSafeEmployee(updated);
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
 * lockedUntil but never exposes passwordHash.
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
 * Get a safe employee profile (no passwordHash) by employeeId + tenantId.
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
