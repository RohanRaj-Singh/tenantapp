"use client";

import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';
import { mockAggregation } from '@/runtime/mocks/mockAggregation';

export default function DashboardPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const primaryColor = config?.branding?.primaryColor || '#f58220';
  const secondaryColor = config?.branding?.secondaryColor || '#0d9488';
  const tenantName = config?.tenant?.name || 'RemedyGCC';

  const aggregatedMetrics = mockAggregation;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{tenantName} Dashboard</h1>
          <p className="text-gray-600">Employee Wellbeing Analytics</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {aggregatedMetrics.categoryMetrics.map((cat, idx) => (
            <div key={idx} className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">{cat.categoryLabel}</h3>
              <p className="mt-2 text-2xl font-bold" style={{ color: cat.averageScore > 0 ? '#10b981' : '#ef4444' }}>
                {cat.averageScore.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Wellbeing Summary</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {aggregatedMetrics.categoryMetrics.map((cat) => (
              <div key={cat.categoryId} className="border-l-4 border-gray-200 p-4" style={{ borderLeftColor: primaryColor }}>
                <p className="font-medium text-gray-700">{cat.categoryLabel}</p>
                <p className="text-sm text-gray-500">Score: {cat.averageScore.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}