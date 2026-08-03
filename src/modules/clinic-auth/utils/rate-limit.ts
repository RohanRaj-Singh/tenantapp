import {
  CLINIC_AUTH_CONFIG,
  type ClinicRateLimitState,
} from "../contracts/types";

interface LoginAttemptEntry {
  failedAttempts: number;
  blockedUntil: number | null;
  lastFailedAt: number;
}

const loginAttempts = new Map<string, LoginAttemptEntry>();

function getLockoutMs(): number {
  return CLINIC_AUTH_CONFIG.lockoutMinutes * 60 * 1000;
}

function cleanupExpiredEntries(nowMs: number): void {
  for (const [key, entry] of Array.from(loginAttempts.entries())) {
    const isUnblocked = entry.blockedUntil !== null && entry.blockedUntil <= nowMs;
    const isStale = nowMs - entry.lastFailedAt > getLockoutMs();

    if (isUnblocked || isStale) {
      loginAttempts.delete(key);
    }
  }
}

export function buildClinicRateLimitKey(
  email: string,
  ipAddress?: string | null,
): string {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedIp = ipAddress?.trim() || "unknown-ip";
  return `${normalizedEmail}::${normalizedIp}`;
}

export function getClinicLoginRateLimitState(
  key: string,
  now: Date = new Date(),
): ClinicRateLimitState {
  const nowMs = now.getTime();
  cleanupExpiredEntries(nowMs);

  const entry = loginAttempts.get(key);
  if (!entry) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: CLINIC_AUTH_CONFIG.maxLoginAttempts,
    };
  }

  if (entry.blockedUntil && entry.blockedUntil > nowMs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - nowMs) / 1000),
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(
      CLINIC_AUTH_CONFIG.maxLoginAttempts - entry.failedAttempts,
      0,
    ),
  };
}

export function recordClinicLoginFailure(
  key: string,
  now: Date = new Date(),
): ClinicRateLimitState {
  const nowMs = now.getTime();
  cleanupExpiredEntries(nowMs);

  const current = loginAttempts.get(key) ?? {
    failedAttempts: 0,
    blockedUntil: null,
    lastFailedAt: nowMs,
  };

  const failedAttempts = current.failedAttempts + 1;
  const nextEntry: LoginAttemptEntry = {
    failedAttempts,
    lastFailedAt: nowMs,
    blockedUntil:
      failedAttempts >= CLINIC_AUTH_CONFIG.maxLoginAttempts
        ? nowMs + getLockoutMs()
        : null,
  };

  loginAttempts.set(key, nextEntry);
  return getClinicLoginRateLimitState(key, now);
}

export function clearClinicLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

export function resetClinicLoginRateLimiter(): void {
  loginAttempts.clear();
}
