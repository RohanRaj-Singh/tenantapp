import { createHash } from "crypto";
import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import { DASHBOARD_FILTER_KEYS, type DashboardFilterKey } from "./contracts";

function normalizeFilterValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function normalizeDashboardFilters(
  filters: Partial<Record<DashboardFilterKey | "fn", string | null | undefined>>,
): DashboardSnapshotFilters {
  return {
    stream: normalizeFilterValue(filters.stream),
    location: normalizeFilterValue(filters.location),
    function: normalizeFilterValue(filters.function ?? filters.fn),
    department: normalizeFilterValue(filters.department),
    gender: normalizeFilterValue(filters.gender),
    age: normalizeFilterValue(filters.age),
    seniority: normalizeFilterValue(filters.seniority),
  };
}

export function createFilterHash(filters: DashboardSnapshotFilters) {
  const serialized = JSON.stringify(
    DASHBOARD_FILTER_KEYS.map((key) => [key, filters[key]]),
  );

  return createHash("sha256").update(serialized).digest("hex");
}
