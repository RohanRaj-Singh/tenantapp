"use client";

import { TenantRuntimeConfig } from '../contracts/runtime';

const OQEP_ORANGE = '#f58220';
const OQEP_SECONDARY = '#f37820';
const OQEP_LOGO = '/images/logo.png';

export function getPrimaryColor(config: TenantRuntimeConfig | null): string {
  return config?.branding?.primaryColor || OQEP_ORANGE;
}

export function getSecondaryColor(config: TenantRuntimeConfig | null): string {
  return config?.branding?.secondaryColor || OQEP_SECONDARY;
}

export function getLogoUrl(config: TenantRuntimeConfig | null): string {
  return config?.branding?.logoUrl || OQEP_LOGO;
}

export function getTenantName(config: TenantRuntimeConfig | null): string {
  return config?.tenant?.name || 'RemedyGCC';
}

export function getFontFamily(config: TenantRuntimeConfig | null): string {
  return config?.branding?.fontFamily || 'Inter, system-ui, sans-serif';
}

export function getFaviconUrl(config: TenantRuntimeConfig | null): string {
  return config?.branding?.faviconUrl || '/favicon.ico';
}

export function injectThemeVariables(config: TenantRuntimeConfig | null): void {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', getPrimaryColor(config));
  root.style.setProperty('--tenant-secondary', getSecondaryColor(config));
}

export function getThemeStyles(config: TenantRuntimeConfig | null): {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  tenantName: string;
} {
  return {
    primaryColor: getPrimaryColor(config),
    secondaryColor: getSecondaryColor(config),
    logoUrl: getLogoUrl(config),
    tenantName: getTenantName(config),
  };
}