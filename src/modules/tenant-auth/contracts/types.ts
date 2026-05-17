import type { TenantDocument } from "@/src/server/db/documents";

export type TenantUserStatus = "active" | "disabled";
export type TenantLifecycleStatus = TenantDocument["status"];

export interface TenantLookup {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantLifecycleStatus;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  passwordHash: string;
  status: TenantUserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
}

export interface TenantUserProfile {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  status: TenantUserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
}

export interface TenantSession {
  id: string;
  tenantUserId: string;
  tenantId: string;
  sessionToken: string;
  createdAt: string;
  expiresAt: string | Date;
  lastAccessedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateTenantUserRecordInput {
  tenantId: string;
  email: string;
  username: string;
  passwordHash: string;
  mustChangePassword: boolean;
  status: TenantUserStatus;
}

export interface UpdateTenantUserInput {
  email?: string;
  username?: string;
  passwordHash?: string;
  status?: TenantUserStatus;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
  updatedAt?: string;
}

export interface CreateTenantSessionInput {
  tenantUserId: string;
  tenantId: string;
  sessionToken: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface TenantLoginCredentials {
  identifier: string;
  password: string;
}

export type TenantLoginFailureReason =
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "USER_DISABLED"
  | "TENANT_DRAFT"
  | "TENANT_DISABLED"
  | "TENANT_ARCHIVED"
  | "TENANT_UNAVAILABLE";

export interface TenantLoginResult {
  success: boolean;
  user?: TenantUserProfile;
  session?: TenantSession;
  requiresPasswordChange?: boolean;
  error?: string;
  reason?: TenantLoginFailureReason;
  retryAfterSeconds?: number;
}

export interface TenantAuthContext {
  user: TenantUserProfile;
  session: TenantSession;
  tenant: TenantLookup;
}

export type TenantSessionFailureReason =
  | "SESSION_MISSING"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "TENANT_SCOPE_REQUIRED"
  | "TENANT_SCOPE_MISMATCH"
  | "TENANT_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "USER_DISABLED"
  | "TENANT_DRAFT"
  | "TENANT_DISABLED"
  | "TENANT_ARCHIVED";

export interface TenantSessionValidationResult {
  success: boolean;
  context?: TenantAuthContext;
  reason?: TenantSessionFailureReason;
  error?: string;
  clearCookies?: boolean;
}

export interface TenantChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface TenantRateLimitState {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
}

export interface TenantAuthConfig {
  sessionExpiryDays: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  sessionCookieName: string;
  passwordChangeCookieName: string;
  sessionTokenBytes: number;
}

export const TENANT_AUTH_CONFIG: TenantAuthConfig = {
  sessionExpiryDays: 7,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  sessionCookieName: "tenant_dashboard_session",
  passwordChangeCookieName: "tenant_dashboard_password_change",
  sessionTokenBytes: 32,
};
