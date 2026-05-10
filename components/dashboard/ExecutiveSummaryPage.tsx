"use client";

import { useMemo } from "react";
import { Filter, MapPinned, Users } from "lucide-react";
import DashboardFilters, {
  checkHasActiveFilters,
} from "@/components/dashboard/filter/DashboardFilters";
import ExecutiveSummaryComponent from "@/components/dashboard/ExecutiveSummaryComponent";
import { StatCard } from "@/components/dashboard/DashboardPrimitives";
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters";
import { getDashboardMockData } from "@/lib/dashboardMockData";
import { useTheme } from "@/runtime/theme/useTheme";

export default function ExecutiveSummaryPage() {
  const theme = useTheme();
  const tenantName = theme.tenantName;
  const data = useMemo(() => getDashboardMockData(tenantName), [tenantName]);
  const {
    filters,
    appliedFilters,
    filterKey,
    handleFilterChange,
    handleApplyFilters,
    resetFilters,
  } = useDashboardFilters();

  const hasAppliedFilters = checkHasActiveFilters(appliedFilters);

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
          value={String(data.locationStats.length)}
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
        isLoading={false}
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
