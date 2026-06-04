"use client";

import { Award } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RankingItem {
  department: string;
  satisfactionScore: number;
  riskScore?: number;
}

interface RankingTableProps {
  title: string;
  items: RankingItem[];
  description?: string;
}

export function RankingTable({ title, items, description }: RankingTableProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mb-4 text-sm text-slate-500">{description}</p> : null}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.department}
            className="flex flex-col items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors md:flex-row"
          >
            <div className="flex flex-1 flex-col items-center gap-4 md:flex-row">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{
                  backgroundColor: 'var(--tenant-primary)',
                  color: 'var(--tenant-on-primary)',
                }}
              >
                {index === 0 ? <Award className="h-4 w-4" /> : index + 1}
              </div>
              <div>
                <p className="font-medium text-slate-900">{item.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{item.satisfactionScore}%</p>
                {item.riskScore !== undefined ? (
                  <p className="text-xs text-slate-500">Risk: {item.riskScore}%</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
