"use client";

import { useMemo } from "react";
import { Activity, ShieldAlert, Sparkles, Users } from "lucide-react";
import DashboardFilters from "@/components/dashboard/filter/DashboardFilters";
import {
  DetailListCard,
  MeterList,
  SectionCard,
  StatCard,
  StatusLegendCard,
} from "@/components/dashboard/DashboardPrimitives";
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters";
import {
  formatLabel,
  getDashboardMockData,
  getDomainMetric,
  getStatusTone,
} from "@/lib/dashboardMockData";
import { useTheme } from "@/runtime/theme/useTheme";

type DomainPageKey =
  | "clinical-risk-index"
  | "psychological-safety"
  | "workload-efficiency"
  | "leadership-alignment"
  | "satisfaction-engagement";

type DetailTone = "primary" | "secondary" | "success" | "info" | "warning" | "danger" | "neutral";

const PAGE_CONFIG: Record<
  DomainPageKey,
  {
    domainName: string;
    statLabel: string;
    primaryTitle: string;
    primaryDescription: string;
    secondaryTitle: string;
    secondaryDescription: string;
    detailTitle: string;
    detailItems: { title: string; description: string; tone: DetailTone }[];
  }
> = {
  "clinical-risk-index": {
    domainName: "Clinical Risk Index",
    statLabel: "Overall Index",
    primaryTitle: "Domain Breakdown",
    primaryDescription: "Risk concentration by age group based on the current organization snapshot.",
    secondaryTitle: "Overall Index Gauge",
    secondaryDescription: "Higher score means lower clinical risk and better resilience capacity.",
    detailTitle: "Key Indicators",
    detailItems: [
      {
        title: "Burnout exposure",
        description: "Track teams with elevated workload strain and emotional exhaustion signals.",
        tone: "danger",
      },
      {
        title: "Recovery confidence",
        description: "Use satisfaction movement to spot where support systems are improving recovery.",
        tone: "info",
      },
      {
        title: "Escalation watch",
        description: "Pair high-risk counts with location trends to prioritize early intervention.",
        tone: "warning",
      },
    ],
  },
  "psychological-safety": {
    domainName: "Psychological Safety Index",
    statLabel: "Safety Score",
    primaryTitle: "Department Rankings",
    primaryDescription: "Departments ranked by satisfaction as a proxy for trust and interpersonal safety.",
    secondaryTitle: "Fear/Blame Intensity Breakdown",
    secondaryDescription: "A simplified distribution of pressure signals across current reporting groups.",
    detailTitle: "Psychological Safety Signals",
    detailItems: [
      {
        title: "Trust & openness",
        description: "Strong psychological safety shows up where teams feel safe to speak candidly.",
        tone: "info",
      },
      {
        title: "Learning climate",
        description: "Monitor whether mistakes are treated as learning moments instead of blame events.",
        tone: "success",
      },
      {
        title: "Interpersonal safety",
        description: "Use department rankings to spot where everyday interactions still feel risky.",
        tone: "secondary",
      },
    ],
  },
  "workload-efficiency": {
    domainName: "Workload & Efficiency",
    statLabel: "Efficiency Score",
    primaryTitle: "Workload vs Satisfaction by Department",
    primaryDescription: "A minimal comparison of demand pressure against perceived satisfaction.",
    secondaryTitle: "Satisfaction Dimensions",
    secondaryDescription: "The three practical dimensions used in the source organization dashboard.",
    detailTitle: "Satisfaction Dimensions",
    detailItems: [
      {
        title: "Coworker Satisfaction",
        description: "Quality of relationships and team dynamics.",
        tone: "success",
      },
      {
        title: "Personal Satisfaction",
        description: "Career development and personal fulfillment.",
        tone: "info",
      },
      {
        title: "Workplace Satisfaction",
        description: "Work environment quality and access to the right resources.",
        tone: "warning",
      },
    ],
  },
  "leadership-alignment": {
    domainName: "Leadership & Alignment",
    statLabel: "Leadership Score",
    primaryTitle: "Leadership Score by Gender",
    primaryDescription: "Perception of leadership effectiveness across gender groups.",
    secondaryTitle: "Leadership Score by Department",
    secondaryDescription: "A department-level view of leadership effectiveness and alignment.",
    detailTitle: "Leadership Dimensions",
    detailItems: [
      {
        title: "Vision & Strategy",
        description: "Clear organizational direction and strategic alignment.",
        tone: "secondary",
      },
      {
        title: "Trust & Credibility",
        description: "Employee confidence in leadership decisions and integrity.",
        tone: "primary",
      },
      {
        title: "Engagement & Communication",
        description: "Transparent and frequent organizational communication.",
        tone: "info",
      },
    ],
  },
  "satisfaction-engagement": {
    domainName: "Satisfaction & Engagement",
    statLabel: "Overall Satisfaction",
    primaryTitle: "Satisfaction Subdomains",
    primaryDescription: "The same three satisfaction themes highlighted in the source dashboard.",
    secondaryTitle: "Stream summary (3 Or More Participants)",
    secondaryDescription: "A stream-level snapshot sized to the current mock organization view.",
    detailTitle: "About This Index",
    detailItems: [
      {
        title: "What We Measure",
        description:
          "The Satisfaction & Engagement Index reflects relationships, fulfillment, and workplace experience.",
        tone: "success",
      },
      {
        title: "Why It Matters",
        description:
          "High satisfaction correlates with stronger retention, productivity, and healthier teams.",
        tone: "info",
      },
      {
        title: "How To Use It",
        description: "Combine stream and function summaries to spot where engagement support should start.",
        tone: "warning",
      },
    ],
  },
};

