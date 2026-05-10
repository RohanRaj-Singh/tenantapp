"use client";

import { useCallback, useState } from "react";
import {
  type FilterState,
  initialFilterState,
} from "@/components/dashboard/filter/DashboardFilters";

export function useDashboardFilters() {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilterState);
  const [filterKey, setFilterKey] = useState(0);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === "stream") {
        updated.location = "";
        updated.fn = "";
        updated.department = "";
      } else if (key === "location") {
        updated.fn = "";
        updated.department = "";
      } else if (key === "fn") {
        updated.department = "";
      }

      return updated;
    });
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setFilterKey((prev) => prev + 1);
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(initialFilterState);
    setAppliedFilters(initialFilterState);
    setFilterKey((prev) => prev + 1);
  }, []);

  return {
    filters,
    appliedFilters,
    filterKey,
    handleFilterChange,
    handleApplyFilters,
    resetFilters,
  };
}

