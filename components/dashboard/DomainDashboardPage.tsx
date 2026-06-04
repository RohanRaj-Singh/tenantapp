"use client";

import { useMemo } from "react";
import { Shield, Smile, TrendingUp, Users } from "lucide-react";
import DashboardFilters from "@/components/dashboard/filter/DashboardFilters";
import { DashboardErrorState, DashboardLoadingState } from "@/components/dashboard/DashboardStates";
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters";
import { getDomainMetric } from "@/lib/dashboardMockData";
import { useDashboardData } from "@/runtime/hooks/useDashboardData";
import { useTheme } from "@/runtime/theme/useTheme";
import { ScoreCard } from "@/components/dashboard/organizationDashboard/ScoreCard";
import { RiskLegend } from "@/components/dashboard/organizationDashboard/RiskLegend";
import { RankingTable } from "@/components/dashboard/organizationDashboard/RankingTable";
import { FearBlameChart } from "@/components/dashboard/organizationDashboard/FearBlameChart";
import { ComparisonChart } from "@/components/dashboard/organizationDashboard/ComparisonChart";
import { BarChartComponent } from "@/components/dashboard/organizationDashboard/BarChart";
import { SubdomainCard } from "@/components/dashboard/organizationDashboard/SubDomainCard";
import StreamSummeryCard from "@/components/dashboard/organizationDashboard/StreamSummeryCard";
import FunctionSummeryCard from "@/components/dashboard/organizationDashboard/FunctionSummeryCard";
import { Card } from "@/components/ui/card";

type DomainPageKey =
  | "clinical-risk-index"
  | "psychological-safety"
  | "workload-efficiency"
  | "leadership-alignment"
  | "satisfaction-engagement";

interface OverviewChartDatum {
  name: string;
  participantCount: number;
  highRiskCount: number;
  riskScore: number;
  satisfactionScore: number;
}

const PAGE_CONFIG: Record<
  DomainPageKey,
  {
    domainName: string;
    title: string;
    description: string;
  }
> = {
  "clinical-risk-index": {
    domainName: "Clinical Risk Index",
    title: "Clinical Risk Index",
    description: "Breakdown of burnout, anxiety, and depression indicators across your organization",
  },
  "psychological-safety": {
    domainName: "Psychological Safety Index",
    title: "Psychological Safety Index",
    description: "Assessment of employee trust, open communication, and interpersonal safety",
  },
  "workload-efficiency": {
    domainName: "Workload & Efficiency",
    title: "Workload & Efficiency",
    description: "Analysis of employee workload management and satisfaction across the organization",
  },
  "leadership-alignment": {
    domainName: "Leadership & Alignment",
    title: "Leadership & Alignment",
    description: "Analysis of leadership effectiveness and organizational alignment across demographics",
  },
  "satisfaction-engagement": {
    domainName: "Satisfaction & Engagement",
    title: "Satisfaction & Engagement",
    description: "Measure of employee satisfaction with colleagues, personal fulfillment, and workplace environment",
  },
};

function clampScore(score: number) {
  return Math.max(0, Math.min(score, 100));
}

function SimpleStatCard({
  title,
  count,
  accentClassName,
  icon,
}: {
  title: string;
  count: number;
  accentClassName: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={`p-6 ${accentClassName}`}>
      <div className="mb-2 flex items-center gap-3">
        {icon ?? <TrendingUp className="h-5 w-5" />}
        <h3 className="text-sm font-semibold md:text-lg">{title}</h3>
      </div>
      <p className="text-3xl font-bold">{count}</p>
    </Card>
  );
}

