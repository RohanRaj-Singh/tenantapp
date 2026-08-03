import { randomBytes, randomUUID } from "node:crypto";
import { CLINIC_AUTH_CONFIG } from "../contracts/types";

export function createClinicSessionId(): string {
  return `clinic-session-${randomUUID()}`;
}

export function createClinicUserId(): string {
  return `clinic-user-${randomUUID()}`;
}

export function createClinicSessionToken(): string {
  return `cds_${randomBytes(CLINIC_AUTH_CONFIG.sessionTokenBytes).toString("hex")}`;
}
