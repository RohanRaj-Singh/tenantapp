"use client";

import type React from "react";
import { Card } from "@/components/ui/card";
import {
  getRiskBgClass,
  getRiskColor,
  getRiskLabel,
  getRiskTextClass,
} from "@/lib/dashboardRiskColors";

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  participantCount: number;
}

export function ScoreCard({ title, score = 0, icon, participantCount }: ScoreCardProps) {
  const riskLabel = getRiskLabel(score);
  const riskColor = getRiskColor(score);
  const bgClass = getRiskBgClass(score);
  const textClass = getRiskTextClass(score);

  return (
    <Card className={`p-6 ${bgClass}`}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/70 p-2">{icon}</div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-900">{score}</span>
          <span className="text-lg text-slate-500">%</span>
        </div>
        <p className={`text-sm font-semibold ${textClass}`}>{riskLabel}</p>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full transition-all"
          style={{ backgroundColor: riskColor, width: `${score}%` }}
        />
      </div>

      <div className="text-xs text-slate-600">Based on {participantCount} participants</div>
    </Card>
  );
}
