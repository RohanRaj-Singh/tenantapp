import "server-only";

import type {
  TenantAuthContext,
  TenantLookup,
  TenantSession,
  TenantUser,
  TenantUserProfile,
} from "../contracts/types";
import { getTenantUserByTenantId } from "../repository/repository";
import { getCurrentTenantRequestScope } from "./request-tenant";
import { isLocalTenantAuthBypassEnabled } from "./local-auth-bypass-config";
import { DEFAULT_RUNTIME_TENANT_SLUG, sanitizeTenantSlug } from "@/runtime/tenant/tenantResolution";
import { getTenantLookupBySlug } from "./request-tenant";

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

function createBypassSession(user: TenantUser): TenantSession {
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `local-bypass-session-${user.id}`,
    tenantUserId: user.id,
    tenantId: user.tenantId,
    sessionToken: "local-bypass-session",
    createdAt: nowIso,
    expiresAt,
    lastAccessedAt: nowIso,
    ipAddress: "127.0.0.1",
    userAgent: "local-auth-bypass",
  };
}

function toTenantLookup(scopeTenant: Awaited<ReturnType<typeof getCurrentTenantRequestScope>>["tenant"]): TenantLookup | null {
  if (!scopeTenant) {
    return null;
  }

  return {
    tenantId: scopeTenant.tenantId,
    slug: scopeTenant.slug,
    name: scopeTenant.name,
    status: scopeTenant.status,
  };
}

function getBypassTenantSlug() {
  return (
    sanitizeTenantSlug(process.env.TENANT_AUTH_BYPASS_TENANT_SLUG) ??
    sanitizeTenantSlug(process.env.NEXT_PUBLIC_TENANT_SLUG) ??
    DEFAULT_RUNTIME_TENANT_SLUG
  );
}

export async function getLocalTenantBypassAuthContext(): Promise<TenantAuthContext | null> {
  const scope = await getCurrentTenantRequestScope();
  const hostname = scope.resolution.hostname ?? null;

  if (!isLocalTenantAuthBypassEnabled(hostname)) {
    return null;
  }

  const tenant =
    toTenantLookup(scope.tenant) ??
    (await getTenantLookupBySlug(getBypassTenantSlug()));
  if (!tenant) {
    return null;
  }

  const user = await getTenantUserByTenantId(tenant.tenantId);
  if (!user || user.status !== "active") {
    return null;
  }

  return {
    tenant,
    user: mapTenantUserToProfile(user),
    session: createBypassSession(user),
  };
}
