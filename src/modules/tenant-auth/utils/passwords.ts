import { randomBytes, randomUUID } from "node:crypto";
import { TENANT_AUTH_CONFIG } from "../contracts/types";

export function createTenantSessionId(): string {
  return `tenant-session-${randomUUID()}`;
}

export function createTenantUserId(): string {
  return `tenant-user-${randomUUID()}`;
}

export function createTenantSessionToken(): string {
  return `tds_${randomBytes(TENANT_AUTH_CONFIG.sessionTokenBytes).toString("hex")}`;
}
