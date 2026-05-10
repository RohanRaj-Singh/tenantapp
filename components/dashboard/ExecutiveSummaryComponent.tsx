"use client";

import AgeGroupAnalysis from "@/components/dashboard/adminDashboard/surveys/AgeGroupAnalysis";
import DepartmentAnalysis from "@/components/dashboard/adminDashboard/surveys/DepartmentAnalysis";
import ExecutiveMentalHealthMetrics from "@/components/dashboard/adminDashboard/surveys/ExecutiveMentalHealthMetrics";
import { Card } from "@/components/ui/card";
import { Flame, LineChart, Shield, Smile, TrendingUp, Users } from "lucide-react";
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
  switch (domain) {
    case "Clinical Risk Index":
      return <Flame className="h-6 w-6" style={{ color: colors.danger }} />;
    case "Psychological Safety Index":
      return <Shield className="h-6 w-6" style={{ color: colors.info }} />;
    case "Workload & Efficiency":
      return <TrendingUp className="h-6 w-6" style={{ color: colors.warning }} />;
    case "Leadership & Alignment":
      return <Users className="h-6 w-6" style={{ color: colors.secondary }} />;
    case "Satisfaction & Engagement":
      return <Smile className="h-6 w-6" style={{ color: colors.success }} />;
    default:
      return null;
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
      className="rounded-[1.5rem] border p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor, background }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {icon}
      </div>
      <p className="mb-1 text-3xl font-bold text-slate-900">{score}%</p>
      <p className="text-xs font-medium text-gray-600">{participantCount} responses</p>
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
  organization: _organization,
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
    <div className="space-y-10">
      <section id="key-performance-indicators" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Key Performance Indicators</h2>
          <p className="text-sm text-gray-600">Core mental health metrics across all domains</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      <section id="summary-statistics" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Summary Statistics</h2>
          <p className="text-sm text-gray-600">Overall participation and response metrics</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-1">
          <Card className="border p-6 shadow-sm" style={cardStyle}>
            <div className="mb-2 flex items-center gap-3">
              <LineChart className="h-5 w-5 text-slate-700" style={{ color: theme.chartColors.primary }} />
              <h3 className="text-sm font-semibold text-gray-900 md:text-lg">Total Participants</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalParticipants}</p>
          </Card>
        </div>
      </section>

      <section id="mental-health-overview" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Mental Health Overview</h2>
          <p className="text-sm text-gray-600">Detailed analysis of mental health metrics and risk distribution</p>
        </div>
        <ExecutiveMentalHealthMetrics
          metrics={mentalHealthMetricsForComponent}
          domainChartData={domainChartData}
          riskDistributionData={riskDistributionData}
        />
      </section>

      <section id="demographic-analysis" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Demographic Analysis</h2>
          <p className="text-sm text-gray-600">Mental health metrics broken down by age groups</p>
        </div>
        <AgeGroupAnalysis ageChartData={ageChartData} unitName="All Departments" />
      </section>

      <section id="gender-analysis" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Gender Analysis</h2>
          <p className="text-sm text-gray-600">Mental health metrics by gender distribution</p>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <Card className="border shadow-sm" style={cardStyle}>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={genderChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                  <XAxis dataKey="name" fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                  <YAxis fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                  <Tooltip contentStyle={theme.chartTooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="participants"
                    name="Participants"
                    fill={theme.chartColors.secondary}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="riskScore"
                    name="Risk Score"
                    fill={theme.chartColors.danger}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="satisfaction"
                    name="Satisfaction"
                    fill={theme.chartColors.success}
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      <section id="organizational-analysis" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Organizational Analysis</h2>
          <p className="text-sm text-gray-600">Mental health metrics across different organizational structures</p>
        </div>
        <div className="space-y-8">
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
        </div>
      </section>

      <section id="trends-insights" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Trends & Insights</h2>
          <p className="text-sm text-gray-600">Satisfaction score trends across all domains</p>
        </div>
        <Card className="border shadow-sm" style={cardStyle}>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                <XAxis dataKey="name" angle={0} textAnchor="end" height={60} fontSize={10} tick={{ fill: theme.chartAxisColor }} />
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

      <section id="location-breakdown" className="scroll-mt-32">
        <div className="mb-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Location Breakdown</h2>
          <p className="text-sm text-gray-600">Mental health metrics by geographic location</p>
        </div>
        <Card className="border p-6 shadow-sm" style={cardStyle}>
          <div className="space-y-3">
            {locationStats.map((location) => (
              <div
                key={location.location}
                className="flex items-center justify-between border-b pb-3 last:border-b-0"
                style={{ borderColor: theme.borderAccent }}
              >
                <div>
                  <p className="font-medium capitalize text-gray-900">{location.location}</p>
                  <p className="text-sm text-gray-600">
                    {location.totalResponses} responses ({location.locationPercent}%)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{location.satisfactionScore?.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">Satisfaction</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="border p-6 shadow-sm" style={cardStyle}>
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-slate-700" style={{ color: theme.chartColors.primary }} />
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Data Privacy & Anonymity Commitment</h3>
            <p className="mb-3 text-sm text-gray-600">
              We are committed to protecting employee privacy. All survey responses are anonymized and aggregated to
              ensure individual identities cannot be determined. Data points with fewer than 4 participants are
              automatically combined with broader categories to maintain anonymity.
            </p>
            <div className="rounded-lg bg-white p-3 text-xs text-slate-600" style={{ border: `1px solid ${theme.borderAccent}` }}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span>
                  <span className="font-semibold">{totalParticipants} total participants</span> across all departments and
                  locations
                </span>
                <span className="hidden sm:block">|</span>
                <span>All data meets minimum anonymity threshold requirements</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
