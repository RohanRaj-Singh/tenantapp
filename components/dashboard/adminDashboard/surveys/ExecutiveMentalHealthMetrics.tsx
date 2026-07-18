"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getRiskColor } from "@/lib/dashboardRiskColors";
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
  metrics,
  domainChartData: _domainChartData,
  riskDistributionData: _riskDistributionData,
}: ExecutiveMentalHealthMetricsProps) {
  const theme = useTheme();

  if (metrics.length === 0 || metrics.every((m) => m.surveyCount === 0)) {
    return (
      <section>
        <div className="mb-4 flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Mental Health Metrics %</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-12">
          <p className="text-sm text-slate-500">No scanner responses available yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-slate-500" />
        <h2 className="text-lg font-semibold text-slate-900">Mental Health Metrics %</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const score =
            metric.domain === "Clinical Risk Index" ? metric.riskPercent : metric.satisfactionScore;
          const ringColor = getRiskColor(score);
          const pieData = [
            { name: "Score", value: score, color: ringColor },
            { name: "Remaining", value: Math.max(100 - score, 0), color: "#e5e7eb" },
          ];

          return (
            <Card
              key={metric.domain}
              className="border shadow-sm"
              style={{ borderColor: theme.borderAccent, background: "#ffffff" }}
            >
              <CardHeader className="pb-2" />
              <CardContent className="flex flex-col items-center pb-6">
                <div className="relative h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={54}
                        paddingAngle={1}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`${metric.domain}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Score"]} contentStyle={theme.chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-900">{score.toFixed(1)}%</span>
                  </div>
                </div>
                <CardTitle className="mt-1 text-center text-sm font-semibold text-slate-700">
                  {metric.domain}
                </CardTitle>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
