"use client";

import { useRuntimeConfig } from '../hooks/useRuntimeConfig';
import {
  getPrimaryColor,
  getSecondaryColor,
  getLogoUrl,
  getTenantName,
  getFontFamily,
  getFaviconUrl,
} from './themeUtils';

export function useTheme() {
  let config = null;
  try {
    config = useRuntimeConfig();
  } catch {
    config = null;
  }

  return {
    primaryColor: getPrimaryColor(config),
    secondaryColor: getSecondaryColor(config),
    logoUrl: getLogoUrl(config),
    tenantName: getTenantName(config),
    fontFamily: getFontFamily(config),
    faviconUrl: getFaviconUrl(config),
  };
}