export default function DomainDashboardPage({ pageId }: { pageId: DomainPageKey }) {
  const theme = useTheme();
  const tenantName = theme.tenantName;
  const config = PAGE_CONFIG[pageId];
  const {
    filters,
    appliedFilters,
    filterKey,
    handleFilterChange,
    handleApplyFilters,
    resetFilters,
  } = useDashboardFilters();
  const { state: dashboardState, isLoading, refetch } = useDashboardData(tenantName, appliedFilters);

  const data =
    dashboardState.status === "ready" || dashboardState.status === "stale"
      ? dashboardState.data
      : null;
  const snapshot =
    dashboardState.status === "ready" || dashboardState.status === "stale"
      ? dashboardState.snapshot ?? null
      : null;

  const metric = useMemo(() => {
    if (!data) {
      return null;
    }
    return getDomainMetric(data, config.domainName);
  }, [config.domainName, data]);

  const subdomainMetrics = useMemo<OverviewChartDatum[]>(() => {
    if (!snapshot || !metric) return [];

    const category = snapshot.categoryMetrics.find(
      (item) => item.categoryLabel === config.domainName,
    );
    if (!category) return [];

    return snapshot.subdomainMetrics
      .filter((item) => item.categoryId === category.categoryId)
      .map((item) => {
        const participantCount = item.participantCount || metric.participants;
        const highRiskCount = item.riskDistribution.highRisk;
        const weightedRisk =
          participantCount > 0
            ? ((item.riskDistribution.lowRisk * 33) +
                (item.riskDistribution.mediumRisk * 66) +
                (item.riskDistribution.highRisk * 100)) /
              participantCount
            : 0;

        return {
          name: item.subdomainLabel,
          participantCount,
          highRiskCount,
          riskScore: Number(weightedRisk.toFixed(1)),
          satisfactionScore: Number((100 - weightedRisk).toFixed(1)),
        };
      });
  }, [config.domainName, metric, snapshot]);

  if (isLoading) {
    return <DashboardLoadingState label="Loading dashboard data..." />;
  }

  if (
    (dashboardState.status !== "ready" && dashboardState.status !== "stale") ||
    !data ||
    !metric
  ) {
    return (
      <DashboardErrorState
        title="Analytics Unavailable"
        description="The dashboard could not be loaded at this time."
        buttonLabel="Retry"
        onRetry={refetch}
      />
    );
  }

  const hasInsufficientData = data.totalParticipants < 4;
  const overviewChartData: OverviewChartDatum[] = subdomainMetrics.length
    ? subdomainMetrics
    : [
        {
          name: metric.domain,
          participantCount: metric.participants,
          highRiskCount: metric.highRiskSurveyCount,
          riskScore: metric.dashboardDomainAverage.averageRiskScore,
          satisfactionScore: metric.dashboardDomainAverage.averageSatisfactionScore,
        },
      ];

  const departmentRankingData = [...data.departmentStats]
    .sort((a, b) => b.satisfactionScore - a.satisfactionScore)
    .map((item) => ({
      department: item.department,
      satisfactionScore: item.satisfactionScore,
      riskScore: item.avgRisk,
    }));

  const genderComparisonData = data.genderStats.map((item) => ({
    name: item.gender,
    value: item.satisfactionScore,
    isSatisfactionScore: true,
  }));

  const departmentComparisonData = data.departmentStats.map((item) => ({
    name: item.department,
    value: item.satisfactionScore,
    isSatisfactionScore: true,
  }));

  const workloadVsSatisfactionData = data.departmentStats.map((item) => ({
    name: item.department,
    value1: item.avgRisk,
    value2: item.satisfactionScore,
  }));

  const streamSummaryData = data.streamStats.filter((item) => item.totalResponses > 2);
  const functionSummaryData = data.functionStats.filter((item) => item.totalResponses > 2);

  const fearBlameChartData = overviewChartData.map((item) => ({
    name: item.name,
    value: item.satisfactionScore,
  }));

  const clinicalTopCards = overviewChartData.slice(0, 3);
  const clinicalGaugeScore = Math.round(metric.dashboardDomainAverage.averageSatisfactionScore);
  const gaugeCircumference = 251.2;
  const gaugeOffset =
    gaugeCircumference - (Math.max(0, Math.min(clinicalGaugeScore, 100)) / 100) * gaugeCircumference;

  const scoreIconMap = {
    "clinical-risk-index": <TrendingUp className="h-6 w-6 text-emerald-600" />,
    "psychological-safety": <Shield className="h-6 w-6 text-blue-600" />,
    "workload-efficiency": (
      <TrendingUp className="h-6 w-6" style={{ color: theme.primaryColor }} />
    ),
    "leadership-alignment": <Users className="h-6 w-6 text-purple-600" />,
    "satisfaction-engagement": <Smile className="h-6 w-6 text-green-600" />,
  } as const;

  return (
    <div className="mx-auto px-4 py-8 md:px-8">
      <div className="mb-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 md:text-3xl">{config.title}</h1>
            <p className="mt-2 text-slate-600 md:text-lg">{config.description}</p>
          </div>
        </div>

        <DashboardFilters
          key={filterKey}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
          onReset={resetFilters}
          isLoading={isLoading}
          rollUpActive={snapshot?.anonymity.rollUpApplied ?? false}
        />
      </div>

      {hasInsufficientData ? (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Insufficient data to display results due to anonymity protection.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {pageId === "clinical-risk-index" ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <ScoreCard
                  title="Overall Index"
                  score={metric.dashboardDomainAverage.averageRiskScore}
                  icon={scoreIconMap[pageId]}
                  participantCount={data.totalParticipants}
                />
                {clinicalTopCards.map((item) => (
                  <ScoreCard
                    key={item.name}
                    title={item.name}
                    score={item.riskScore}
                    icon={<TrendingUp className="h-6 w-6 text-rose-500" />}
                    participantCount={item.participantCount}
                  />
                ))}
              </div>

              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Summary Statistics</h2>
                <SimpleStatCard
                  title="Total Participants"
                  count={data.totalParticipants}
                  accentClassName="bg-emerald-50 text-emerald-600"
                  icon={<Smile className="h-5 w-5" />}
                />
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BarChartComponent
                  title="Domain Breakdown"
                  description="Higher score = Lower clinical risk (better mental health)"
                  data={overviewChartData.map((item) => ({
                    name: item.name,
                    value: item.satisfactionScore,
                    isSatisfactionScore: true,
                  }))}
                />
                <Card className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">Overall Index Gauge</h3>
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <div className="flex justify-center">
                      <svg width="240" height="140" viewBox="0 0 240 140" className="overflow-visible">
                        <path
                          d="M 40 120 A 80 80 0 0 1 200 120"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="18"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 40 120 A 80 80 0 0 1 200 120"
                          fill="none"
                          stroke="#eab308"
                          strokeWidth="18"
                          strokeLinecap="round"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={gaugeOffset}
                        />
                      </svg>
                    </div>
                    <div className="-mt-2 text-center">
                      <p className="text-5xl font-bold text-slate-900">{clinicalGaugeScore}%</p>
                      <p className="mt-2 text-sm text-slate-500">{data.totalParticipants} participants</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {overviewChartData.map((item) => (
                  <SubdomainCard
                    key={item.name}
                    name={item.name}
                    score={item.riskScore}
                    participantCount={item.participantCount}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RiskLegend isClinical={true} />
                <Card className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">Key Indicators</h3>
                  <ul className="space-y-4 text-sm">
                    <li>
                      <p className="font-medium text-slate-900">Psychological Safety</p>
                      <p className="text-slate-600">Freedom to speak up without fear</p>
                    </li>
                    <li>
                      <p className="font-medium text-slate-900">Trust Refinement</p>
                      <p className="text-slate-600">Building interpersonal trust and reliability</p>
                    </li>
                    <li>
                      <p className="font-medium text-slate-900">Fear/Blame Intensity</p>
                      <p className="text-slate-600">Absence of punitive culture</p>
                    </li>
                  </ul>
                </Card>
              </div>
            </>
          ) : null}

          {pageId === "psychological-safety" ? (
            <>
              <Card className="border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Overall Psychological Safety</h3>
                </div>
                <p className="text-5xl font-bold text-slate-900">
                  {metric.dashboardDomainAverage.averageSatisfactionScore.toFixed(2)}%
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-700">Medium Risk</p>
                <div className="mt-5 h-2 rounded-full bg-amber-100">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${clampScore(metric.dashboardDomainAverage.averageSatisfactionScore)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">Based on {data.totalParticipants} participants</p>
              </Card>

              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Summary Statistics</h2>
                <SimpleStatCard
                  title="Total Participants"
                  count={data.totalParticipants}
                  accentClassName="bg-blue-50 text-blue-600"
                  icon={<TrendingUp className="h-5 w-5" />}
                />
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="p-6">
                  <h3 className="text-foreground mb-2 font-semibold">Department Rankings</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Psychological safety scores ranked from highest to lowest
                  </p>
                  <div className="space-y-2">
                    {departmentRankingData.map((item, index) => (
                      <div
                        key={item.department}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {index + 1}
                          </div>
                          <p className="truncate text-sm font-medium text-slate-800">
                            {item.department}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {item.satisfactionScore.toFixed(2)}%
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Risk: {item.riskScore?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <FearBlameChart
                  title="Fear/Blame Intensity Breakdown"
                  description="Percentage of employees showing indicators for each psychological safety domain"
                  data={fearBlameChartData}
                />
              </div>

              <div>
                <RiskLegend />
              </div>
            </>
          ) : null}

          {pageId === "workload-efficiency" ? (
            <>
              <Card className="tenant-soft-panel border p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp
                    className="h-4 w-4"
                    style={{ color: theme.primaryColor }}
                  />
                  <h3 className="text-sm font-semibold text-slate-900">Workload & Efficiency</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-slate-900">
                    {metric.dashboardDomainAverage.averageSatisfactionScore.toFixed(2)}
                  </p>
                  <span className="text-2xl text-slate-500">%</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-amber-700">Medium Risk</p>
                <div className="mt-5 h-2 rounded-full bg-amber-100">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${clampScore(metric.dashboardDomainAverage.averageSatisfactionScore)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">Based on {data.totalParticipants} participants</p>
              </Card>

              <ComparisonChart
                title="Workload vs Satisfaction by Department"
                data={workloadVsSatisfactionData}
                series1Name="Workload & Efficiency"
                series2Name="Satisfaction & Engagement"
                description="Comparison showing the relationship between workload management and satisfaction levels across departments"
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RiskLegend />
                <Card className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">Satisfaction Dimensions</h3>
                  <ul className="space-y-3 text-sm">
                    <li>
                      <p className="font-medium text-slate-900">Coworker Satisfaction</p>
                      <p className="mt-1 text-slate-600">Quality of relationships and team dynamics</p>
                    </li>
                    <li>
                      <p className="font-medium text-slate-900">Personal Satisfaction</p>
                      <p className="mt-1 text-slate-600">Career development and personal fulfillment</p>
                    </li>
                    <li>
                      <p className="font-medium text-slate-900">Workplace Satisfaction</p>
                      <p className="mt-1 text-slate-600">Work environment quality and resources</p>
                    </li>
                  </ul>
                </Card>
              </div>
            </>
          ) : null}

          {pageId === "leadership-alignment" ? (
            <>
              <Card className="border border-lime-200 bg-lime-50 p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Leadership & Alignment Score</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-slate-900">
                    {metric.dashboardDomainAverage.averageSatisfactionScore.toFixed(2)}
                  </p>
                  <span className="text-2xl text-slate-500">%</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-lime-700">Low Risk</p>
                <div className="mt-5 h-2 rounded-full bg-lime-100">
                  <div
                    className="h-2 rounded-full bg-lime-500"
                    style={{ width: `${clampScore(metric.dashboardDomainAverage.averageSatisfactionScore)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">Based on {data.totalParticipants} participants</p>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BarChartComponent
                  title="Leadership Score by Gender"
                  description="Leadership perception comparison across gender groups"
                  data={genderComparisonData}
                />
                <BarChartComponent
                  title="Leadership Score by Department"
                  description="Leadership effectiveness ranking across departments"
                  data={departmentComparisonData}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RiskLegend />
                <Card className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">Leadership Dimensions</h3>
                  <ul className="space-y-3 text-sm">
                    <li>
                      <p className="font-medium text-slate-900">Vision & Strategy</p>
                      <p className="mt-1 text-slate-600">Clear organizational direction and strategic alignment</p>
                    </li>
                    <li>
                      <p className="font-medium text-slate-900">Trust & Credibility</p>
                      <p className="mt-1 text-slate-600">Employee confidence in leadership decisions and integrity</p>
                    </li>
                    <li>
                      <p className="font-medium text-slate-900">Engagement & Communication</p>
                      <p className="mt-1 text-slate-600">Transparent and frequent organizational communication</p>
                    </li>
                  </ul>
                </Card>
              </div>
            </>
          ) : null}

          {pageId === "satisfaction-engagement" ? (
            <>
              <Card className="border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Smile className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Overall Satisfaction & Engagement</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-slate-900">
                    {metric.dashboardDomainAverage.averageSatisfactionScore.toFixed(2)}
                  </p>
                  <span className="text-2xl text-slate-500">%</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-amber-700">Medium Risk</p>
                <div className="mt-5 h-2 rounded-full bg-amber-100">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${clampScore(metric.dashboardDomainAverage.averageSatisfactionScore)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">Based on {data.totalParticipants} participants</p>
              </Card>

              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Satisfaction Subdomains</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {overviewChartData.map((item) => (
                    <SubdomainCard
                      key={item.name}
                      name={item.name}
                      score={item.satisfactionScore}
                      participantCount={item.participantCount}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Stream summary (3 Or More Participants)</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {streamSummaryData.map((item) => (
                    <StreamSummeryCard
                      key={item.stream}
                      data={{
                        stream: item.stream,
                        participants: item.totalResponses,
                        riskScore: item.avgRisk,
                        satisfiedScore: item.satisfactionScore,
                        riskStatus: "",
                        satisfactionStatus: "",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Function summary (3 Or More Participants)</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {functionSummaryData.map((item) => (
                    <FunctionSummeryCard
                      key={item.function}
                      data={{
                        function: item.function,
                        participants: item.totalResponses,
                        riskScore: item.avgRisk,
                        satisfiedScore: item.satisfactionScore,
                        riskStatus: "",
                        satisfactionStatus: "",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RiskLegend />
                <Card className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900">About This Index</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">What We Measure</p>
                      <p className="mt-1 text-slate-600">
                        The Satisfaction & Engagement Index reflects employee satisfaction across key dimensions: relationships with colleagues, personal fulfillment, and workplace environment satisfaction.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Why It Matters</p>
                      <p className="mt-1 text-slate-600">
                        High satisfaction correlates with better retention, productivity, and mental health outcomes.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
