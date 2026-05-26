"use client";

import { Card } from "@/components/ui/card";
import { getRiskColor } from "@/lib/dashboardRiskColors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BarChartProps {
  title: string;
  description?: string;
  data: { name: string; value: number; isSatisfactionScore?: boolean }[];
}

export function BarChartComponent({ title, description, data }: BarChartProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mb-4 text-sm text-slate-500">{description}</p> : null}

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getRiskColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
