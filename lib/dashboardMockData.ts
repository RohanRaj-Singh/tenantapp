import type { DashboardAggregationSnapshot } from "@/runtime/contracts/aggregation";

export interface DashboardDomainAverage {
  averageRiskScore: number;
  averageRiskStatus: string;
  averageSatisfactionScore: number;
  averageSatisfactionStatus: string;
}

export interface MentalHealthMetric {
  domain: string;
  participants: number;
  riskScore: number;
  satisfiedScore: number;
  riskStatus: string;
  satisfactionStatus: string;
  highRiskSurveyCount: number;
  nonHighRiskSurveyCount: number;
  dashboardDomainAverage: DashboardDomainAverage;
}

export interface AgeStat {
  ageGroup: string;
  people: number;
  peoplePercent: number;
  riskScore: number;
  satisfactionScore: number;
}

export interface GenderStat {
  gender: string;
  people: number;
  peoplePercent: number;
  riskScore: number;
  satisfactionScore: number;
}

export interface StreamStat {
  stream: string;
  totalResponses: number;
  departmentPercent: number;
  avgRisk: number;
  satisfactionScore: number;
  highRiskCount: number;
}

export interface FunctionStat {
  function: string;
  totalResponses: number;
  functionPercent: number;
  avgRisk: number;
  satisfactionScore: number;
  highRiskCount: number;
}

export interface DepartmentStat {
  department: string;
  totalResponses: number;
  departmentPercent: number;
  avgRisk: number;
  satisfactionScore: number;
  highRiskCount: number;
}

export interface LocationStat {
  location: string;
  totalResponses: number;
  locationPercent: number;
  avgRisk: number;
  satisfactionScore: number;
}

export interface EmailInvitationCampaign {
  name: string;
  status: "Draft" | "Scheduled" | "Sent" | "In Progress";
  scheduledFor: string;
  recipients: number;
  opened: number;
  completed: number;
}

export interface EmailInvitationOverview {
  uploadedEmployees: number;
  invitationsQueued: number;
  invitationsSent: number;
  completedResponses: number;
  securedUsers: number;
  lastPasswordRotation: string;
}

export interface DashboardMockData {
  mentalHealthMetrics: MentalHealthMetric[];
  ageStats: AgeStat[];
  genderStats: GenderStat[];
  streamStats: StreamStat[];
  functionStats: FunctionStat[];
  departmentStats: DepartmentStat[];
  locationStats: LocationStat[];
  organization: { name: string };
  totalParticipants: number;
  invitationOverview: EmailInvitationOverview | null;
  invitationCampaigns: EmailInvitationCampaign[] | null;
}

export type DashboardPageId =
  | "executive-summary"
  | "clinical-risk-index"
  | "psychological-safety"
  | "workload-efficiency"
  | "leadership-alignment"
  | "satisfaction-engagement"
  | "email-invitations";

export type TenantSurfacePageId =
  | DashboardPageId
  | "analytics"
  | "reports"
  | "settings"
  | "change-password";

export interface DashboardNavigationItem {
  id: TenantSurfacePageId;
  name: string;
  href: string;
  headerTitle?: string;
  description: string;
  domainName?: string;
}