function clampScore(score: number) {
  return Math.max(0, Math.min(score, 100));
}

export default function DomainDashboardPage({ pageId }: { pageId: DomainPageKey }) {
  const theme = useTheme();
  const tenantName = theme.tenantName;
  const data = useMemo(() => getDashboardMockData(tenantName), [tenantName]);
  const config = PAGE_CONFIG[pageId];
  const metric = getDomainMetric(data, config.domainName);
  const {
    filters,
    filterKey,
    handleFilterChange,
    handleApplyFilters,
    resetFilters,
  } = useDashboardFilters();

  const toneColorMap: Record<DetailTone, string> = {
    primary: theme.chartColors.primary,
    secondary: theme.chartColors.secondary,
    success: theme.chartColors.success,
    info: theme.chartColors.info,
    warning: theme.chartColors.warning,
    danger: theme.chartColors.danger,
    neutral: theme.chartColors.neutral,
  };

  const status = getStatusTone(metric.dashboardDomainAverage.averageSatisfactionScore);
  const topLocation = [...data.locationStats].sort((a, b) => b.satisfactionScore - a.satisfactionScore)[0];
  const highestRiskDepartment = [...data.departmentStats].sort((a, b) => b.avgRisk - a.avgRisk)[0];

  const baseStats = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={config.statLabel}
        value={`${metric.dashboardDomainAverage.averageSatisfactionScore}%`}
        caption={`${status.label} status based on the current satisfaction score.`}
        icon={<Sparkles className="h-4 w-4" />}
        badge={status.label}
        accentColor={theme.chartColors.primary}
      />
      <StatCard
        title="Risk Score"
        value={`${metric.dashboardDomainAverage.averageRiskScore}%`}
        caption={`${metric.highRiskSurveyCount} high-risk responses currently flagged in this domain.`}
        icon={<ShieldAlert className="h-4 w-4" />}
        accentColor={theme.chartColors.danger}
      />
      <StatCard
        title="Participants"
        value={String(metric.participants)}
        caption="Eligible responses currently contributing to this domain snapshot."
        icon={<Users className="h-4 w-4" />}
        accentColor={theme.chartColors.info}
      />
      <StatCard
        title="Best Performing Location"
        value={topLocation.location}
        caption={`${topLocation.satisfactionScore}% satisfaction with ${topLocation.totalResponses} responses.`}
        icon={<Activity className="h-4 w-4" />}
        accentColor={theme.chartColors.success}
      />
    </div>
  );

  if (pageId === "clinical-risk-index") {
    const breakdownItems = [...data.ageStats]
      .sort((a, b) => b.riskScore - a.riskScore)
      .map((item) => ({
        label: item.ageGroup,
        value: item.riskScore,
        caption: `${item.people} participants - ${item.satisfactionScore}% satisfaction`,
      }));

    return (
      <div className="space-y-6">
        {baseStats}
        <DashboardFilters
          key={filterKey}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
          onReset={resetFilters}
          isLoading={false}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Summary Statistics" description="Current participation for this domain view.">
            <div className="rounded-[1.25rem] p-4" style={{ backgroundColor: theme.surfaceAccentStrong }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Participants</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{data.totalParticipants}</p>
            </div>
          </SectionCard>
          <SectionCard title={config.secondaryTitle} description={config.secondaryDescription}>
            <div className="rounded-[1.25rem] p-5" style={{ backgroundColor: theme.surfaceAccentStrong }}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Clinical Risk</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-900">
                    {metric.dashboardDomainAverage.averageRiskScore}%
                  </p>
                </div>
                <span className="tenant-outline-chip rounded-full px-3 py-1 text-xs font-medium shadow-sm">
                  Higher is healthier
                </span>
              </div>
              <div className="mt-5 h-2.5 rounded-full bg-slate-200">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${clampScore(metric.dashboardDomainAverage.averageRiskScore)}%`,
                    backgroundColor: theme.primaryColor,
                  }}
                />
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title={config.primaryTitle} description={config.primaryDescription}>
            <MeterList items={breakdownItems} accentColor={theme.chartColors.danger} />
          </SectionCard>
          <DetailListCard
            title={config.detailTitle}
            items={[
              ...config.detailItems.map((item) => ({
                title: item.title,
                description: item.description,
                toneColor: toneColorMap[item.tone],
              })),
              {
                title: "Most exposed department",
                description: `${highestRiskDepartment.department} is currently carrying the highest average risk score at ${highestRiskDepartment.avgRisk}%.`,
                toneColor: theme.chartColors.primary,
              },
            ]}
          />
        </div>
        <StatusLegendCard />
      </div>
    );
  }

  if (pageId === "psychological-safety") {
    const departmentItems = [...data.departmentStats]
      .sort((a, b) => b.satisfactionScore - a.satisfactionScore)
      .map((item) => ({
        label: item.department,
        value: item.satisfactionScore,
        caption: `${item.totalResponses} responses - ${item.avgRisk}% risk`,
      }));

    const fearBuckets = [
      {
        label: "Low Pressure",
        value: 78,
        caption: "Teams with strong trust and healthy room for challenge.",
      },
      {
        label: "Moderate Pressure",
        value: 52,
        caption: "Groups where candor may be uneven depending on context.",
      },
      {
        label: "High Pressure",
        value: 34,
        caption: "Teams that may default to silence, blame, or hesitation.",
      },
    ];

    return (
      <div className="space-y-6">
        {baseStats}
        <DashboardFilters
          key={filterKey}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
          onReset={resetFilters}
          isLoading={false}
        />
        <SectionCard title="Summary Statistics" description="Current participation for this domain view.">
          <div className="rounded-[1.25rem] p-4" style={{ backgroundColor: theme.surfaceAccentStrong }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Participants</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{data.totalParticipants}</p>
            <p className="mt-2 text-sm text-slate-500">Across all departments in the current dataset.</p>
          </div>
        </SectionCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title={config.primaryTitle} description={config.primaryDescription}>
            <MeterList items={departmentItems} accentColor={theme.chartColors.info} />
          </SectionCard>
          <SectionCard title={config.secondaryTitle} description={config.secondaryDescription}>
            <MeterList items={fearBuckets} accentColor={theme.chartColors.secondary} />
          </SectionCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusLegendCard />
          <DetailListCard
            title={config.detailTitle}
            items={config.detailItems.map((item) => ({
              title: item.title,
              description: item.description,
              toneColor: toneColorMap[item.tone],
            }))}
          />
        </div>
      </div>
    );
  }

  if (pageId === "workload-efficiency") {
    const workloadItems = [...data.departmentStats].map((item) => ({
      label: item.department,
      left: item.avgRisk,
      right: item.satisfactionScore,
      caption: `${item.totalResponses} responses`,
    }));

    return (
      <div className="space-y-6">
        {baseStats}
        <DashboardFilters
          key={filterKey}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
          onReset={resetFilters}
          isLoading={false}
        />
        <SectionCard title={config.primaryTitle} description={config.primaryDescription}>
          <div className="space-y-4">
            {workloadItems.map((item) => (
              <div key={item.label} className="rounded-[1.25rem] p-4" style={{ backgroundColor: theme.surfaceAccentStrong }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.caption}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    Risk {item.left}% - Satisfaction {item.right}%
                  </p>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>Workload</span>
                      <span>{item.left}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${clampScore(item.left)}%`, backgroundColor: theme.chartColors.warning }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>Satisfaction</span>
                      <span>{item.right}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${clampScore(item.right)}%`, backgroundColor: theme.chartColors.success }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusLegendCard />
          <DetailListCard
            title={config.detailTitle}
            items={config.detailItems.map((item) => ({
              title: item.title,
              description: item.description,
              toneColor: toneColorMap[item.tone],
            }))}
          />
        </div>
      </div>
    );
  }

  if (pageId === "leadership-alignment") {
    const genderItems = data.genderStats.map((item) => ({
      label: formatLabel(item.gender),
      value: item.satisfactionScore,
      caption: `${item.people} participants - ${item.riskScore}% risk`,
    }));
    const departmentItems = [...data.departmentStats]
      .sort((a, b) => b.satisfactionScore - a.satisfactionScore)
      .map((item) => ({
        label: item.department,
        value: item.satisfactionScore,
        caption: `${item.totalResponses} responses - ${item.avgRisk}% risk`,
      }));

    return (
      <div className="space-y-6">
        {baseStats}
        <DashboardFilters
          key={filterKey}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
          onReset={resetFilters}
          isLoading={false}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title={config.primaryTitle} description={config.primaryDescription}>
            <MeterList items={genderItems} accentColor={theme.chartColors.secondary} />
          </SectionCard>
          <SectionCard title={config.secondaryTitle} description={config.secondaryDescription}>
            <MeterList items={departmentItems} accentColor={theme.chartColors.primary} />
          </SectionCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusLegendCard />
          <DetailListCard
            title={config.detailTitle}
            items={config.detailItems.map((item) => ({
              title: item.title,
              description: item.description,
              toneColor: toneColorMap[item.tone],
            }))}
          />
        </div>
      </div>
    );
  }

  const streamItems = [...data.streamStats]
    .filter((item) => item.totalResponses > 2)
    .map((item) => ({
      label: item.stream,
      value: item.satisfactionScore,
      caption: `${item.totalResponses} responses - ${item.avgRisk}% risk`,
    }));
  const functionItems = [...data.functionStats]
    .filter((item) => item.totalResponses > 2)
    .map((item) => ({
      label: item.function,
      value: item.satisfactionScore,
      caption: `${item.totalResponses} responses - ${item.avgRisk}% risk`,
    }));
  const baseScore = metric.dashboardDomainAverage.averageSatisfactionScore;
  const subdomainItems = [
    { label: "Coworker Relationships", value: clampScore(baseScore + 2), caption: "Team trust and day-to-day support." },
    { label: "Personal Fulfillment", value: clampScore(baseScore - 1), caption: "Purpose, growth, and individual momentum." },
    { label: "Workplace Environment", value: clampScore(baseScore + 1), caption: "The environment people work inside each day." },
  ];

  return (
    <div className="space-y-6">
      {baseStats}
      <DashboardFilters
        key={filterKey}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={resetFilters}
        isLoading={false}
      />
      <SectionCard title={config.primaryTitle} description={config.primaryDescription}>
        <MeterList items={subdomainItems} accentColor={theme.chartColors.success} />
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={config.secondaryTitle} description={config.secondaryDescription}>
          <MeterList items={streamItems} accentColor={theme.chartColors.info} />
        </SectionCard>
        <SectionCard
          title="Function summary (3 Or More Participants)"
          description="Function-level view using the same participant threshold as the source dashboard."
        >
          <MeterList items={functionItems} accentColor={theme.chartColors.secondary} />
        </SectionCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusLegendCard />
        <DetailListCard
          title={config.detailTitle}
          items={config.detailItems.map((item) => ({
            title: item.title,
            description: item.description,
            toneColor: toneColorMap[item.tone],
          }))}
        />
      </div>
    </div>
  );
}
