"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/runtime/theme/useTheme";

interface MentalHealthMetric {
  domain: string;
  avgRisk: number;
  riskPercent: number;
  surveyCount: number;
  highRiskCount: number;
  nonHighRiskCount: number;
  satisfactionScore: number;
  riskLevel: string;
}

interface ExecutiveMentalHealthMetricsProps {
  metrics: MentalHealthMetric[];
  domainChartData: Array<Record<string, string | number>>;
  riskDistributionData: Array<{ name: string; value: number; color: string }>;
}

export default function ExecutiveMentalHealthMetrics({
  metrics: _metrics,
  domainChartData,
  riskDistributionData,
}: ExecutiveMentalHealthMetricsProps) {
  const theme = useTheme();

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="border shadow-lg" style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Bar className="h-5 w-5" style={{ color: theme.chartColors.primary }} />
              Domain Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                <YAxis tick={{ fill: theme.chartAxisColor }} />
                <Tooltip contentStyle={theme.chartTooltipStyle} />
                <Legend />
                <Bar
                  dataKey="riskPercent"
                  name="Risk Score"
                  fill={theme.chartColors.danger}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="satisfactionScore"
                  name="Satisfaction %"
                  fill={theme.chartColors.success}
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-lg" style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Pie className="h-5 w-5" style={{ color: theme.chartColors.secondary }} />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-5 md:p-6">
            <div className="relative mx-auto h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}
                    labelLine={false}
                  >
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => [`${value} participants`, String(props.payload.name)]}
                    contentStyle={theme.chartTooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              {riskDistributionData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm"
                  style={{ borderColor: theme.borderAccent }}
                >
                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-gray-700">
                    {item.name}: <span className="font-bold">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-lg" style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Line className="h-5 w-5" style={{ color: theme.chartColors.primary }} />
            Satisfaction Score Trend by Domain
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={domainChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
              <XAxis dataKey="name" angle={0} textAnchor="end" height={60} fontSize={10} tick={{ fill: theme.chartAxisColor }} />
              <YAxis tick={{ fill: theme.chartAxisColor }} />
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
        </CardContent>
      </Card>
    </section>
  );
}