export const dashboardNavigation: DashboardNavigationItem[] = [
  {
    id: "executive-summary",
    name: "Executive Summary",
    href: "/dashboard",
    description: "Organization survey statistics and executive-level wellbeing signals.",
  },
  {
    id: "clinical-risk-index",
    name: "Clinical Risk Index",
    href: "/dashboard/clinical-risk-index",
    description: "Breakdown of burnout, anxiety, and depression indicators across your organization.",
    domainName: "Clinical Risk Index",
  },
  {
    id: "psychological-safety",
    name: "Psychological Safety",
    href: "/dashboard/psychological-safety",
    headerTitle: "Psychological Safety Index",
    description: "Assessment of employee trust, open communication, and interpersonal safety.",
    domainName: "Psychological Safety Index",
  },
  {
    id: "workload-efficiency",
    name: "Workload & Efficiency",
    href: "/dashboard/workload-efficiency",
    description: "Analysis of employee workload management and satisfaction across the organization.",
    domainName: "Workload & Efficiency",
  },
  {
    id: "leadership-alignment",
    name: "Leadership & Alignment",
    href: "/dashboard/leadership-alignment",
    description: "Analysis of leadership effectiveness and organizational alignment across demographics.",
    domainName: "Leadership & Alignment",
  },
  {
    id: "satisfaction-engagement",
    name: "Satisfaction & Engagement",
    href: "/dashboard/satisfaction-engagement",
    description:
      "Measure of employee satisfaction with colleagues, personal fulfillment, and workplace environment.",
    domainName: "Satisfaction & Engagement",
  },
  {
    id: "email-invitations",
    name: "Email Invitations",
    href: "/dashboard/email-invitations",
    description: "Upload employee list, send survey invitations, and monitor completion status.",
  },
];

export const tenantAccessNavigation: DashboardNavigationItem[] = [
  {
    id: "analytics",
    name: "Analytics",
    href: "/analytics",
    description: "Protected organizational analytics and cross-domain insight summaries.",
  },
  {
    id: "reports",
    name: "Reports",
    href: "/reports",
    description: "Protected reporting surfaces for downloadable and review-ready summaries.",
  },
  {
    id: "settings",
    name: "Settings",
    href: "/settings",
    description: "Limited tenant settings for the single dashboard owner account.",
  },
];

export const tenantAuxiliaryNavigation: DashboardNavigationItem[] = [
  {
    id: "change-password",
    name: "Change Password",
    href: "/change-password",
    description: "Update the dashboard owner password before resuming access.",
  },
];

export const tenantSurfaceNavigation: DashboardNavigationItem[] = [
  ...dashboardNavigation,
  ...tenantAccessNavigation,
  ...tenantAuxiliaryNavigation,
];

export const domainPageIds: DashboardPageId[] = [
  "clinical-risk-index",
  "psychological-safety",
  "workload-efficiency",
  "leadership-alignment",
  "satisfaction-engagement",
];

const DASHBOARD_DOMAIN_NAMES = [
  "Clinical Risk Index",
  "Psychological Safety Index",
  "Workload & Efficiency",
  "Leadership & Alignment",
  "Satisfaction & Engagement",
] as const;

const ZERO_STATE_LABEL = "Current View";

export function getDashboardMeta(pathname: string): DashboardNavigationItem {
  const exactMatch = tenantSurfaceNavigation.find((item) => item.href === pathname);
  if (exactMatch) {
    return exactMatch;
  }

  return (
    tenantSurfaceNavigation.find(
      (item) => item.href !== "/dashboard" && pathname.startsWith(item.href),
    ) ??
    dashboardNavigation[0]
  );
}

function createZeroMentalHealthMetric(domain: string): MentalHealthMetric {
  return {
    domain,
    participants: 0,
    riskScore: 0,
    satisfiedScore: 0,
    riskStatus: "no-risk",
    satisfactionStatus: "no-risk",
    highRiskSurveyCount: 0,
    nonHighRiskSurveyCount: 0,
    dashboardDomainAverage: {
      averageRiskScore: 0,
      averageRiskStatus: "no-risk",
      averageSatisfactionScore: 0,
      averageSatisfactionStatus: "no-risk",
    },
  };
}

