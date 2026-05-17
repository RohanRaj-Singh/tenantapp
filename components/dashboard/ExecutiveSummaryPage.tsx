"use client";

import { Filter, MapPinned, Users } from "lucide-react";
import DashboardFilters, {
  checkHasActiveFilters,
} from "@/components/dashboard/filter/DashboardFilters";
import ExecutiveSummaryComponent from "@/components/dashboard/ExecutiveSummaryComponent";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters";
import { useDashboardData } from "@/runtime/hooks/useDashboardData";
import { useTheme } from "@/runtime/theme/useTheme";

export default function ExecutiveSummaryPage() {
  const theme = useTheme();
  const tenantName = theme.tenantName;
  const {
    filters,
    appliedFilters,
    filterKey,
    handleFilterChange,
    handleApplyFilters,
    resetFilters,
  } = useDashboardFilters();
  const { state: dashboardState, isLoading, refetch } = useDashboardData(tenantName, appliedFilters);

  const hasAppliedFilters = checkHasActiveFilters(appliedFilters);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Loading executive summary...</p>
      </div>
    );
  }

  if (
    (dashboardState.status !== "ready" && dashboardState.status !== "stale") ||
    !dashboardState.data
  ) {
    return (
      <div className="space-y-6">
        <SectionCard title="Analytics Unavailable">
          <p className="text-sm text-slate-500">
            Unable to load executive summary data.
          </p>
        </SectionCard>
        <SectionCard title="Recovery">
          <button
            type="button"
            onClick={refetch}
            className="tenant-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition"
          >
            Retry
          </button>
        </SectionCard>
      </div>
    );
  }

  const data = dashboardState.data;
  const locationCount = data.locationStats.filter((location) => location.totalResponses > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Participants"
          value={String(data.totalParticipants)}
          caption="Current response volume across the organization."
          icon={<Users className="h-4 w-4" />}
          accentColor={theme.chartColors.info}
        />
        <StatCard
          title="Locations"
          value={String(locationCount)}
          caption="Distinct reporting sites included in the executive summary."
          icon={<MapPinned className="h-4 w-4" />}
          accentColor={theme.chartColors.success}
        />
        <StatCard
          title="Filters"
          value={hasAppliedFilters ? "Active" : "All Data"}
          caption={
            hasAppliedFilters
              ? "Custom drill-down is staged for this dashboard view."
              : "Organization-wide view with no filters applied."
          }
          icon={<Filter className="h-4 w-4" />}
          badge={hasAppliedFilters ? "Scoped" : "Global"}
          accentColor={theme.chartColors.primary}
        />
      </div>

      <DashboardFilters
        key={filterKey}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={resetFilters}
        isLoading={isLoading}
      />

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
