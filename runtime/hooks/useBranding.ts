"use client";

import { useTheme } from "../theme/useTheme";

export function useBranding() {
  const theme = useTheme();

  return {
    logo: theme.logo,
    logoUrl: theme.logoUrl,
    backgroundImage: theme.backgroundImage,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    fontFamily: theme.fontFamily,
    faviconUrl: theme.faviconUrl,
  };
}
