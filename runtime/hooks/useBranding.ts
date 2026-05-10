"use client";

import { useTheme } from "../theme/useTheme";

export function useBranding() {
  const theme = useTheme();

  return {
    logoUrl: theme.logoUrl,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    fontFamily: theme.fontFamily,
    faviconUrl: theme.faviconUrl,
  };
}
