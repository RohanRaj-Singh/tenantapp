"use client";

import { AggregationOutput } from '@/runtime/contracts/aggregation';

interface DashboardContainerProps {
  aggregation: AggregationOutput;
}

export function DashboardContainer({ aggregation }: DashboardContainerProps) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat">
          <div className="stat-title">Total Responses</div>
          <div className="stat-value">{aggregation.participation.totalResponses}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Completion Rate</div>
          <div className="stat-value">{Math.round(aggregation.participation.completionRate * 100)}%</div>
        </div>
        <div className="stat">
          <div className="stat-title">High Risk Responders</div>
          <div className="stat-value">{aggregation.riskAnalysis.highRiskResponders}</div>
        </div>
      </div>

      {aggregation.categoryMetrics.length === 0 ? (
        <p className="text-sm text-slate-500">
          No category metrics are available for this aggregation period.
        </p>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">Category Metrics</h2>
          <div className="grid gap-4">
            {aggregation.categoryMetrics.map(cat => (
              <div key={cat.categoryId} className="card bg-base-100 shadow">
                <div className="card-body">
                  <h3 className="card-title">{cat.categoryLabel}</h3>
                  <div className="flex justify-between">
                    <span>Average Score:</span>
                    <span>{cat.averageScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Status:</span>
                    <span className={`badge ${cat.riskStatus === 'high-risk' ? 'badge-error' : cat.riskStatus === 'medium-risk' ? 'badge-warning' : 'badge-success'}`}>
                      {cat.riskStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}