export function createZeroDashboardData(tenantName: string): DashboardMockData {
  return {
    mentalHealthMetrics: DASHBOARD_DOMAIN_NAMES.map((domain) => createZeroMentalHealthMetric(domain)),
    ageStats: [
      {
        ageGroup: ZERO_STATE_LABEL,
        people: 0,
        peoplePercent: 0,
        riskScore: 0,
        satisfactionScore: 0,
      },
    ],
    genderStats: [
      {
        gender: ZERO_STATE_LABEL,
        people: 0,
        peoplePercent: 0,
        riskScore: 0,
        satisfactionScore: 0,
      },
    ],
    streamStats: [
      {
        stream: ZERO_STATE_LABEL,
        totalResponses: 0,
        departmentPercent: 0,
        avgRisk: 0,
        satisfactionScore: 0,
        highRiskCount: 0,
      },
    ],
    functionStats: [
      {
        function: ZERO_STATE_LABEL,
        totalResponses: 0,
        functionPercent: 0,
        avgRisk: 0,
        satisfactionScore: 0,
        highRiskCount: 0,
      },
    ],
    departmentStats: [
      {
        department: ZERO_STATE_LABEL,
        totalResponses: 0,
        departmentPercent: 0,
        avgRisk: 0,
        satisfactionScore: 0,
        highRiskCount: 0,
      },
    ],
    locationStats: [
      {
        location: ZERO_STATE_LABEL,
        totalResponses: 0,
        locationPercent: 0,
        avgRisk: 0,
        satisfactionScore: 0,
      },
    ],
    organization: {
      name: tenantName,
    },
    totalParticipants: 0,
    invitationOverview: null,
    invitationCampaigns: null,
  };
}

