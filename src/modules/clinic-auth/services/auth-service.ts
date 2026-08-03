import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type {
  ClinicAuthContext,
  ClinicChangePasswordInput,
  ClinicLoginCredentials,
  ClinicLoginResult,
  ClinicRateLimitState,
  ClinicSession,
  ClinicSessionValidationResult,
  ClinicUser,
  ClinicUserProfile,
  CreateClinicUserAccountInput,
  CreateClinicUserAccountResult,
} from "../contracts/types";
import { CLINIC_AUTH_CONFIG } from "../contracts/types";
import { createClinicSessionToken } from "../utils/passwords";
import {
  buildClinicRateLimitKey,
  clearClinicLoginFailures,
  getClinicLoginRateLimitState,
  recordClinicLoginFailure,
} from "../utils/rate-limit";
import {
  normalizeClinicEmail,
  validateClinicEmail,
  validateClinicLoginInput,
  validateClinicPassword,
} from "../validators/credentials";
import {
  createClinicSession,
  createClinicUser,
  deleteClinicSessionByToken,
  deleteClinicSessionsByUserId,
  deleteExpiredClinicSessions,
  getClinicSessionByToken,
  getClinicUserByEmail,
  getClinicUserById,
  updateClinicSessionLastAccessed,
  updateClinicUser,
} from "../repository/repository";

