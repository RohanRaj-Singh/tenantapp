export interface AggregationOutput {
  aggregationId: string;
  tenantId: string;
  scannerVersionId: string;
  computedAt: string;
  period: {
    from: string;
    to: string;
  };
  participation: {
    totalResponses: number;
    uniqueRespondents: number;
    completionRate: number;
  };
  categoryMetrics: Array<{
    categoryId: string;
    categoryLabel: string;
    averageScore: number;
    riskScore: number;
    satisfactionScore: number;
    riskStatus: 'no-risk' | 'low-risk' | 'medium-risk' | 'high-risk';
    participantCount: number;
  }>;
  subdomainMetrics: Array<{
    subdomainId: string;
    subdomainLabel: string;
    categoryId: string;
    averageScore: number;
    riskDistribution: {
      noRisk: number;
      lowRisk: number;
      mediumRisk: number;
      highRisk: number;
    };
  }>;
  demographicSummaries: {
    byAge: Array<{ ageGroup: string; participantCount: number; percentage: number; averageRiskScore: number }>;
    byGender: Array<{ gender: string; participantCount: number; percentage: number; averageRiskScore: number }>;
    byDepartment: Array<{ departmentId: string; departmentLabel: string; participantCount: number; percentage: number; averageRiskScore: number }>;
    byStream: Array<{ streamId: string; streamLabel: string; participantCount: number; averageRiskScore: number }>;
    byFunction: Array<{ functionId: string; functionLabel: string; participantCount: number; averageRiskScore: number }>;
    byLocation: Array<{ locationId: string; locationLabel: string; participantCount: number; averageRiskScore: number }>;
  };
  riskAnalysis: {
    highRiskResponders: number;
    mediumRiskResponders: number;
    lowRiskResponders: number;
    riskDistribution: Array<{ range: string; count: number }>;
  };
  anonymityCompliance: {
    rollUpApplied: boolean;
    removedFilters: string[];
    minimumThresholdMet: boolean;
  };
}

export interface DashboardSnapshotFilters {
  stream: string;
  location: string;
  function: string;
  department: string;
  gender: string;
  age: string;
  seniority: string;
}

export interface DashboardSnapshotCategoryMetric {
  categoryId: string;
  categoryLabel: string;
  participantCount: number;
  averageScore: number;
  riskScore: number;
  satisfactionScore: number;
  riskStatus: "no-risk" | "low-risk" | "medium-risk" | "high-risk";
}

export interface DashboardSnapshotSubdomainMetric {
  subdomainId: string;
  subdomainLabel: string;
  categoryId: string;
  participantCount: number;
  averageScore: number;
  riskDistribution: {
    noRisk: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
}

export interface DashboardSnapshotDemographicMetric {
  key: string;
  label: string;
  participantCount: number;
  percentage: number;
  averageRiskScore: number;
  satisfactionScore: number;
}

export interface DashboardAggregationSnapshot {
  snapshotId: string;
  tenantId: string;
  tenantSlug: string;
  runtimeConfigId: string;
  scannerVersionId: string;
  attributeTemplateVersionId: string;
  calculationVersionId: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  filters: DashboardSnapshotFilters;
  filterHash: string;
  source: {
    completedSubmissionCount: number;
    includedSubmissionCount: number;
    excludedSubmissionCount: number;
  };
  categoryMetrics: DashboardSnapshotCategoryMetric[];
  subdomainMetrics: DashboardSnapshotSubdomainMetric[];
  overallMetrics: {
    totalResponses: number;
    uniqueRespondents: number;
    completionRate: number;
    highRiskResponders: number;
    mediumRiskResponders: number;
    lowRiskResponders: number;
  };
  demographicMetrics: {
    byAge: DashboardSnapshotDemographicMetric[];
    byGender: DashboardSnapshotDemographicMetric[];
    byDepartment: DashboardSnapshotDemographicMetric[];
    byStream: DashboardSnapshotDemographicMetric[];
    byFunction: DashboardSnapshotDemographicMetric[];
    byLocation: DashboardSnapshotDemographicMetric[];
  };
  anonymity: {
    minimumThreshold: number;
    thresholdMet: boolean;
    rollUpApplied: boolean;
    removedFilters: string[];
  };
}

export type DashboardMetricsApiResponse =
  | {
      status: "ready";
      snapshot: DashboardAggregationSnapshot;
    }
  | {
      status: "pending_snapshot";
      requestedAt: string;
    };
