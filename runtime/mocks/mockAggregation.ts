import { AggregationOutput } from '../contracts/aggregation';

export const mockAggregation: AggregationOutput = {
  aggregationId: 'agg-demo-001',
  tenantId: 'tenant-demo-001',
  scannerVersionId: 'scanner-v1',
  computedAt: new Date().toISOString(),
  period: {
    from: '2024-01-01T00:00:00.000Z',
    to: new Date().toISOString(),
  },
  participation: {
    totalResponses: 150,
    uniqueRespondents: 142,
    completionRate: 0.95,
  },
  categoryMetrics: [
    {
      categoryId: 'cat-1',
      categoryLabel: 'Satisfaction & Engagement',
      averageScore: 72,
      riskScore: 28,
      satisfactionScore: 72,
      riskStatus: 'low-risk',
      participantCount: 145,
    },
    {
      categoryId: 'cat-2',
      categoryLabel: 'Clinical Risk Index',
      averageScore: 58,
      riskScore: 42,
      satisfactionScore: 58,
      riskStatus: 'medium-risk',
      participantCount: 145,
    },
  ],
  subdomainMetrics: [],
  demographicSummaries: {
    byAge: [
      { ageGroup: '18-24', participantCount: 25, percentage: 17, averageRiskScore: 35 },
      { ageGroup: '25-34', participantCount: 50, percentage: 34, averageRiskScore: 38 },
    ],
    byGender: [
      { gender: 'male', participantCount: 70, percentage: 48, averageRiskScore: 36 },
      { gender: 'female', participantCount: 65, percentage: 45, averageRiskScore: 40 },
    ],
    byDepartment: [],
    byStream: [],
    byFunction: [],
    byLocation: [],
  },
  riskAnalysis: {
    highRiskResponders: 15,
    mediumRiskResponders: 45,
    lowRiskResponders: 80,
    riskDistribution: [
      { range: '0-25', count: 15 },
      { range: '26-50', count: 45 },
      { range: '51-75', count: 50 },
      { range: '76-100', count: 35 },
    ],
  },
  anonymityCompliance: {
    rollUpApplied: false,
    removedFilters: [],
    minimumThresholdMet: true,
  },
};