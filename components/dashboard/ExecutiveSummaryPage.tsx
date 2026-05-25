"use client";

import { Filter, MapPinned, Users } from "lucide-react";
import DashboardFilters, {
  checkHasActiveFilters,
} from "@/components/dashboard/filter/DashboardFilters";
import ExecutiveSummaryComponent from "@/components/dashboard/ExecutiveSummaryComponent";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
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

  const hasAppliedFilters = checkHasActiveFilters(appliedFilters);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">{sharedCopy.loadingExecutiveSummary}</p>
      </div>
    );
  }

  if (
    (dashboardState.status !== "ready" && dashboardState.status !== "stale") ||
    !dashboardState.data
  ) {
    return (
      <div className="space-y-6">
        <SectionCard title={sharedCopy.analyticsUnavailableTitle}>
          <p className="text-sm text-slate-500">
            {sharedCopy.analyticsUnavailableDescription}
          </p>
        </SectionCard>
        <SectionCard title={sharedCopy.recovery}>
          <button
            type="button"
            onClick={refetch}
            className="tenant-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition"
          >
            {sharedCopy.retry}
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
          title={sharedCopy.participants}
          value={String(data.totalParticipants)}
          caption={copy.dashboard.executiveSummary.participantsCaption}
          icon={<Users className="h-4 w-4" />}
          accentColor={theme.chartColors.info}
        />
        <StatCard
          title={sharedCopy.locations}
          value={String(locationCount)}
          caption={copy.dashboard.executiveSummary.locationsCaption}
          icon={<MapPinned className="h-4 w-4" />}
          accentColor={theme.chartColors.success}
        />
        <StatCard
          title={sharedCopy.filters}
          value={hasAppliedFilters ? sharedCopy.active : sharedCopy.allData}
          caption={
            hasAppliedFilters
              ? sharedCopy.customDrillDown
              : sharedCopy.organizationWideView
          }
          icon={<Filter className="h-4 w-4" />}
          badge={hasAppliedFilters ? sharedCopy.scoped : sharedCopy.global}
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
