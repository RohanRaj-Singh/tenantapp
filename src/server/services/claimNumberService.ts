import { getRepositoryContext } from "@/src/server/repositories/context";

/** Counter document shape stored in the counters collection. */
export interface CounterDocument {
  _id: string;
  value: number;
}

const COUNTER_ID = "claimNumber";
const CLAIM_PREFIX = "RMB";

/**
 * Generate a unique claim reference number.
 *
 * Format: `RMB-YYYY-NNNNNN`
 * Example: `RMB-2026-000001`
 *
 * Uses an atomic counter increment to guarantee uniqueness.
 * The year is derived from the current system date.
 */
export async function generateClaimNumber(): Promise<string> {
  const repositories = await getRepositoryContext();
  const sequence = await repositories.reimbursements.incrementCounter(COUNTER_ID);
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(6, "0");
  return `${CLAIM_PREFIX}-${year}-${padded}`;
}
