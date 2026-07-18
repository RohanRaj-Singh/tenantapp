"use client";

import { BarChart3 } from "lucide-react";
import DashboardFilters from "@/components/dashboard/filter/DashboardFilters";
import ExecutiveSummaryComponent from "@/components/dashboard/ExecutiveSummaryComponent";
import { DashboardErrorState, DashboardLoadingState } from "@/components/dashboard/DashboardStates";
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useDashboardData } from "@/runtime/hooks/useDashboardData";
import { useTheme } from "@/runtime/theme/useTheme";

export default function ExecutiveSummaryPage() {
  const theme = useTheme();
  const { copy } = useLanguage();
  const tenantName = theme.tenantName;
  const sharedCopy = copy.dashboard.shared;
  const {
    filters,
    appliedFilters,
    filterKey,
    handleFilterChange,
    handleApplyFilters,
    resetFilters,
  } = useDashboardFilters();
  const { state: dashboardState, isLoading, refetch } = useDashboardData(tenantName, appliedFilters);

  if (isLoading) {
    return <DashboardLoadingState label={sharedCopy.loadingExecutiveSummary} />;
  }

  if (
    (dashboardState.status !== "ready" && dashboardState.status !== "stale") ||
    !dashboardState.data
  ) {
    return (
      <DashboardErrorState
        title={sharedCopy.analyticsUnavailableTitle}
        description={sharedCopy.analyticsUnavailableDescription}
        buttonLabel={sharedCopy.retry}
        onRetry={refetch}
      />
    );
  }

  const data = dashboardState.data;

  if (data.totalParticipants === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <BarChart3 className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">No data available</h3>
          <p className="max-w-sm text-sm text-slate-500">
            No scanner responses available yet. Dashboard metrics will appear once survey data is collected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardFilters
        key={filterKey}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={resetFilters}
        isLoading={isLoading}
        rollUpActive={dashboardState.snapshot?.anonymity.rollUpApplied ?? false}
      />

      {dashboardState.status === "stale" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Snapshot shown from{" "}
          {new Date(
            dashboardState.generatedAt ?? dashboardState.snapshot?.generatedAt ?? Date.now(),
          ).toLocaleString()}
          .
        </div>
      ) : null}

      <ExecutiveSummaryComponent
        mentalHealthMetrics={data.mentalHealthMetrics}
        ageStats={data.ageStats}
        genderStats={data.genderStats}
        streamStats={data.streamStats}
        functionStats={data.functionStats}
        departmentStats={data.departmentStats}
        locationStats={data.locationStats}
        organization={data.organization}
        totalParticipants={data.totalParticipants}
      />
    </div>
  );
}
