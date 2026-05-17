"use client";

import { useEffect, type ReactNode } from "react";
import type { TenantRuntimeConfig } from "@/runtime/contracts/runtime";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import { injectThemeVariables, withBrandingDefaults } from "@/runtime/theme/themeUtils";

interface StaticRuntimeConfigProviderProps {
  children: ReactNode;
  config: TenantRuntimeConfig;
}

export function StaticRuntimeConfigProvider({
  children,
  config,
}: StaticRuntimeConfigProviderProps) {
  const runtimeConfig = withBrandingDefaults(config);

  useEffect(() => {
    injectThemeVariables(runtimeConfig);
  }, [runtimeConfig]);

  return (
    <RuntimeContext.Provider
      value={{
        config: runtimeConfig,
        loading: false,
        error: null,
        tenantSlug: runtimeConfig.tenant.slug,
        tenantSource: "hostname",
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}
