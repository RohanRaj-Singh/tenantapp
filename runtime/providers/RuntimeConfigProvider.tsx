"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  RuntimeContext,
  type RuntimeContextError,
  type RuntimeContextValue,
} from "../context/RuntimeContext";
import type { TenantRuntimeConfig } from "../contracts/runtime";
import {
  RUNTIME_TENANT_QUERY_PARAM,
  RUNTIME_TENANT_STORAGE_KEY,
  resolveRuntimeTenantRequestFromWindow,
  type RuntimeTenantRequestResolution,
  type RuntimeTenantResolutionSource,
} from "../tenant/tenantResolution";
import { injectThemeVariables, withBrandingDefaults } from "../theme/themeUtils";

interface RuntimeConfigProviderProps {
  children: ReactNode;
}

interface RuntimeConfigApiResponse {
  tenantSlug: string;
  source: RuntimeTenantResolutionSource;
  hostname: string | null;
  rootDomain: string;
  config: TenantRuntimeConfig;
}

interface RuntimeApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

function resolveRequestedTenant() {
  return resolveRuntimeTenantRequestFromWindow();
}

function buildRuntimeConfigRequestUrl(
  tenantResolution: RuntimeTenantRequestResolution,
) {
  const params = new URLSearchParams();

  if (
    tenantResolution.tenantSlug &&
    tenantResolution.source !== "hostname"
  ) {
    params.set(RUNTIME_TENANT_QUERY_PARAM, tenantResolution.tenantSlug);
  }

  const queryString = params.toString();
  return queryString.length > 0
    ? `/api/runtime/current?${queryString}`
    : "/api/runtime/current";
}

function toRuntimeContextError(
  error: unknown,
  tenantResolution: RuntimeTenantRequestResolution,
): RuntimeContextError {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  ) {
    const apiError = error as RuntimeContextError;
    return {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: "RUNTIME_FETCH_FAILED",
      message: "This survey is currently unavailable.",
      details: {
        cause: error.message,
        tenantSlug: tenantResolution.tenantSlug,
        failureReason: tenantResolution.failureReason,
      },
    };
  }

  return {
    code: "RUNTIME_FETCH_FAILED",
    message: "This survey is currently unavailable.",
    details: {
      tenantSlug: tenantResolution.tenantSlug,
      failureReason: tenantResolution.failureReason,
    },
  };
}

export function RuntimeConfigProvider({
  children,
}: RuntimeConfigProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [config, setConfig] = useState<TenantRuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RuntimeContextError | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantSource, setTenantSource] =
    useState<RuntimeTenantResolutionSource | null>(null);

  useEffect(() => {
    let ignore = false;

    const syncTenantConfig = async () => {
      const tenantResolution = resolveRequestedTenant();

      setTenantSlug(tenantResolution.tenantSlug);
      setTenantSource(
        tenantResolution.source === "none" ? null : tenantResolution.source,
      );
      setConfig((currentConfig) =>
        currentConfig?.tenant.slug === tenantResolution.tenantSlug
          ? currentConfig
          : null,
      );
      setLoading(true);
      setError(null);

      if (
        tenantResolution.source === "query" &&
        tenantResolution.tenantSlug
      ) {
        window.localStorage.setItem(
          RUNTIME_TENANT_STORAGE_KEY,
          tenantResolution.tenantSlug,
        );
      }

      try {
        const response = await fetch(
          buildRuntimeConfigRequestUrl(tenantResolution),
          { cache: "no-store" },
        );
        const payload =
          (await response.json().catch(() => null)) as
            | RuntimeConfigApiResponse
            | RuntimeApiErrorPayload
            | null;

        if (!response.ok) {
          const errorPayload = payload as RuntimeApiErrorPayload | null;

          throw {
            code: errorPayload?.error?.code ?? "RUNTIME_FETCH_FAILED",
            message:
              errorPayload?.error?.message ??
              "This survey is currently unavailable.",
            details: errorPayload?.error?.details,
          } satisfies RuntimeContextError;
        }

        const runtimePayload = payload as RuntimeConfigApiResponse;

        if (!ignore) {
          setConfig(withBrandingDefaults(runtimePayload.config));
          setTenantSlug(runtimePayload.tenantSlug);
          setTenantSource(runtimePayload.source);
          setError(null);
        }
      } catch (fetchError) {
        if (!ignore) {
          setConfig(null);
          setError(toRuntimeContextError(fetchError, tenantResolution));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void syncTenantConfig();

    return () => {
      ignore = true;
    };
  }, [pathname, searchParamsKey]);

  useEffect(() => {
    injectThemeVariables(config);
  }, [config]);

  const value: RuntimeContextValue = {
    config,
    loading,
    error,
    tenantSlug,
    tenantSource,
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
}
