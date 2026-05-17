import type { DashboardAggregationSnapshot } from "@/runtime/contracts/aggregation";
import type { DashboardMockData } from "@/lib/dashboardMockData";

export type DashboardDataState =
  | { status: "loading" }
  | { status: "ready"; snapshot: DashboardAggregationSnapshot | null; data: DashboardMockData }
  | { status: "stale"; snapshot: DashboardAggregationSnapshot; data: DashboardMockData; generatedAt: string };