export function getDashboardMockData(tenantName: string): DashboardMockData {
  return {
    mentalHealthMetrics: [
      {
        domain: "Clinical Risk Index",
        participants: 145,
        riskScore: 42,
        satisfiedScore: 58,
        riskStatus: "medium-risk",
        satisfactionStatus: "medium-risk",
        highRiskSurveyCount: 35,
        nonHighRiskSurveyCount: 110,
        dashboardDomainAverage: {
          averageRiskScore: 42,
          averageRiskStatus: "medium-risk",
          averageSatisfactionScore: 58,
          averageSatisfactionStatus: "medium-risk",
        },
      },
      {
        domain: "Psychological Safety Index",
        participants: 145,
        riskScore: 25,
        satisfiedScore: 75,
        riskStatus: "low-risk",
        satisfactionStatus: "low-risk",
        highRiskSurveyCount: 20,
        nonHighRiskSurveyCount: 125,
        dashboardDomainAverage: {
          averageRiskScore: 25,
          averageRiskStatus: "low-risk",
          averageSatisfactionScore: 75,
          averageSatisfactionStatus: "low-risk",
        },
      },
      {
        domain: "Workload & Efficiency",
        participants: 145,
        riskScore: 37,
        satisfiedScore: 63,
        riskStatus: "medium-risk",
        satisfactionStatus: "medium-risk",
        highRiskSurveyCount: 28,
        nonHighRiskSurveyCount: 117,
        dashboardDomainAverage: {
          averageRiskScore: 37,
          averageRiskStatus: "medium-risk",
          averageSatisfactionScore: 63,
          averageSatisfactionStatus: "medium-risk",
        },
      },
      {
        domain: "Leadership & Alignment",
        participants: 145,
        riskScore: 32,
        satisfiedScore: 68,
        riskStatus: "low-risk",
        satisfactionStatus: "low-risk",
        highRiskSurveyCount: 24,
        nonHighRiskSurveyCount: 121,
        dashboardDomainAverage: {
          averageRiskScore: 32,
          averageRiskStatus: "low-risk",
          averageSatisfactionScore: 68,
          averageSatisfactionStatus: "low-risk",
        },
      },
      {
        domain: "Satisfaction & Engagement",
        participants: 145,
        riskScore: 28,
        satisfiedScore: 72,
        riskStatus: "low-risk",
        satisfactionStatus: "low-risk",
        highRiskSurveyCount: 22,
        nonHighRiskSurveyCount: 123,
        dashboardDomainAverage: {
          averageRiskScore: 28,
          averageRiskStatus: "low-risk",
          averageSatisfactionScore: 72,
          averageSatisfactionStatus: "low-risk",
        },
      },
    ],
    ageStats: [
      { ageGroup: "18-24", people: 25, peoplePercent: 17, riskScore: 35, satisfactionScore: 65 },
      { ageGroup: "25-34", people: 50, peoplePercent: 34, riskScore: 38, satisfactionScore: 62 },
      { ageGroup: "35-44", people: 40, peoplePercent: 27, riskScore: 42, satisfactionScore: 58 },
      { ageGroup: "45-54", people: 25, peoplePercent: 17, riskScore: 45, satisfactionScore: 55 },
      { ageGroup: "55+", people: 10, peoplePercent: 5, riskScore: 40, satisfactionScore: 60 },
    ],
    genderStats: [
      { gender: "male", people: 70, peoplePercent: 48, riskScore: 36, satisfactionScore: 64 },
      { gender: "female", people: 65, peoplePercent: 45, riskScore: 40, satisfactionScore: 60 },
      { gender: "non-binary", people: 10, peoplePercent: 7, riskScore: 38, satisfactionScore: 62 },
    ],
    streamStats: [
      {
        stream: "Emergency",
        totalResponses: 30,
        departmentPercent: 20,
        avgRisk: 42,
        satisfactionScore: 58,
        highRiskCount: 8,
      },
      {
        stream: "Outpatient",
        totalResponses: 25,
        departmentPercent: 17,
        avgRisk: 35,
        satisfactionScore: 65,
        highRiskCount: 5,
      },
      {
        stream: "Inpatient",
        totalResponses: 20,
        departmentPercent: 13,
        avgRisk: 40,
        satisfactionScore: 60,
        highRiskCount: 6,
      },
      {
        stream: "Surgery",
        totalResponses: 15,
        departmentPercent: 10,
        avgRisk: 38,
        satisfactionScore: 62,
        highRiskCount: 4,
      },
      {
        stream: "ICU",
        totalResponses: 10,
        departmentPercent: 7,
        avgRisk: 45,
        satisfactionScore: 55,
        highRiskCount: 3,
      },
    ],
    functionStats: [
      {
        function: "Doctors",
        totalResponses: 35,
        functionPercent: 24,
        avgRisk: 38,
        satisfactionScore: 62,
        highRiskCount: 9,
      },
      {
        function: "Nurses",
        totalResponses: 45,
        functionPercent: 31,
        avgRisk: 40,
        satisfactionScore: 60,
        highRiskCount: 12,
      },
      {
        function: "Technicians",
        totalResponses: 25,
        functionPercent: 17,
        avgRisk: 35,
        satisfactionScore: 65,
        highRiskCount: 5,
      },
      {
        function: "Administrators",
        totalResponses: 20,
        functionPercent: 14,
        avgRisk: 32,
        satisfactionScore: 68,
        highRiskCount: 4,
      },
      {
        function: "Support Staff",
        totalResponses: 20,
        functionPercent: 14,
        avgRisk: 42,
        satisfactionScore: 58,
        highRiskCount: 6,
      },
    ],
    departmentStats: [
      {
        department: "Clinical",
        totalResponses: 40,
        departmentPercent: 27,
        avgRisk: 38,
        satisfactionScore: 62,
        highRiskCount: 10,
      },
      {
        department: "Administrative",
        totalResponses: 35,
        departmentPercent: 24,
        avgRisk: 35,
        satisfactionScore: 65,
        highRiskCount: 7,
      },
      {
        department: "Technical",
        totalResponses: 30,
        departmentPercent: 20,
        avgRisk: 40,
        satisfactionScore: 60,
        highRiskCount: 9,
      },
      {
        department: "Support",
        totalResponses: 25,
        departmentPercent: 17,
        avgRisk: 42,
        satisfactionScore: 58,
        highRiskCount: 8,
      },
      {
        department: "Management",
        totalResponses: 20,
        departmentPercent: 12,
        avgRisk: 30,
        satisfactionScore: 70,
        highRiskCount: 3,
      },
    ],
    locationStats: [
      { location: "Main Hospital", totalResponses: 60, locationPercent: 41, avgRisk: 38, satisfactionScore: 62 },
      { location: "West Clinic", totalResponses: 40, locationPercent: 27, avgRisk: 35, satisfactionScore: 65 },
      { location: "East Clinic", totalResponses: 30, locationPercent: 20, avgRisk: 42, satisfactionScore: 58 },
      { location: "North Outreach", totalResponses: 15, locationPercent: 10, avgRisk: 40, satisfactionScore: 60 },
      { location: "South Outreach", totalResponses: 5, locationPercent: 2, avgRisk: 38, satisfactionScore: 62 },
    ],
    organization: {
      name: tenantName,
    },
    totalParticipants: 150,
    invitationOverview: {
      uploadedEmployees: 168,
      invitationsQueued: 145,
      invitationsSent: 132,
      completedResponses: 91,
      securedUsers: 4,
      lastPasswordRotation: "April 29, 2026",
    },
    invitationCampaigns: [
      {
        name: "Q2 Workforce Pulse",
        status: "In Progress",
        scheduledFor: "May 9, 2026",
        recipients: 68,
        opened: 47,
        completed: 29,
      },
      {
        name: "Leadership Follow-Up",
        status: "Scheduled",
        scheduledFor: "May 12, 2026",
        recipients: 42,
        opened: 0,
        completed: 0,
      },
      {
        name: "Clinical Teams Refresh",
        status: "Sent",
        scheduledFor: "May 4, 2026",
        recipients: 35,
        opened: 29,
        completed: 24,
      },
    ],
  };
}

