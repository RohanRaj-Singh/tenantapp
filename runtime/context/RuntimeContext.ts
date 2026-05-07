"use client";

import { createContext } from 'react';
import { TenantRuntimeConfig } from '../contracts/runtime';

export interface RuntimeContextValue {
  config: TenantRuntimeConfig | null;
  loading: boolean;
  error: string | null;
  tenantSlug: string | null;
}

export const RuntimeContext = createContext<RuntimeContextValue>({
  config: null,
  loading: true,
  error: null,
  tenantSlug: null,
});