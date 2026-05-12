"use client";

import { useContext } from "react";
import type { RuntimeContextError } from "../context/RuntimeContext";
import { RuntimeContext } from "../context/RuntimeContext";
import type { TenantRuntimeConfig } from "../contracts/runtime";
import type { RuntimeTenantResolutionSource } from "../tenant/tenantResolution";

export function useRuntimeConfig(): TenantRuntimeConfig {
  const { config } = useContext(RuntimeContext);
  if (!config) {
    throw new Error('Runtime config not loaded');
  }
  return config;
}

export function useTenantSlug(): string | null {
  const { tenantSlug } = useContext(RuntimeContext);
  return tenantSlug;
}

export function useTenantSource(): RuntimeTenantResolutionSource | null {
  const { tenantSource } = useContext(RuntimeContext);
  return tenantSource;
}

export function useRuntimeLoading(): boolean {
  const { loading } = useContext(RuntimeContext);
  return loading;
}

export function useRuntimeError(): RuntimeContextError | null {
  const { error } = useContext(RuntimeContext);
  return error;
}
