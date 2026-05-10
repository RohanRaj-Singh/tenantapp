"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RuntimeContext, type RuntimeContextValue } from "../context/RuntimeContext";
import type { TenantRuntimeConfig } from "../contracts/runtime";
import {
  DEFAULT_MOCK_TENANT_SLUG,
  getMockTenantConfig,
  MOCK_TENANT_QUERY_PARAM,
  MOCK_TENANT_STORAGE_KEY,
  resolveMockTenantSlug,
} from "../mocks/mockTenantRegistry";
import { injectThemeVariables, withBrandingDefaults } from "../theme/themeUtils";

interface RuntimeConfigProviderProps {
  children: ReactNode;
}

function resolveRequestedTenantSlug(): string {
  if (typeof window === "undefined") {
    return DEFAULT_MOCK_TENANT_SLUG;
  }

  const queryTenant = new URLSearchParams(window.location.search).get(MOCK_TENANT_QUERY_PARAM);
  const storedTenant = window.localStorage.getItem(MOCK_TENANT_STORAGE_KEY);

  return resolveMockTenantSlug(
    queryTenant ?? storedTenant ?? process.env.NEXT_PUBLIC_TENANT_SLUG ?? DEFAULT_MOCK_TENANT_SLUG,
  );
}

export function RuntimeConfigProvider({ children }: RuntimeConfigProviderProps) {
  const [config, setConfig] = useState<TenantRuntimeConfig | null>(() => {
    const resolvedTenantSlug = resolveRequestedTenantSlug();
    return withBrandingDefaults(getMockTenantConfig(resolvedTenantSlug));
  });
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(() => config?.tenant.slug ?? DEFAULT_MOCK_TENANT_SLUG);

  useEffect(() => {
    const syncTenantConfig = () => {
      const resolvedTenantSlug = resolveRequestedTenantSlug();
      const nextConfig = withBrandingDefaults(getMockTenantConfig(resolvedTenantSlug));

      setTenantSlug(resolvedTenantSlug);
      setConfig(nextConfig);
      window.localStorage.setItem(MOCK_TENANT_STORAGE_KEY, resolvedTenantSlug);
    };

    syncTenantConfig();
    window.addEventListener("popstate", syncTenantConfig);

    return () => window.removeEventListener("popstate", syncTenantConfig);
  }, []);

  useEffect(() => {
    if (config) {
      injectThemeVariables(config);
    }
  }, [config]);

  const value: RuntimeContextValue = {
    config,
    loading,
    error,
    tenantSlug,
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
}
