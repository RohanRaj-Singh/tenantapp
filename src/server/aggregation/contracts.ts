import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import type {
  RawResponseDocument,
  RuntimeConfigDocument,
  TenantDocument,
} from "@/src/server/db/documents";

export const DASHBOARD_FILTER_KEYS = [
  "stream",
  "location",
  "function",
  "department",
  "gender",
  "age",
  "seniority",
] as const;

export type DashboardFilterKey = (typeof DASHBOARD_FILTER_KEYS)[number];

export interface AggregationScope {
  tenant: TenantDocument;
  runtimeConfig: RuntimeConfigDocument;
  filters: DashboardSnapshotFilters;
  period?: {
    from: string;
    to: string;
  };
}

export interface SubmissionScoreSummary {
  submissionId: string;
  sessionId: string;
  satisfactionScore: number;
  riskScore: number;
  riskStatus: "no-risk" | "low-risk" | "medium-risk" | "high-risk";
}

export interface AggregationPipelineInput {
  rawResponses: RawResponseDocument[];
  scope: AggregationScope;
}
