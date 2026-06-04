"use client";

import { useCallback, useContext, useMemo, useState } from "react";
import {
  EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS,
  getAvailableDepartments,
  getAvailableFunctions,
  getAvailableLocations,
  resolveRuntimeAttributeTemplate,
  type RuntimeAttributeSelections,
} from "@/runtime/attributes/attributeTemplateUtils";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import {
  X,
  Check,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useTheme } from "@/runtime/theme/useTheme";

export interface FilterState {
  stream: string;
  location: string;
  function: string;
  department: string;
  age: string;
  gender: string;
}

interface DashboardFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  isLoading?: boolean;
  showActiveFilters?: boolean;
  rollUpActive?: boolean;
}

export const initialFilterState: FilterState = {
  stream: "",
  location: "",
  function: "",
  department: "",
  age: "",
  gender: "",
};

export function checkHasActiveFilters(filters: FilterState): boolean {
  return Object.values(filters).some((value) => value !== "");
}

interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}

function FilterSelect({ label, value, onChange, options, placeholder = "Select" }: FilterSelectProps) {
  const theme = useTheme();

  return (
    <div className="relative">
      {label ? (
        <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="tenant-field h-10 w-full appearance-none rounded-xl px-3 pr-8 text-sm transition-all duration-150"
        style={{ borderColor: theme.borderAccent }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

interface FilterPillProps {
  label: string;
  value: string;
  color: string;
  onRemove: () => void;
}

function FilterPill({ label, value, color, onRemove }: FilterPillProps) {
  return (
    <button
      onClick={onRemove}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${color}`}
      title={`${label}: ${value}`}
    >
      <span className="max-w-[100px] truncate">{value}</span>
      <X className="h-3 w-3 flex-shrink-0" />
    </button>
  );
}

function toHierarchySelections(filters: FilterState): RuntimeAttributeSelections {
  return {
    ...EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS,
    stream: filters.stream,
    location: filters.location,
    function: filters.function,
    department: filters.department,
    age: filters.age,
    gender: filters.gender,
  };
}

function buildLabelMap(options: Array<{ label: string; value: string }>) {
  return new Map(options.map((option) => [option.value, option.label]));
}

export default function DashboardFilters({
  filters,
  onFilterChange,
  onApply,
  onReset,
  isLoading = false,
  showActiveFilters = true,
  rollUpActive = false,
}: DashboardFiltersProps) {
  const theme = useTheme();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { config } = useContext(RuntimeContext);
  const resolvedTemplate = useMemo(
    () => resolveRuntimeAttributeTemplate(config?.attributeTemplate),
    [config?.attributeTemplate],
  );

  const hierarchySelections = useMemo(
    () => toHierarchySelections(filters),
    [filters],
  );

  const streamOptions = useMemo(
    () => resolvedTemplate.streams.map((item) => ({ label: item.label, value: item.value })),
    [resolvedTemplate.streams],
  );
  const availableLocationOptions = useMemo(
    () =>
      getAvailableLocations(resolvedTemplate, hierarchySelections).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [hierarchySelections, resolvedTemplate],
  );
  const availableFunctionOptions = useMemo(
    () =>
      getAvailableFunctions(resolvedTemplate, hierarchySelections).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [hierarchySelections, resolvedTemplate],
  );
  const availableDepartmentOptions = useMemo(
    () =>
      getAvailableDepartments(resolvedTemplate, hierarchySelections).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [hierarchySelections, resolvedTemplate],
  );
  const ageOptions = useMemo(
    () => resolvedTemplate.ageGroups.map((item) => ({ label: item.label, value: item.value })),
    [resolvedTemplate.ageGroups],
  );
  const genderOptions = useMemo(
    () => resolvedTemplate.genders.map((item) => ({ label: item.label, value: item.value })),
    [resolvedTemplate.genders],
  );

  const streamLabelByValue = useMemo(() => buildLabelMap(streamOptions), [streamOptions]);
  const locationLabelByValue = useMemo(
    () =>
      buildLabelMap(
        resolvedTemplate.locations.map((item) => ({ label: item.label, value: item.value })),
      ),
    [resolvedTemplate.locations],
  );
  const functionLabelByValue = useMemo(
    () =>
      buildLabelMap(
        resolvedTemplate.functions.map((item) => ({ label: item.label, value: item.value })),
      ),
    [resolvedTemplate.functions],
  );
  const departmentLabelByValue = useMemo(
    () =>
      buildLabelMap(
        resolvedTemplate.departments.map((item) => ({ label: item.label, value: item.value })),
      ),
    [resolvedTemplate.departments],
  );
  const ageLabelByValue = useMemo(() => buildLabelMap(ageOptions), [ageOptions]);
  const genderLabelByValue = useMemo(() => buildLabelMap(genderOptions), [genderOptions]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    onFilterChange(key, value);

    if (key === "stream") {
      onFilterChange("location", "");
      onFilterChange("function", "");
      onFilterChange("department", "");
    } else if (key === "location") {
      onFilterChange("function", "");
      onFilterChange("department", "");
    } else if (key === "function") {
      onFilterChange("department", "");
    }
  }, [onFilterChange]);

  const isFilterActive = checkHasActiveFilters(filters);
  const activeFilterCount = Object.values(filters).filter((value) => value !== "").length;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border bg-white shadow-sm" style={{ borderColor: theme.borderAccent }}>
      <button
        type="button"
        onClick={() => setMobileExpanded(!mobileExpanded)}
        className="flex w-full items-center justify-between border-b px-3 py-3 lg:hidden"
        style={{ borderColor: theme.borderAccent, backgroundColor: "#f8fafc" }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filters</span>
          {activeFilterCount > 0 ? (
            <span
              className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold"
              style={{ backgroundColor: theme.primaryColor, color: theme.onPrimaryColor }}
            >
              {activeFilterCount}
            </span>
          ) : null}
        </div>
        {mobileExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {mobileExpanded ? (
        <div className="space-y-3 bg-white p-4 lg:hidden">
          <div className="grid grid-cols-1 gap-3">
            <FilterSelect
              value={filters.stream}
              onChange={(value) => handleFilterChange("stream", value)}
              options={streamOptions}
              placeholder="Select Stream"
            />

            {filters.stream ? (
              <FilterSelect
                value={filters.location}
                onChange={(value) => handleFilterChange("location", value)}
                options={availableLocationOptions}
                placeholder="Select Location"
              />
            ) : null}

            {filters.stream && filters.location ? (
              <FilterSelect
                value={filters.function}
                onChange={(value) => handleFilterChange("function", value)}
                options={availableFunctionOptions}
                placeholder="Select Function"
              />
            ) : null}

            {filters.stream && filters.location && filters.function ? (
              <FilterSelect
                value={filters.department}
                onChange={(value) => handleFilterChange("department", value)}
                options={availableDepartmentOptions}
                placeholder="Select Department"
              />
            ) : null}

            {ageOptions.length > 0 ? (
              <FilterSelect
                value={filters.age}
                onChange={(value) => handleFilterChange("age", value)}
                options={ageOptions}
                placeholder="Select Age"
              />
            ) : null}

            {genderOptions.length > 0 ? (
              <FilterSelect
                value={filters.gender}
                onChange={(value) => handleFilterChange("gender", value)}
                options={genderOptions}
                placeholder="Select Gender"
              />
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <div className="flex items-center gap-2">
            {rollUpActive ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                Roll Up
              </span>
            ) : null}
            {isLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {isFilterActive && !isLoading ? (
                <>
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={onApply}
                    className="tenant-button inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Apply
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="hidden bg-white p-4 lg:block">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-48 min-w-[140px]">
            <FilterSelect
              value={filters.stream}
              onChange={(value) => handleFilterChange("stream", value)}
              options={streamOptions}
              placeholder="All Streams"
            />
          </div>

          {filters.stream ? (
            <div className="w-40 min-w-[120px]">
              <FilterSelect
                value={filters.location}
                onChange={(value) => handleFilterChange("location", value)}
                options={availableLocationOptions}
                placeholder="All Locations"
              />
            </div>
          ) : null}

          {filters.stream && filters.location ? (
            <div className="w-44 min-w-[140px]">
              <FilterSelect
                value={filters.function}
                onChange={(value) => handleFilterChange("function", value)}
                options={availableFunctionOptions}
                placeholder="All Functions"
              />
            </div>
          ) : null}

          {filters.stream && filters.location && filters.function ? (
            <div className="w-48 min-w-[150px]">
              <FilterSelect
                value={filters.department}
                onChange={(value) => handleFilterChange("department", value)}
                options={availableDepartmentOptions}
                placeholder="All Departments"
              />
            </div>
          ) : null}

          {ageOptions.length > 0 ? (
            <div className="w-32 min-w-[110px]">
              <FilterSelect
                value={filters.age}
                onChange={(value) => handleFilterChange("age", value)}
                options={ageOptions}
                placeholder="All Ages"
              />
            </div>
          ) : null}

          {genderOptions.length > 0 ? (
            <div className="w-32 min-w-[110px]">
              <FilterSelect
                value={filters.gender}
                onChange={(value) => handleFilterChange("gender", value)}
                options={genderOptions}
                placeholder="All Genders"
              />
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {rollUpActive ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                Roll Up
              </span>
            ) : null}
            {isLoading ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </div>
            ) : isFilterActive ? (
              <>
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onApply}
                  className="tenant-button inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {showActiveFilters && isFilterActive ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.stream ? (
              <FilterPill
                label="Stream"
                value={streamLabelByValue.get(filters.stream) ?? filters.stream}
                color="bg-slate-100 text-slate-700"
                onRemove={() => handleFilterChange("stream", "")}
              />
            ) : null}
            {filters.location ? (
              <FilterPill
                label="Location"
                value={locationLabelByValue.get(filters.location) ?? filters.location}
                color="bg-stone-100 text-stone-700"
                onRemove={() => handleFilterChange("location", "")}
              />
            ) : null}
            {filters.function ? (
              <FilterPill
                label="Function"
                value={functionLabelByValue.get(filters.function) ?? filters.function}
                color="bg-sky-100 text-sky-700"
                onRemove={() => handleFilterChange("function", "")}
              />
            ) : null}
            {filters.department ? (
              <FilterPill
                label="Department"
                value={departmentLabelByValue.get(filters.department) ?? filters.department}
                color="bg-violet-100 text-violet-700"
                onRemove={() => handleFilterChange("department", "")}
              />
            ) : null}
            {filters.age ? (
              <FilterPill
                label="Age"
                value={ageLabelByValue.get(filters.age) ?? filters.age}
                color="bg-emerald-100 text-emerald-700"
                onRemove={() => handleFilterChange("age", "")}
              />
            ) : null}
            {filters.gender ? (
              <FilterPill
                label="Gender"
                value={genderLabelByValue.get(filters.gender) ?? filters.gender}
                color="bg-rose-100 text-rose-700"
                onRemove={() => handleFilterChange("gender", "")}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
