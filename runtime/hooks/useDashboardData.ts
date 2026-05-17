"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DashboardMetricsApiResponse } from "@/runtime/contracts/aggregation";
import { useTenantSlug } from "@/runtime/hooks/useRuntimeConfig";
import type { FilterState } from "@/components/dashboard/filter/DashboardFilters";
import {
  buildDashboardDataFromSnapshot,
  getDashboardMockData,
  type DashboardMockData,
} from "@/lib/dashboardMockData";

export function useDashboardData(tenantName: string, filters: FilterState) {
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();
  const [data, setData] = useState<DashboardMockData>(() => getDashboardMockData(tenantName));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug) {
      setData(getDashboardMockData(tenantName));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      tenant: tenantSlug,
    });

    if (filters.stream) {
      params.set("stream", filters.stream);
    }

    if (filters.location) {
      params.set("location", filters.location);
    }

    if (filters.function) {
      params.set("function", filters.function);
    }

    if (filters.department) {
      params.set("department", filters.department);
    }

    if (filters.age) {
      params.set("age", filters.age);
    }

    if (filters.gender) {
      params.set("gender", filters.gender);
    }

    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/metrics?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (response.status === 401) {
          const next = encodeURIComponent(pathname || "/dashboard");
          router.replace(`/login?message=${encodeURIComponent("Your session has expired. Please sign in again.")}&next=${next}`);
          throw new Error("AUTH_REDIRECT");
        }

        if (response.status === 403 && payload?.redirectTo) {
          router.replace(String(payload.redirectTo));
          throw new Error("AUTH_REDIRECT");
        }

        if (!response.ok) {
          throw new Error();
        }

        return payload as DashboardMetricsApiResponse;
      })
      .then((payload) => {
        if (payload.status !== "ready") {
          throw new Error();
        }

        setData(buildDashboardDataFromSnapshot(payload.snapshot, tenantName));
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }

        if ((fetchError as Error).message === "AUTH_REDIRECT") {
          return;
        }

        setData(getDashboardMockData(tenantName));
        setError(
          "Unable to load live dashboard metrics. Showing the local dashboard fallback.",
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [
    filters.age,
    filters.department,
    filters.function,
    filters.gender,
    filters.location,
    filters.stream,
    pathname,
    router,
    tenantName,
    tenantSlug,
  ]);

  return {
    data,
    loading,
    error,
  };
}
