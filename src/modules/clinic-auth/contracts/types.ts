import type {
  ClinicUserDocument,
  ClinicUserStatus,
} from "@/src/server/db/documents";

export type { ClinicUserStatus };

/** Clinic portal user record (identity-backed by `ClinicUserDocument`). */
export type ClinicUser = ClinicUserDocument;

/** Safe clinic user profile returned to clients — never includes passwordHash. */
export interface ClinicUserProfile {
  clinicUserId: string;
  email: string;
  name: string;
  clinicIds: string[];
  tenantIds: string[];
  status: ClinicUserStatus;
  mustChangePassword: boolean;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicSession {
  id: string;
  clinicUserId: string;
  sessionToken: string;
  createdAt: string;
  expiresAt: string | Date;
  lastAccessedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateClinicUserRecordInput {
  email: string;
  passwordHash: string;
  name: string;
  clinicIds: string[];
  tenantIds: string[];
  status: ClinicUserStatus;
  mustChangePassword: boolean;
}

export interface UpdateClinicUserInput {
  email?: string;
  passwordHash?: string;
  name?: string;
  clinicIds?: string[];
  tenantIds?: string[];
  status?: ClinicUserStatus;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  mustChangePassword?: boolean;
  lastAccessAt?: string | null;
  updatedAt?: string;
}

export interface CreateClinicSessionInput {
  clinicUserId: string;
  sessionToken: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ClinicLoginCredentials {
  email: string;
  password: string;
}

export type ClinicLoginFailureReason =
  | "INVALID_CREDENTIALS"
  | "USER_DISABLED"
  | "USER_ARCHIVED"
  | "USER_LOCKED";

export interface ClinicLoginResult {
  success: boolean;
  user?: ClinicUserProfile;
  session?: ClinicSession;
  requiresPasswordChange?: boolean;
  error?: string;
  reason?: ClinicLoginFailureReason;
  retryAfterSeconds?: number;
  lockedUntil?: string | null;
}

export interface ClinicAuthContext {
  user: ClinicUserProfile;
  session: ClinicSession;
}

export type ClinicSessionFailureReason =
  | "SESSION_MISSING"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "USER_NOT_FOUND"
  | "USER_DISABLED"
  | "USER_ARCHIVED";

export interface ClinicSessionValidationResult {
  success: boolean;
  context?: ClinicAuthContext;
  reason?: ClinicSessionFailureReason;
  error?: string;
  clearCookies?: boolean;
}

export interface ClinicChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ClinicRateLimitState {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
}

export interface ClinicAuthConfig {
  sessionExpiryDays: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  sessionCookieName: string;
  sessionTokenBytes: number;
}

export const CLINIC_AUTH_CONFIG: ClinicAuthConfig = {
  sessionExpiryDays: 7,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  sessionCookieName: "clinic_session",
  sessionTokenBytes: 32,
};

/**
 * Input for tenant-admin / super-admin creation of a clinic portal user
 * (out-of-band invite — no email in Phase H).
 */
export interface CreateClinicUserAccountInput {
  email: string;
  name: string;
  clinicIds: string[];
  tenantIds: string[];
  /** Optional explicit initial password. When omitted a temporary one is generated. */
  initialPassword?: string;
  createdBy: string;
}

export interface CreateClinicUserAccountResult {
  clinicUser: ClinicUserProfile;
  /** Plaintext initial password — returned exactly once to the creator. */
  initialPassword: string;
}
