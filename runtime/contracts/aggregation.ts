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