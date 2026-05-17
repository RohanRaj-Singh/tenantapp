"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DashboardMetricsApiResponse, DashboardAggregationSnapshot } from "@/runtime/contracts/aggregation";
import { useTenantSlug } from "@/runtime/hooks/useRuntimeConfig";
import type { FilterState } from "@/components/dashboard/filter/DashboardFilters";
import {
  buildDashboardDataFromSnapshot,
  createZeroDashboardData,
  getDashboardMockData,
} from "@/lib/dashboardMockData";
import type { DashboardDataState } from "./dashboardDataState";

interface UseDashboardDataResult {
  state: DashboardDataState;
  isLoading: boolean;
  isStale: boolean;
  isReady: boolean;
  refetch: () => void;
}

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const SHOULD_USE_DEVELOPMENT_MOCKS = process.env.NODE_ENV !== "production";
const SHOULD_LOG_DEVELOPMENT_WARNINGS = process.env.NODE_ENV !== "production";

export function useDashboardData(tenantName: string, filters: FilterState): UseDashboardDataResult {
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();
  const [state, setState] = useState<DashboardDataState>({ status: "loading" });

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    const currentTenantSlug = tenantSlug;
    
    if (!currentTenantSlug) {
      if (SHOULD_USE_DEVELOPMENT_MOCKS) {
        if (SHOULD_LOG_DEVELOPMENT_WARNINGS) {
          console.warn("Dashboard: tenantSlug is unavailable during local development", {
            tenantName,
          });
        }
        setState({ status: "ready", snapshot: null, data: getDashboardMockData(tenantName) });
        return;
      }

      setState({
        status: "error",
        error: "Tenant dashboard context is unavailable.",
      });
      return;
    }

    const localController = new AbortController();
    const params = new URLSearchParams({ tenant: currentTenantSlug });

    if (filters.stream) params.set("stream", filters.stream);
    if (filters.location) params.set("location", filters.location);
    if (filters.function) params.set("function", filters.function);
    if (filters.department) params.set("department", filters.department);
    if (filters.age) params.set("age", filters.age);
    if (filters.gender) params.set("gender", filters.gender);

    setState({ status: "loading" });

    try {
      const response = await fetch(`/api/dashboard/metrics?${params.toString()}`, {
        cache: "no-store",
        signal: signal ?? localController.signal,
      });

      if (signal?.aborted) return;

      const payload = (await response.json().catch(() => null)) as DashboardMetricsApiResponse | null;

      if (response.status === 401) {
        setState({
          status: "ready",
          snapshot: null,
          data: createZeroDashboardData(tenantName),
        });
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?message=${encodeURIComponent("Your session has expired. Please sign in again.")}&next=${next}`);
        return;
      }

      if (response.status === 403 && payload && "redirectTo" in payload && payload.redirectTo) {
        setState({
          status: "ready",
          snapshot: null,
          data: createZeroDashboardData(tenantName),
        });
        router.replace(String(payload.redirectTo));
        return;
      }

      if (!response.ok || !payload) {
        throw new Error(`Dashboard metrics request failed with status ${response.status}`);
      }

      if (payload.status === "pending_snapshot") {
        if (SHOULD_LOG_DEVELOPMENT_WARNINGS) {
          console.info("Dashboard: snapshot pending, returning zero-state metrics");
        }
        setState({
          status: "ready",
          snapshot: null,
          data: createZeroDashboardData(tenantName),
        });
        return;
      }

      const snapshot = payload.snapshot as DashboardAggregationSnapshot;

      const now = Date.now();
      const generatedAtMs = new Date(snapshot.generatedAt).getTime();
      const isStale = now - generatedAtMs > STALE_THRESHOLD_MS;

      const data = buildDashboardDataFromSnapshot(snapshot, tenantName);

      if (isStale) {
        setState({
          status: "stale",
          snapshot,
          data,
          generatedAt: snapshot.generatedAt,
        });
        return;
      }

      setState({
        status: "ready",
        snapshot,
        data,
      });
    } catch (fetchError: unknown) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      if (SHOULD_USE_DEVELOPMENT_MOCKS) {
        if (SHOULD_LOG_DEVELOPMENT_WARNINGS) {
          console.warn("Dashboard: API error, using mock data in development", fetchError);
        }
        setState({ status: "ready", snapshot: null, data: getDashboardMockData(tenantName) });
        return;
      }

      setState({
        status: "error",
        error: "Dashboard data is temporarily unavailable.",
      });
    }
  }, [tenantSlug, filters, pathname, router, tenantName]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      await fetchData(controller.signal);
    })();

    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const isLoading = state.status === "loading";
  const isStale = state.status === "stale";
  const isReady = state.status === "ready" || state.status === "stale";

  return {
    state,
    isLoading,
    isStale,
    isReady,
    refetch,
  };
}
