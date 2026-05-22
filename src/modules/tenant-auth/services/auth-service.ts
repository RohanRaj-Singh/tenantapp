import * as bcrypt from "bcryptjs";
import type {
  TenantAuthContext,
  TenantChangePasswordInput,
  TenantLifecycleStatus,
  TenantLoginCredentials,
  TenantLoginResult,
  TenantLookup,
  TenantSessionValidationResult,
  TenantUser,
  TenantUserProfile,
} from "../contracts/types";
import { TENANT_AUTH_CONFIG } from "../contracts/types";
import {
  createTenantSessionToken,
} from "../utils/passwords";
import {
  buildTenantRateLimitKey,
  clearTenantLoginFailures,
  getTenantLoginRateLimitState,
  recordTenantLoginFailure,
} from "../utils/rate-limit";
import {
  normalizeTenantIdentifier,
  validateTenantLoginInput,
  validateTenantPassword,
} from "../validators/credentials";
import {
  createTenantSession,
  createTenantUser,
  deleteExpiredTenantSessions,
  deleteTenantSessionByToken,
  deleteTenantSessionsByTenantId,
  deleteTenantSessionsByUserId,
  findTenantUserByIdentifier,
  getTenantSessionByToken,
  getTenantUserByEmail,
  getTenantUserById,
  getTenantUserByTenantId,
  getTenantUserByUsername,
  updateTenantSessionLastAccessed,
  updateTenantUser,
} from "../repository/repository";
import { getTenantLookupById, getTenantLookupBySlug } from "../utils/request-tenant";

