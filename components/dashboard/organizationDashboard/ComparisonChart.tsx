"use client";

import { Card } from "@/components/ui/card";
import { useTheme } from "@/runtime/theme/useTheme";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ComparisonChartProps {
  title: string;
  data: Array<{
    name: string;
    value1: number;
    value2: number;
  }>;
  series1Name: string;
  series2Name: string;
  description?: string;
}

export function ComparisonChart({
  title,
  data,
  series1Name,
  series2Name,
  description,
}: ComparisonChartProps) {
  const theme = useTheme();
  return (
    <Card className="p-6">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mb-4 text-sm text-slate-500">{description}</p> : null}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value1" fill={theme.primaryColor} name={series1Name} />
          <Bar dataKey="value2" fill={theme.secondaryColor} name={series2Name} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
