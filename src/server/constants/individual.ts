/**
 * Reserved "Individual Members" tenant (FR-079, FR-082).
 *
 * Public / individual sign-ups are modelled as employees of this single
 * reserved tenant so the entire claim + chat + notification pipeline — all of
 * which require a non-null `tenantId` — works unchanged. The tenant is seeded
 * automatically (see memory + Mongo repository contexts) and is deliberately
 * hidden from the organisation picker and never provisioned with a tenant
 * admin: individual claims are reviewed by the Remedy super admin and sit
 * outside every organisation's budget and consolidated invoice.
 */
export const INDIVIDUAL_TENANT_ID = "tenant-individual";
export const INDIVIDUAL_TENANT_SLUG = "individual";
export const INDIVIDUAL_TENANT_NAME = "Individual Members";

/** True when a tenantId belongs to the reserved individual pool. */
export function isIndividualTenant(tenantId: string | null | undefined): boolean {
  return tenantId === INDIVIDUAL_TENANT_ID;
}
