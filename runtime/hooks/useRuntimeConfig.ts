"use client";

import { useContext } from 'react';
import { RuntimeContext } from '../context/RuntimeContext';
import { TenantRuntimeConfig } from '../contracts/runtime';

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

export function useRuntimeLoading(): boolean {
  const { loading } = useContext(RuntimeContext);
  return loading;
}

export function useRuntimeError(): string | null {
  const { error } = useContext(RuntimeContext);
  return error;
}