export interface TenantLoginContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface TenantAuthServiceDependencies {
  getNow: () => Date;
  getTenantById: (tenantId: string) => Promise<TenantLookup | null>;
  getTenantBySlug: (tenantSlug: string) => Promise<TenantLookup | null>;
  comparePassword: (value: string, hash: string) => Promise<boolean>;
  hashPassword: (value: string) => Promise<string>;
  createSessionToken: () => string;
  rateLimiter: {
    buildKey: (identifier: string, ipAddress?: string | null) => string;
    getState: (key: string, now: Date) => ReturnType<typeof getTenantLoginRateLimitState>;
    recordFailure: (key: string, now: Date) => ReturnType<typeof recordTenantLoginFailure>;
    clear: (key: string) => void;
  };
  repository: {
    createTenantUser: typeof createTenantUser;
    getTenantUserById: typeof getTenantUserById;
    getTenantUserByTenantId: typeof getTenantUserByTenantId;
    getTenantUserByEmail: typeof getTenantUserByEmail;
    getTenantUserByUsername: typeof getTenantUserByUsername;
    findTenantUserByIdentifier: typeof findTenantUserByIdentifier;
    updateTenantUser: typeof updateTenantUser;
    createTenantSession: typeof createTenantSession;
    getTenantSessionByToken: typeof getTenantSessionByToken;
    updateTenantSessionLastAccessed: typeof updateTenantSessionLastAccessed;
    deleteTenantSessionByToken: typeof deleteTenantSessionByToken;
    deleteTenantSessionsByUserId: typeof deleteTenantSessionsByUserId;
    deleteTenantSessionsByTenantId: typeof deleteTenantSessionsByTenantId;
    deleteExpiredTenantSessions: typeof deleteExpiredTenantSessions;
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function mapTenantUserToProfile(user: TenantUser): TenantUserProfile {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    username: user.username,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    mustChangePassword: user.mustChangePassword,
  };
}

function getTenantLifecycleFailure(
  status: TenantLifecycleStatus,
): Pick<TenantLoginResult, "reason" | "error"> | null {
  switch (status) {
    case "disabled":
      return {
        reason: "TENANT_DISABLED",
        error: "Dashboard access is temporarily disabled for this tenant.",
      };
    case "archived":
      return {
        reason: "TENANT_ARCHIVED",
        error: "Dashboard access is no longer available for this tenant.",
      };
    case "active":
      return null;
    case "inactive":
    case "suspended":
    default:
      return {
        reason: "TENANT_DRAFT",
        error: "Dashboard access will open once this tenant goes live.",
      };
  }
}

function toSessionValidationFailure(
  reason: TenantSessionValidationResult["reason"],
): TenantSessionValidationResult {
  switch (reason) {
    case "SESSION_MISSING":
      return {
        success: false,
        reason,
        error: "Tenant authentication required.",
      };
    case "SESSION_EXPIRED":
    case "SESSION_NOT_FOUND":
      return {
        success: false,
        reason,
        error: "Your session has expired. Please sign in again.",
        clearCookies: true,
      };
    case "TENANT_SCOPE_REQUIRED":
      return {
        success: false,
        reason,
        error: "Tenant context is required before dashboard access can continue.",
        clearCookies: true,
      };
    case "TENANT_SCOPE_MISMATCH":
      return {
        success: false,
        reason,
        error: "This dashboard session does not match the current tenant workspace.",
        clearCookies: true,
      };
    case "TENANT_NOT_FOUND":
      return {
        success: false,
        reason,
        error: "Tenant dashboard access is unavailable.",
        clearCookies: true,
      };
    case "USER_DISABLED":
      return {
        success: false,
        reason,
        error: "Dashboard access for this account is disabled.",
        clearCookies: true,
      };
    case "USER_NOT_FOUND":
      return {
        success: false,
        reason,
        error: "Tenant authentication required.",
        clearCookies: true,
      };
    case "TENANT_DISABLED":
      return {
        success: false,
        reason,
        error: "Dashboard access is temporarily disabled for this tenant.",
        clearCookies: true,
      };
    case "TENANT_ARCHIVED":
      return {
        success: false,
        reason,
        error: "Dashboard access is no longer available for this tenant.",
        clearCookies: true,
      };
    case "TENANT_DRAFT":
    default:
      return {
        success: false,
        reason,
        error: "Dashboard access will open once this tenant goes live.",
        clearCookies: true,
      };
  }
}

function createDefaultDependencies(): TenantAuthServiceDependencies {
  return {
    getNow: () => new Date(),
    getTenantById: getTenantLookupById,
    getTenantBySlug: getTenantLookupBySlug,
    comparePassword: (value, hash) => bcrypt.compare(value, hash),
    hashPassword: (value) => bcrypt.hash(value, 12),
    createSessionToken: createTenantSessionToken,
    rateLimiter: {
      buildKey: buildTenantRateLimitKey,
      getState: getTenantLoginRateLimitState,
      recordFailure: recordTenantLoginFailure,
      clear: clearTenantLoginFailures,
    },
    repository: {
      createTenantUser,
      getTenantUserById,
      getTenantUserByTenantId,
      getTenantUserByEmail,
      getTenantUserByUsername,
      findTenantUserByIdentifier,
      updateTenantUser,
      createTenantSession,
      getTenantSessionByToken,
      updateTenantSessionLastAccessed,
      deleteTenantSessionByToken,
      deleteTenantSessionsByUserId,
      deleteTenantSessionsByTenantId,
      deleteExpiredTenantSessions,
    },
  };
}

export function createTenantAuthService(
  dependencies: Partial<TenantAuthServiceDependencies> = {},
) {
  const base = createDefaultDependencies();
  const deps: TenantAuthServiceDependencies = {
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

  async function loginTenantUser(
    tenantSlug: string,
    credentials: TenantLoginCredentials,
    context: TenantLoginContext = {},
  ): Promise<TenantLoginResult> {
    const validation = validateTenantLoginInput(credentials);
    if (!validation.isValid) {
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: validation.errors[0],
      };
    }

    const now = deps.getNow();
    const rateLimitKey = deps.rateLimiter.buildKey(
      normalizeTenantIdentifier(credentials.identifier),
      context.ipAddress,
    );
    const rateLimitState = deps.rateLimiter.getState(rateLimitKey, now);

    if (!rateLimitState.allowed) {
      return {
        success: false,
        reason: "RATE_LIMITED",
        error: "Too many login attempts. Please try again later.",
        retryAfterSeconds: rateLimitState.retryAfterSeconds,
      };
    }

    const tenant = await deps.getTenantBySlug(tenantSlug);
    if (!tenant) {
      return {
        success: false,
        reason: "TENANT_UNAVAILABLE",
        error: "Tenant dashboard access is unavailable.",
      };
    }

    const lifecycleFailure = getTenantLifecycleFailure(tenant.status);
    if (lifecycleFailure) {
      return {
        success: false,
        ...lifecycleFailure,
      };
    }

    const user = await deps.repository.findTenantUserByIdentifier(credentials.identifier);

    if (!user || user.tenantId !== tenant.tenantId) {
      deps.rateLimiter.recordFailure(rateLimitKey, now);
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: "Invalid email/username or password.",
      };
    }

    if (user.status === "disabled") {
      return {
        success: false,
        reason: "USER_DISABLED",
        error: "Dashboard access for this account is disabled.",
      };
    }

    const isValidPassword = await deps.comparePassword(
      credentials.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      deps.rateLimiter.recordFailure(rateLimitKey, now);
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        error: "Invalid email/username or password.",
      };
    }