export interface ClinicLoginContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ClinicAuthServiceDependencies {
  getNow: () => Date;
  comparePassword: (value: string, hash: string) => Promise<boolean>;
  hashPassword: (value: string) => Promise<string>;
  createSessionToken: () => string;
  rateLimiter: {
    buildKey: (email: string, ipAddress?: string | null) => string;
    getState: (key: string, now: Date) => ClinicRateLimitState;
    recordFailure: (key: string, now: Date) => ClinicRateLimitState;
    clear: (key: string) => void;
  };
  repository: {
    createClinicUser: typeof createClinicUser;
    getClinicUserById: typeof getClinicUserById;
    getClinicUserByEmail: typeof getClinicUserByEmail;
    updateClinicUser: typeof updateClinicUser;
    createClinicSession: typeof createClinicSession;
    getClinicSessionByToken: typeof getClinicSessionByToken;
    updateClinicSessionLastAccessed: typeof updateClinicSessionLastAccessed;
    deleteClinicSessionByToken: typeof deleteClinicSessionByToken;
    deleteClinicSessionsByUserId: typeof deleteClinicSessionsByUserId;
    deleteExpiredClinicSessions: typeof deleteExpiredClinicSessions;
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function mapClinicUserToProfile(user: ClinicUser): ClinicUserProfile {
  return {
    clinicUserId: user.clinicUserId,
    email: user.email,
    name: user.name,
    clinicIds: user.clinicIds,
    tenantIds: user.tenantIds,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    lastAccessAt: user.lastAccessAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toSessionValidationFailure(
  reason: ClinicSessionValidationResult["reason"],
): ClinicSessionValidationResult {
  switch (reason) {
    case "SESSION_MISSING":
      return {
        success: false,
        reason,
        error: "Clinic authentication required.",
      };
    case "SESSION_EXPIRED":
    case "SESSION_NOT_FOUND":
      return {
        success: false,
        reason,
        error: "Your clinic session has expired. Please sign in again.",
        clearCookies: true,
      };
    case "USER_DISABLED":
      return {
        success: false,
        reason,
        error: "Clinic portal access for this account is disabled.",
        clearCookies: true,
      };
    case "USER_ARCHIVED":
      return {
        success: false,
        reason,
        error: "Clinic portal access is no longer available for this account.",
        clearCookies: true,
      };
    case "USER_NOT_FOUND":
    default:
      return {
        success: false,
        reason,
        error: "Clinic authentication required.",
        clearCookies: true,
      };
  }
}

export function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createDefaultDependencies(): ClinicAuthServiceDependencies {
  return {
    getNow: () => new Date(),
    comparePassword: (value, hash) => bcrypt.compare(value, hash),
    hashPassword: (value) => bcrypt.hash(value, 12),
    createSessionToken: createClinicSessionToken,
    rateLimiter: {
      buildKey: buildClinicRateLimitKey,
      getState: getClinicLoginRateLimitState,
      recordFailure: recordClinicLoginFailure,
      clear: clearClinicLoginFailures,
    },
    repository: {
      createClinicUser,
      getClinicUserById,
      getClinicUserByEmail,
      updateClinicUser,
      createClinicSession,
      getClinicSessionByToken,
      updateClinicSessionLastAccessed,
      deleteClinicSessionByToken,
      deleteClinicSessionsByUserId,
      deleteExpiredClinicSessions,
    },
  };
}

export function createClinicAuthService(
  dependencies: Partial<ClinicAuthServiceDependencies> = {},
) {
  const base = createDefaultDependencies();
  const deps: ClinicAuthServiceDependencies = {
    ...base,
    ...dependencies,
    rateLimiter: {
      ...base.rateLimiter,
      ...(dependencies.rateLimiter ?? {}),
    },
    repository: {
      ...base.repository,
      ...(dependencies.repository ?? {}),
    },
  };

  async function loginClinicUser(
    credentials: ClinicLoginCredentials,
    context: ClinicLoginContext = {},
  ): Promise<ClinicLoginResult> {
    const validation = validateClinicLoginInput(credentials);
    if (!validation.isValid) {
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: validation.errors[0],
      };
    }

    const normalizedEmail = normalizeClinicEmail(credentials.email);
    const now = deps.getNow();
    const rateLimitKey = deps.rateLimiter.buildKey(normalizedEmail, context.ipAddress);
    const rateLimitState = deps.rateLimiter.getState(rateLimitKey, now);

    if (!rateLimitState.allowed) {
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: "Too many login attempts. Please try again later.",
        retryAfterSeconds: rateLimitState.retryAfterSeconds,
      };
    }

    const user = await deps.repository.getClinicUserByEmail(normalizedEmail);

    if (!user) {
      deps.rateLimiter.recordFailure(rateLimitKey, now);
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: "Invalid email or password.",
      };
    }

    // Account-level lockout persisted on the clinic user document.
    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
      return {
        success: false,
        reason: "USER_LOCKED",
        error: "Too many failed attempts. Please try again later.",
        lockedUntil: user.lockedUntil,
      };
    }

    if (user.status === "disabled") {
      return {
        success: false,
        reason: "USER_DISABLED",
        error: "Clinic portal access for this account is disabled.",
      };
    }

    if (user.status === "archived") {
      return {
        success: false,
        reason: "USER_ARCHIVED",
        error: "Clinic portal access is no longer available for this account.",
      };
    }

    const isValidPassword = await deps.comparePassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      const failed = user.failedLoginAttempts + 1;
      const lockedUntil =
        failed >= CLINIC_AUTH_CONFIG.maxLoginAttempts
          ? new Date(now.getTime() + CLINIC_AUTH_CONFIG.lockoutMinutes * 60 * 1000).toISOString()
          : null;

      await deps.repository.updateClinicUser(user.clinicUserId, {
        failedLoginAttempts: failed,
        lockedUntil,
      });

      deps.rateLimiter.recordFailure(rateLimitKey, now);

      if (failed >= CLINIC_AUTH_CONFIG.maxLoginAttempts) {
        return {
          success: false,
          reason: "USER_LOCKED",
          error: "Too many failed attempts. Your access has been locked for 15 minutes.",
          lockedUntil,
        };
      }

      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: "Invalid email or password.",
      };
    }

    deps.rateLimiter.clear(rateLimitKey);
    await deps.repository.deleteExpiredClinicSessions(now.toISOString());
    await deps.repository.deleteClinicSessionsByUserId(user.clinicUserId);

    const sessionToken = deps.createSessionToken();
    const expiresAt = addDays(now, CLINIC_AUTH_CONFIG.sessionExpiryDays).toISOString();
    const session = await deps.repository.createClinicSession({
      clinicUserId: user.clinicUserId,
      sessionToken,
      expiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    const updatedUser = await deps.repository.updateClinicUser(user.clinicUserId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastAccessAt: now.toISOString(),
    });

    return {
      success: true,
      user: mapClinicUserToProfile(updatedUser ?? user),
      session,
      requiresPasswordChange: user.mustChangePassword,
    };
  }

  async function validateClinicSession(
    sessionToken: string,
  ): Promise<ClinicSessionValidationResult> {
    if (!sessionToken) {
      return toSessionValidationFailure("SESSION_MISSING");
    }

    const session = await deps.repository.getClinicSessionByToken(sessionToken);
    if (!session) {
      return toSessionValidationFailure("SESSION_NOT_FOUND");
    }

    const now = deps.getNow();
    if (new Date(session.expiresAt) <= now) {
      await deps.repository.deleteClinicSessionByToken(session.sessionToken);
      return toSessionValidationFailure("SESSION_EXPIRED");
    }

    const user = await deps.repository.getClinicUserById(session.clinicUserId);
    if (!user) {
      await deps.repository.deleteClinicSessionByToken(session.sessionToken);
      return toSessionValidationFailure("USER_NOT_FOUND");
    }

    if (user.status === "disabled") {
      await deps.repository.deleteClinicSessionByToken(session.sessionToken);
      return toSessionValidationFailure("USER_DISABLED");
    }

    if (user.status === "archived") {
      await deps.repository.deleteClinicSessionByToken(session.sessionToken);
      return toSessionValidationFailure("USER_ARCHIVED");
    }

    await deps.repository.updateClinicSessionLastAccessed(
      session.sessionToken,
      now.toISOString(),
    );

    const authContext: ClinicAuthContext = {
      user: mapClinicUserToProfile(user),
      session: {
        ...session,
        lastAccessedAt: now.toISOString(),
      },
    };

    return {
      success: true,
      context: authContext,
    };
  }

  async function changeClinicPassword(
    clinicUserId: string,
    input: ClinicChangePasswordInput,
  ): Promise<ClinicUserProfile> {
    const validation = validateClinicPassword(input.newPassword);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    const user = await deps.repository.getClinicUserById(clinicUserId);
    if (!user) {
      throw new Error("Clinic user not found.");
    }

    const isValidPassword = await deps.comparePassword(
      input.currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new Error("Current password is incorrect.");
    }

    const passwordHash = await deps.hashPassword(input.newPassword.trim());
    const updatedUser = await deps.repository.updateClinicUser(clinicUserId, {
      passwordHash,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    if (!updatedUser) {
      throw new Error("Password change could not be completed.");
    }

    return mapClinicUserToProfile(updatedUser);
  }

  async function invalidateClinicSession(sessionToken: string): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await deps.repository.deleteClinicSessionByToken(sessionToken);
  }

  async function createClinicUserAccount(
    input: CreateClinicUserAccountInput,
  ): Promise<CreateClinicUserAccountResult> {
    const emailValidation = validateClinicEmail(input.email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.errors[0]);
    }

    const existing = await deps.repository.getClinicUserByEmail(input.email);
    if (existing) {
      throw new Error("A clinic portal user with this email already exists.");
    }

    const initialPassword = input.initialPassword?.trim() ?? generateTemporaryPassword();
    const passwordValidation = validateClinicPassword(initialPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors[0]);
    }

    const passwordHash = await deps.hashPassword(initialPassword);
    const created = await deps.repository.createClinicUser({
      email: input.email,
      passwordHash,
      name: input.name.trim(),
      clinicIds: input.clinicIds,
      tenantIds: input.tenantIds,
      status: "active",
      mustChangePassword: Boolean(input.initialPassword?.trim()),
    });

    return {
      clinicUser: mapClinicUserToProfile(created),
      initialPassword,
    };
  }

  return {
    changeClinicPassword,
    createClinicUserAccount,
    invalidateClinicSession,
    loginClinicUser,
    validateClinicSession,
  };
}

const clinicAuthService = createClinicAuthService();

export const changeClinicPassword = clinicAuthService.changeClinicPassword;
export const createClinicUserAccount = clinicAuthService.createClinicUserAccount;
export const invalidateClinicSession = clinicAuthService.invalidateClinicSession;
export const loginClinicUser = clinicAuthService.loginClinicUser;
export const validateClinicSession = clinicAuthService.validateClinicSession;
