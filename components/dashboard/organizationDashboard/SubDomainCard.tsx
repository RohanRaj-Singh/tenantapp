"use client";

import { Card } from "@/components/ui/card";
import { getRiskColor, getRiskTextClass } from "@/lib/dashboardRiskColors";

interface SubdomainCardProps {
  name: string;
  score: number;
  participantCount: number;
}

export function SubdomainCard({ name, score, participantCount }: SubdomainCardProps) {
  const riskColor = getRiskColor(score);
  const textClass = getRiskTextClass(score);

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold text-slate-900">{name}</h3>
      <div className="mb-4 flex items-center justify-center">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={riskColor}
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 314} 314`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{Math.round(score)}%</span>
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold ${textClass}`}>Based on {participantCount} participants</p>
      </div>
    </Card>
  );
}