    deps.rateLimiter.clear(rateLimitKey);
    await deps.repository.deleteExpiredTenantSessions(now.toISOString());
    await deps.repository.deleteTenantSessionsByUserId(user.id);

    const sessionToken = deps.createSessionToken();
    const expiresAt = addDays(now, TENANT_AUTH_CONFIG.sessionExpiryDays).toISOString();
    const session = await deps.repository.createTenantSession({
      tenantUserId: user.id,
      tenantId: user.tenantId,
      sessionToken,
      expiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    const updatedUser = await deps.repository.updateTenantUser(user.id, {
      lastLoginAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return {
      success: true,
      user: mapTenantUserToProfile(
        updatedUser ?? {
          ...user,
          lastLoginAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ),
      session,
      requiresPasswordChange: user.mustChangePassword,
    };
  }

  async function validateTenantSession(
    sessionToken: string,
    expectedTenantSlug?: string | null,
  ): Promise<TenantSessionValidationResult> {
    if (!sessionToken) {
      return toSessionValidationFailure("SESSION_MISSING");
    }

    const session = await deps.repository.getTenantSessionByToken(sessionToken);
    if (!session) {
      return toSessionValidationFailure("SESSION_NOT_FOUND");
    }

    const now = deps.getNow();
    if (new Date(session.expiresAt) <= now) {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("SESSION_EXPIRED");
    }

    if (expectedTenantSlug) {
      const expectedTenant = await deps.getTenantBySlug(expectedTenantSlug);
      if (!expectedTenant) {
        return toSessionValidationFailure("TENANT_NOT_FOUND");
      }

      if (session.tenantId !== expectedTenant.tenantId) {
        await deps.repository.deleteTenantSessionByToken(session.sessionToken);
        return toSessionValidationFailure("TENANT_SCOPE_MISMATCH");
      }
    }

    const user = await deps.repository.getTenantUserById(session.tenantUserId);
    if (!user || user.tenantId !== session.tenantId) {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("USER_NOT_FOUND");
    }

    if (user.status !== "active") {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("USER_DISABLED");
    }

    const tenant = await deps.getTenantById(user.tenantId);
    if (!tenant) {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("TENANT_NOT_FOUND");
    }

    const lifecycleFailure = getTenantLifecycleFailure(tenant.status);
    if (lifecycleFailure?.reason === "TENANT_DISABLED") {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("TENANT_DISABLED");
    }

    if (lifecycleFailure?.reason === "TENANT_ARCHIVED") {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("TENANT_ARCHIVED");
    }

    if (lifecycleFailure?.reason === "TENANT_DRAFT") {
      await deps.repository.deleteTenantSessionByToken(session.sessionToken);
      return toSessionValidationFailure("TENANT_DRAFT");
    }

    await deps.repository.updateTenantSessionLastAccessed(
      session.sessionToken,
      now.toISOString(),
    );

    const authContext: TenantAuthContext = {
      user: mapTenantUserToProfile(user),
      session: {
        ...session,
        lastAccessedAt: now.toISOString(),
      },
      tenant,
    };

    return {
      success: true,
      context: authContext,
    };
  }

  async function changeTenantPassword(
    userId: string,
    input: TenantChangePasswordInput,
  ): Promise<TenantUserProfile> {
    const validation = validateTenantPassword(input.newPassword);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    const user = await deps.repository.getTenantUserById(userId);
    if (!user) {
      throw new Error("Tenant user not found.");
    }

    const isValidPassword = await deps.comparePassword(
      input.currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new Error("Current password is incorrect.");
    }

    const passwordHash = await deps.hashPassword(input.newPassword.trim());
    const updatedUser = await deps.repository.updateTenantUser(userId, {
      passwordHash,
      mustChangePassword: false,
    });

    if (!updatedUser) {
      throw new Error("Password change could not be completed.");
    }

    return mapTenantUserToProfile(updatedUser);
  }

  async function invalidateTenantSession(sessionToken: string): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await deps.repository.deleteTenantSessionByToken(sessionToken);
  }

  return {
    changeTenantPassword,
    invalidateTenantSession,
    loginTenantUser,
    validateTenantSession,
  };
}

const tenantAuthService = createTenantAuthService();

export const changeTenantPassword = tenantAuthService.changeTenantPassword;
export const invalidateTenantSession = tenantAuthService.invalidateTenantSession;
export const loginTenantUser = tenantAuthService.loginTenantUser;
export const validateTenantSession = tenantAuthService.validateTenantSession;
