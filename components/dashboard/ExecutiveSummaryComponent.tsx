"use client";

import AgeGroupAnalysis from "@/components/dashboard/adminDashboard/surveys/AgeGroupAnalysis";
import DepartmentAnalysis from "@/components/dashboard/adminDashboard/surveys/DepartmentAnalysis";
import ExecutiveMentalHealthMetrics from "@/components/dashboard/adminDashboard/surveys/ExecutiveMentalHealthMetrics";
import { Card } from "@/components/ui/card";
import { BarChart3, LineChart, MapPinned, TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { useTheme } from "@/runtime/theme/useTheme";
import { SectionCard } from "@/components/dashboard/DashboardPrimitives";

interface DashboardDomainAverage {
  averageRiskScore: number;
  averageRiskStatus: string;
  averageSatisfactionScore: number;
  averageSatisfactionStatus: string;
}

interface MentalHealthMetric {
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

interface ScoreCardType extends MentalHealthMetric {
  icon: ReactNode;
}

function getIcon(domain: string, colors: ReturnType<typeof useTheme>["chartColors"]): ReactNode {
  const iconClassName = "h-6 w-6";

  switch (domain) {
    case "Clinical Risk Index":
      return <TrendingUp className={iconClassName} style={{ color: colors.danger }} />;
    case "Psychological Safety Index":
      return <TrendingUp className={iconClassName} style={{ color: colors.info }} />;
    case "Workload & Efficiency":
      return <TrendingUp className={iconClassName} style={{ color: colors.warning }} />;
    case "Leadership & Alignment":
      return <TrendingUp className={iconClassName} style={{ color: colors.secondary }} />;
    case "Satisfaction & Engagement":
      return <TrendingUp className={iconClassName} style={{ color: colors.success }} />;
    default:
      return <TrendingUp className={iconClassName} style={{ color: colors.primary }} />;
  }
}

function ScoreCard({
  title,
  score,
  icon,
  participantCount,
  borderColor,
  background,
}: {
  title: string;
  score: number;
  icon: ReactNode;
  participantCount: number;
  borderColor: string;
  background: string;
}) {
  return (
    <Card
      className="rounded-[1.35rem] border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor, background }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900">{score}%</p>
      <p className="mt-2 text-xs font-medium text-slate-500">{participantCount} responses</p>
    </Card>
  );
}

interface ExecutiveSummaryComponentProps {
  mentalHealthMetrics: MentalHealthMetric[];
  ageStats: Array<{ ageGroup: string; people: number; peoplePercent: number; riskScore: number; satisfactionScore: number }>;
  genderStats: Array<{ gender: string; people: number; peoplePercent: number; riskScore: number; satisfactionScore: number }>;
  streamStats: Array<{ stream: string; totalResponses: number; departmentPercent: number; avgRisk: number; satisfactionScore: number; highRiskCount: number }>;
  functionStats: Array<{ function: string; totalResponses: number; functionPercent: number; avgRisk: number; satisfactionScore: number; highRiskCount: number }>;
  departmentStats: Array<{ department: string; totalResponses: number; departmentPercent: number; avgRisk: number; satisfactionScore: number; highRiskCount: number }>;
  locationStats: Array<{ location: string; totalResponses: number; locationPercent: number; satisfactionScore: number }>;
  organization: { name: string };
  totalParticipants: number;
}

export default function ExecutiveSummaryComponent({
  mentalHealthMetrics,
  ageStats,
  genderStats,
  streamStats,
  functionStats,
  departmentStats,
  locationStats,
  organization,
  totalParticipants,
}: ExecutiveSummaryComponentProps) {
  const theme = useTheme();
  const cardStyle = { borderColor: theme.borderAccent, background: theme.cardGradient };

  const indices = mentalHealthMetrics.map((metric) => ({
    ...metric,
    icon: getIcon(metric.domain, theme.chartColors),
  })) as ScoreCardType[];

  const mentalHealthMetricsForComponent = mentalHealthMetrics.map((metric) => ({
    domain: metric.domain,
    avgRisk: metric.dashboardDomainAverage.averageRiskScore,
    riskPercent: metric.dashboardDomainAverage.averageRiskScore,
    surveyCount: metric.participants,
    highRiskCount: metric.highRiskSurveyCount,
    nonHighRiskCount: metric.nonHighRiskSurveyCount,
    satisfactionScore: metric.dashboardDomainAverage.averageSatisfactionScore,
    riskLevel: metric.dashboardDomainAverage.averageSatisfactionStatus,
  }));

  const domainChartData = mentalHealthMetrics.map((metric) => ({
    name: metric.domain,
    riskPercent: metric.dashboardDomainAverage.averageRiskScore,
    satisfactionScore: metric.dashboardDomainAverage.averageSatisfactionScore,
    highRiskCount: metric.highRiskSurveyCount,
    avgRisk: metric.dashboardDomainAverage.averageRiskScore,
  }));

  const ageChartData = ageStats.map((age) => ({
    name: age.ageGroup,
    participants: age.people,
    riskScore: age.riskScore,
    satisfaction: age.satisfactionScore,
  }));

  const genderChartData = genderStats.map((gender) => ({
    name: gender.gender,
    participants: gender.people,
    riskScore: gender.riskScore,
    satisfaction: gender.satisfactionScore,
    percentage: gender.peoplePercent,
  }));

  const streamChartData = streamStats.map((item) => ({
    name: item.stream,
    satisfaction: item.satisfactionScore,
    risk: item.avgRisk,
    responses: item.totalResponses,
    highRiskCount: item.highRiskCount,
  }));

  const functionChartData = functionStats.map((item) => ({
    name: item.function,
    satisfaction: item.satisfactionScore,
    risk: item.avgRisk,
    responses: item.totalResponses,
    highRiskCount: item.highRiskCount,
  }));

  const departmentChartData = departmentStats.map((item) => ({
    name: item.department,
    satisfaction: item.satisfactionScore,
    risk: item.avgRisk,
    responses: item.totalResponses,
    highRiskCount: item.highRiskCount,
  }));

  let noRiskCount = 0;
  let lowRiskCount = 0;
  let mediumRiskCount = 0;
  let highRiskCount = 0;

  mentalHealthMetrics.forEach((metric) => {
    if (metric.dashboardDomainAverage.averageSatisfactionScore >= 85) {
      noRiskCount += metric.participants;
    } else if (metric.dashboardDomainAverage.averageSatisfactionScore >= 70) {
      lowRiskCount += metric.participants;
    } else if (metric.dashboardDomainAverage.averageSatisfactionScore >= 50) {
      mediumRiskCount += metric.participants;
    } else {
      highRiskCount += metric.participants;
    }
  });

  const riskDistributionData = [
    { name: "No Risk", value: noRiskCount, color: theme.chartColors.success },
    { name: "Low Risk", value: lowRiskCount, color: theme.chartColors.info },
    { name: "Medium Risk", value: mediumRiskCount, color: theme.chartColors.warning },
    { name: "High Risk", value: highRiskCount, color: theme.chartColors.danger },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {indices.map((index) => (
            <ScoreCard
              key={index.domain}
              title={index.domain}
              score={
                index.domain === "Clinical Risk Index"
                  ? index.dashboardDomainAverage.averageRiskScore
                  : index.dashboardDomainAverage.averageSatisfactionScore
              }
              icon={index.icon}
              participantCount={totalParticipants}
              borderColor={theme.borderAccent}
              background={theme.cardGradient}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Summary Statistics</h2>
        <div className="grid grid-cols-1 gap-4">
          <Card className="border p-6 shadow-sm" style={cardStyle}>
            <div className="mb-2 flex items-center gap-3">
              <LineChart className="h-5 w-5" style={{ color: theme.chartColors.primary }} />
              <h3 className="text-sm font-semibold text-slate-900 md:text-lg">Total Participants</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalParticipants}</p>
          </Card>
        </div>
      </section>

      <ExecutiveMentalHealthMetrics
        metrics={mentalHealthMetricsForComponent}
        domainChartData={domainChartData}
        riskDistributionData={riskDistributionData}
      />

      <section>
        <Card className="border shadow-sm" style={cardStyle}>
          <div className="p-6">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">
              <BarChart3 className="mr-2 inline h-5 w-5 text-slate-500" />
              Domain Risk Analysis
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                <YAxis fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                <Tooltip contentStyle={theme.chartTooltipStyle} />
                <Legend />
                <Bar dataKey="riskPercent" name="Risk Percentage" fill={theme.chartColors.danger} radius={[4, 4, 0, 0]} />
                <Bar dataKey="satisfactionScore" name="Positive Score" fill={theme.chartColors.success} radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <AgeGroupAnalysis ageChartData={ageChartData} unitName="All Departments" />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Gender Analysis</h2>
        <Card className="border shadow-sm" style={cardStyle}>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={320}>
              <RechartsBarChart data={genderChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                <YAxis fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                <Tooltip contentStyle={theme.chartTooltipStyle} />
                <Legend />
                <Bar dataKey="participants" name="Participants" fill={theme.chartColors.secondary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="riskScore" name="Risk Score" fill={theme.chartColors.danger} radius={[4, 4, 0, 0]} />
                <Bar dataKey="satisfaction" name="Satisfaction" fill={theme.chartColors.success} radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <DepartmentAnalysis
        departmentChartData={streamChartData}
        unitName="All Streams"
        title="Stream Analysis"
        comparison="Stream Comparison"
      />
      <DepartmentAnalysis
        departmentChartData={functionChartData}
        unitName="All Functions"
        title="Function Analysis"
        comparison="Function Comparison"
      />
      <DepartmentAnalysis
        departmentChartData={departmentChartData}
        unitName="All Departments"
        title="Department Analysis"
        comparison="Department Comparison"
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Satisfaction Score Trend by Domain</h2>
        <Card className="border shadow-sm" style={cardStyle}>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={320}>
              <RechartsLineChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                <XAxis dataKey="name" height={60} fontSize={10} tick={{ fill: theme.chartAxisColor }} />
                <YAxis fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                <Tooltip contentStyle={theme.chartTooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="satisfactionScore"
                  name="Satisfaction Score"
                  stroke={theme.chartColors.primary}
                  strokeWidth={3}
                  dot={{ fill: theme.chartColors.primary, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <SectionCard title="Location Breakdown" description="Mental health metrics by geographic location.">
        <div className="space-y-3">
          {locationStats.map((location) => (
            <div
              key={location.location}
              className="flex items-center justify-between border-b pb-3 last:border-b-0"
              style={{ borderColor: theme.borderAccent }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: theme.surfaceAccentStrong, color: theme.chartColors.info }}
                >
                  <MapPinned className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium capitalize text-slate-900">{location.location}</p>
                  <p className="text-sm text-slate-500">
                    {location.totalResponses} responses ({location.locationPercent}%)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{location.satisfactionScore?.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">Satisfaction</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Card className="border p-6 shadow-sm" style={cardStyle}>
        <h3 className="mb-2 font-semibold text-slate-900">Data Privacy & Anonymity Commitment</h3>
        <p className="mb-3 text-sm leading-6 text-slate-500">
          Survey responses are aggregated to protect individual privacy. Small cohorts are rolled up where needed so the tenant dashboard remains client-ready while preserving anonymity standards.
        </p>
        <div className="rounded-lg border bg-white p-3 text-xs text-slate-600" style={{ borderColor: theme.borderAccent }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span>
              <span className="font-semibold">{totalParticipants} total participants</span> across all departments and locations
            </span>
            <span className="hidden sm:block">|</span>
            <span>All displayed analytics respect the configured anonymity threshold.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
