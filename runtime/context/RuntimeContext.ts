"use client";

import { createContext } from "react";
import type { RuntimeTenantResolutionSource } from "../tenant/tenantResolution";
import type { TenantRuntimeConfig } from "../contracts/runtime";

export interface RuntimeContextError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RuntimeContextValue {
  config: TenantRuntimeConfig | null;
  loading: boolean;
  error: RuntimeContextError | null;
  tenantSlug: string | null;
  tenantSource: RuntimeTenantResolutionSource | null;
}

export const RuntimeContext = createContext<RuntimeContextValue>({
  config: null,
  loading: true,
  error: null,
  tenantSlug: null,
  tenantSource: null,
});
