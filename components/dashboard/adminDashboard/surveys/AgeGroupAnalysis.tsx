"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Calendar,
  PieChart as PieChartIcon,
  Users,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/runtime/theme/useTheme";

interface AgeGroupData {
  name: string;
  participants: number;
  riskScore: number;
  satisfaction: number;
  percentage?: number;
}

interface AgeGroupAnalysisProps {
  ageChartData: AgeGroupData[];
  unitName?: string;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  const theme = useTheme();

  return (
    <Card className="w-full border-0 bg-transparent">
      <CardHeader className="rounded-t-lg pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-black md:text-2xl">
          <Calendar className="h-6 w-6" style={{ color: theme.chartColors.primary }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-12 w-12 text-gray-400" style={{ color: theme.chartColors.neutral }} />
          <p className="mt-4 text-gray-500">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgeGroupAnalysis({
  ageChartData,
  unitName = "Organization",
}: AgeGroupAnalysisProps) {
  const theme = useTheme();
  const hasData = ageChartData.length > 0;
  const totalParticipants = ageChartData.reduce((sum, age) => sum + age.participants, 0);

  const participantsDistribution = ageChartData.map((age, index) => ({
    name: age.name,
    value: age.participants,
    color: theme.chartColors.palette[index % theme.chartColors.palette.length],
    percentage: totalParticipants > 0 ? Math.round((age.participants / totalParticipants) * 100) : 0,
  }));

  if (!hasData) {
    return (
      <EmptyState
        title="Age Group Analysis"
        message={`No age group data is currently available for ${unitName} with sufficient participant count to maintain privacy.`}
      />
    );
  }

  return (
    <Card className="w-full border-0 bg-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Calendar className="h-5 w-5" style={{ color: theme.chartColors.primary }} />
          Age Group Analysis
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-0 md:pt-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="border shadow-lg" style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <BarChart className="h-5 w-5" style={{ color: theme.chartColors.info }} />
                Age Group Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={ageChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGridColor} />
                  <XAxis dataKey="name" fontSize={12} tick={{ fill: theme.chartAxisColor }} />
                  <YAxis tick={{ fill: theme.chartAxisColor }} />
                  <Tooltip contentStyle={theme.chartTooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="riskScore"
                    name="Risk Score"
                    fill={theme.chartColors.danger}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="satisfaction"
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
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <PieChartIcon className="h-5 w-5" style={{ color: theme.chartColors.secondary }} />
                Participants Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-5 md:p-6">
              <div className="relative mx-auto h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={participantsDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                      label={({ name, percentage }: { name?: string; percentage?: number }) =>
                        `${name ?? ""}: ${percentage ?? 0}%`
                      }
                      labelLine={false}
                    >
                      {participantsDistribution.map((entry, index) => (
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
                {participantsDistribution.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm"
                    style={{ borderColor: theme.borderAccent }}
                  >
                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-700">
                      {item.name}: <span className="font-bold">{item.percentage}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