function placeholderMetricLabel(label: string) {
  return label || ZERO_STATE_LABEL;
}

function toPercent(value: number) {
  return Number(value.toFixed(0));
}

function ensureRows<T>(items: T[], fallbackItem: T) {
  return items.length > 0 ? items : [fallbackItem];
}

export function buildDashboardDataFromSnapshot(
  snapshot: DashboardAggregationSnapshot,
  tenantName: string,
): DashboardMockData {
  if (
    snapshot.overallMetrics.totalResponses <= 0 ||
    snapshot.overallMetrics.uniqueRespondents <= 0
  ) {
    return createZeroDashboardData(tenantName);
  }

  const mentalHealthMetrics = snapshot.categoryMetrics.map((metric) => {
    const highRiskSurveyCount = snapshot.subdomainMetrics
      .filter((subdomainMetric) => subdomainMetric.categoryId === metric.categoryId)
      .reduce((sum, subdomainMetric) => sum + subdomainMetric.riskDistribution.highRisk, 0);

    return {
      domain: metric.categoryLabel,
      participants: metric.participantCount,
      riskScore: toPercent(metric.riskScore),
      satisfiedScore: toPercent(metric.satisfactionScore),
      riskStatus: metric.riskStatus,
      satisfactionStatus: metric.riskStatus,
      highRiskSurveyCount,
      nonHighRiskSurveyCount: Math.max(metric.participantCount - highRiskSurveyCount, 0),
      dashboardDomainAverage: {
        averageRiskScore: toPercent(metric.riskScore),
        averageRiskStatus: metric.riskStatus,
        averageSatisfactionScore: toPercent(metric.satisfactionScore),
        averageSatisfactionStatus: metric.riskStatus,
      },
    };
  });

  const ageStats = ensureRows(
    snapshot.demographicMetrics.byAge.map((row) => ({
      ageGroup: placeholderMetricLabel(row.label),
      people: row.participantCount,
      peoplePercent: toPercent(row.percentage),
      riskScore: toPercent(row.averageRiskScore),
      satisfactionScore: toPercent(row.satisfactionScore),
    })),
    {
      ageGroup: ZERO_STATE_LABEL,
      people: 0,
      peoplePercent: 0,
      riskScore: 0,
      satisfactionScore: 0,
    },
  );
  const genderStats = ensureRows(
    snapshot.demographicMetrics.byGender.map((row) => ({
      gender: placeholderMetricLabel(row.label),
      people: row.participantCount,
      peoplePercent: toPercent(row.percentage),
      riskScore: toPercent(row.averageRiskScore),
        satisfactionScore: toPercent(row.satisfactionScore),
    })),
    {
      gender: ZERO_STATE_LABEL,
      people: 0,
      peoplePercent: 0,
      riskScore: 0,
      satisfactionScore: 0,
    },
  );
  const streamStats = ensureRows(
    snapshot.demographicMetrics.byStream.map((row) => ({
      stream: placeholderMetricLabel(row.label),
      totalResponses: row.participantCount,
      departmentPercent: toPercent(row.percentage),
      avgRisk: toPercent(row.averageRiskScore),
      satisfactionScore: toPercent(row.satisfactionScore),
        highRiskCount: 0,
    })),
    {
      stream: ZERO_STATE_LABEL,
      totalResponses: 0,
      departmentPercent: 0,
      avgRisk: 0,
      satisfactionScore: 0,
      highRiskCount: 0,
    },
  );
  const functionStats = ensureRows(
    snapshot.demographicMetrics.byFunction.map((row) => ({
      function: placeholderMetricLabel(row.label),
      totalResponses: row.participantCount,
      functionPercent: toPercent(row.percentage),
      avgRisk: toPercent(row.averageRiskScore),
      satisfactionScore: toPercent(row.satisfactionScore),
      highRiskCount: 0,
    })),
    {
      function: ZERO_STATE_LABEL,
      totalResponses: 0,
      functionPercent: 0,
      avgRisk: 0,
      satisfactionScore: 0,
      highRiskCount: 0,
    },
  );
  const departmentStats = ensureRows(
    snapshot.demographicMetrics.byDepartment.map((row) => ({
      department: placeholderMetricLabel(row.label),
      totalResponses: row.participantCount,
      departmentPercent: toPercent(row.percentage),
      avgRisk: toPercent(row.averageRiskScore),
      satisfactionScore: toPercent(row.satisfactionScore),
      highRiskCount: 0,
    })),
    {
      department: ZERO_STATE_LABEL,
      totalResponses: 0,
      departmentPercent: 0,
      avgRisk: 0,
      satisfactionScore: 0,
      highRiskCount: 0,
    },
  );
  const locationStats = ensureRows(
    snapshot.demographicMetrics.byLocation.map((row) => ({
      location: placeholderMetricLabel(row.label),
      totalResponses: row.participantCount,
      locationPercent: toPercent(row.percentage),
      avgRisk: toPercent(row.averageRiskScore),
      satisfactionScore: toPercent(row.satisfactionScore),
    })),
    {
      location: ZERO_STATE_LABEL,
      totalResponses: 0,
      locationPercent: 0,
      avgRisk: 0,
      satisfactionScore: 0,
    },
  );

  return {
    mentalHealthMetrics,
    ageStats,
    genderStats,
    streamStats,
    functionStats,
    departmentStats,
    locationStats,
    organization: {
      name: tenantName,
    },
    totalParticipants: snapshot.overallMetrics.uniqueRespondents,
    invitationOverview: null,
    invitationCampaigns: null,
  };
}

export function getDomainMetric(data: DashboardMockData, domainName: string): MentalHealthMetric {
  const metric = data.mentalHealthMetrics.find((item) => item.domain === domainName);

  if (!metric) {
    console.warn(
      `Dashboard domain "${domainName}" not found in data. Available domains:`,
      data.mentalHealthMetrics.map((m) => m.domain),
    );
    return createZeroMentalHealthMetric(domainName);
  }

  return metric;
}

export function getStatusTone(score: number): {
  label: string;
  textClassName: string;
  backgroundClassName: string;
} {
  if (score >= 75) {
    return {
      label: "Thriving",
      textClassName: "text-emerald-700",
      backgroundClassName: "bg-emerald-100",
    };
  }

  if (score >= 65) {
    return {
      label: "Stable",
      textClassName: "text-sky-700",
      backgroundClassName: "bg-sky-100",
    };
  }

  if (score >= 55) {
    return {
      label: "Watchlist",
      textClassName: "text-amber-700",
      backgroundClassName: "bg-amber-100",
    };
  }

  return {
    label: "At Risk",
    textClassName: "text-rose-700",
    backgroundClassName: "bg-rose-100",
  };
}

export function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}
