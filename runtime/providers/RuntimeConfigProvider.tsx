"use client";

import { useState, useEffect, ReactNode } from 'react';
import { RuntimeContext, RuntimeContextValue } from '../context/RuntimeContext';
import { TenantRuntimeConfig } from '../contracts/runtime';
import { mockRuntimeConfig } from '../mocks/mockRuntimeConfig';

interface RuntimeConfigProviderProps {
  children: ReactNode;
}

export function RuntimeConfigProvider({ children }: RuntimeConfigProviderProps) {
  // Initialize with mock config immediately to avoid hydration issues
  const [config] = useState<TenantRuntimeConfig | null>(() => mockRuntimeConfig);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [tenantSlug] = useState<string | null>(() => 'demo-tenant');

  useEffect(() => {
    // In real app, fetch tenant from URL params
    // For now just sync state
  }, []);

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