"use client";

import type { TenantRuntimeConfig } from "../contracts/runtime";

export const DEFAULT_PRIMARY = "#f58220";
export const DEFAULT_SECONDARY = "#f37820";
export const DEFAULT_LOGO = "/default/logo.png";
export const DEFAULT_BACKGROUND_IMAGE = "/default/background.png";
export const DEFAULT_TENANT_NAME = "RemedyGCC";
export const DEFAULT_FONT_FAMILY = "Inter, system-ui, sans-serif";
export const DEFAULT_FAVICON = "/favicon.ico";

const DEFAULT_DARK_TEXT = "#0f172a";
const DEFAULT_LIGHT_TEXT = "#ffffff";
const DEFAULT_PAGE_BASE = "#f8fafc";
const DEFAULT_DASHBOARD_BASE = "#f1f5f9";
const DEFAULT_CHART_GRID = "#e2e8f0";
const DEFAULT_CHART_TEXT = "#475569";
const MIN_TEXT_CONTRAST = 4.5;
const MIN_ACCENT_CONTRAST = 3;

export interface ResolvedTenantTheme {
  tenantName: string;
  logo: string;
  logoUrl: string;
  backgroundImage: string;
  faviconUrl: string;
  fontFamily: string;
  primaryColor: string;
  primaryHoverColor: string;
  secondaryColor: string;
  secondaryHoverColor: string;
  onPrimaryColor: string;
  onSecondaryColor: string;
  linkColor: string;
  linkHoverColor: string;
  softAccent: string;
  strongAccent: string;
  borderAccent: string;
  surfaceAccent: string;
  surfaceAccentStrong: string;
  brandGradient: string;
  heroGradient: string;
  headerGradient: string;
  pageGradient: string;
  dashboardGradient: string;
  cardGradient: string;
  chartGridColor: string;
  chartAxisColor: string;
  chartTooltipStyle: {
    backgroundColor: string;
    border: string;
    borderRadius: string;
    boxShadow: string;
    color: string;
  };
  chartColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
    info: string;
    warning: string;
    danger: string;
    neutral: string;
    palette: string[];
  };
}

function clampChannel(channel: number): number {
  return Math.max(0, Math.min(255, Math.round(channel)));
}

export function normalizeHexColor(value?: string | null, fallback = DEFAULT_PRIMARY): string {
  const normalizedValue = value?.trim().replace("#", "") ?? "";

  if (/^[\da-fA-F]{3}$/.test(normalizedValue)) {
    return `#${normalizedValue
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[\da-fA-F]{6}$/.test(normalizedValue)) {
    return `#${normalizedValue.toLowerCase()}`;
  }

  return normalizeHexColor(fallback, DEFAULT_PRIMARY);
}

function getRgb(color: string): [number, number, number] {
  const normalizedColor = normalizeHexColor(color);

  return [
    Number.parseInt(normalizedColor.slice(1, 3), 16),
    Number.parseInt(normalizedColor.slice(3, 5), 16),
    Number.parseInt(normalizedColor.slice(5, 7), 16),
  ];
}

export function hexToRgba(color: string, alpha: number): string {
  const [red, green, blue] = getRgb(color);
  const normalizedAlpha = Math.max(0, Math.min(alpha, 1));

  return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha})`;
}

export function mixHexColors(colorA: string, colorB: string, colorAWeight = 0.5): string {
  const normalizedWeight = Math.max(0, Math.min(colorAWeight, 1));
  const [redA, greenA, blueA] = getRgb(colorA);
  const [redB, greenB, blueB] = getRgb(colorB);

  const red = clampChannel((redA * normalizedWeight) + (redB * (1 - normalizedWeight)));
  const green = clampChannel((greenA * normalizedWeight) + (greenB * (1 - normalizedWeight)));
  const blue = clampChannel((blueA * normalizedWeight) + (blueB * (1 - normalizedWeight)));

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getRelativeLuminance(color: string): number {
  const [red, green, blue] = getRgb(color).map((channel) => {
    const normalizedChannel = channel / 255;

    return normalizedChannel <= 0.03928
      ? normalizedChannel / 12.92
      : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

export function getContrastRatio(foreground: string, background: string): number {
  const luminanceForeground = getRelativeLuminance(foreground);
  const luminanceBackground = getRelativeLuminance(background);
  const lightest = Math.max(luminanceForeground, luminanceBackground);
  const darkest = Math.min(luminanceForeground, luminanceBackground);

  return (lightest + 0.05) / (darkest + 0.05);
}

export function getReadableTextColor(
  backgroundColor: string,
  darkTextColor = DEFAULT_DARK_TEXT,
  lightTextColor = DEFAULT_LIGHT_TEXT,
): string {
  const normalizedBackground = normalizeHexColor(backgroundColor, DEFAULT_PRIMARY);
  const darkContrast = getContrastRatio(darkTextColor, normalizedBackground);
  const lightContrast = getContrastRatio(lightTextColor, normalizedBackground);

  return darkContrast >= lightContrast ? darkTextColor : lightTextColor;
}

export function ensureAccessibleColor(
  foregroundColor: string,
  backgroundColor: string,
  minimumContrast = MIN_TEXT_CONTRAST,
): string {
  const normalizedForeground = normalizeHexColor(foregroundColor, DEFAULT_PRIMARY);
  const normalizedBackground = normalizeHexColor(backgroundColor, "#ffffff");

  if (getContrastRatio(normalizedForeground, normalizedBackground) >= minimumContrast) {
    return normalizedForeground;
  }

  const targetColor =
    getReadableTextColor(normalizedBackground) === DEFAULT_LIGHT_TEXT ? "#ffffff" : "#000000";

  for (let step = 1; step <= 12; step += 1) {
    const candidate = mixHexColors(normalizedForeground, targetColor, 1 - (step / 12));

    if (getContrastRatio(candidate, normalizedBackground) >= minimumContrast) {
      return candidate;
    }
  }

  return mixHexColors(normalizedForeground, targetColor, 0.15);
}

function createHoverColor(color: string): string {
  const readableText = getReadableTextColor(color);
  const hoverTarget = readableText === DEFAULT_LIGHT_TEXT ? "#000000" : "#ffffff";

  return mixHexColors(color, hoverTarget, readableText === DEFAULT_LIGHT_TEXT ? 0.84 : 0.88);
}

function getNormalizedBranding(config: TenantRuntimeConfig | null) {
  const primaryColor = ensureAccessibleColor(config?.branding?.primaryColor ?? DEFAULT_PRIMARY, "#ffffff", MIN_ACCENT_CONTRAST);
  const fallbackSecondary = mixHexColors(primaryColor, DEFAULT_SECONDARY, 0.55);
  const secondaryColor = ensureAccessibleColor(
    config?.branding?.secondaryColor ?? fallbackSecondary,
    "#ffffff",
    MIN_ACCENT_CONTRAST,
  );

  return {
    tenantName: config?.tenant?.name?.trim() || DEFAULT_TENANT_NAME,
    logo: config?.branding?.logo?.trim() || config?.branding?.logoUrl?.trim() || DEFAULT_LOGO,
    logoUrl: config?.branding?.logo?.trim() || config?.branding?.logoUrl?.trim() || DEFAULT_LOGO,
    backgroundImage: config?.branding?.backgroundImage?.trim() || DEFAULT_BACKGROUND_IMAGE,
    faviconUrl: config?.branding?.faviconUrl?.trim() || DEFAULT_FAVICON,
    fontFamily: config?.branding?.fontFamily?.trim() || DEFAULT_FONT_FAMILY,
    primaryColor,
    secondaryColor,
  };
}

function createChartColors(primaryColor: string, secondaryColor: string) {
  const primary = ensureAccessibleColor(primaryColor, "#ffffff", MIN_ACCENT_CONTRAST);
  const secondary = ensureAccessibleColor(secondaryColor, "#ffffff", MIN_ACCENT_CONTRAST);
  const tertiary = ensureAccessibleColor(mixHexColors(primary, secondary, 0.5), "#ffffff", MIN_ACCENT_CONTRAST);
  const success = ensureAccessibleColor("#10b981", "#ffffff", MIN_ACCENT_CONTRAST);
  const info = ensureAccessibleColor("#2563eb", "#ffffff", MIN_ACCENT_CONTRAST);
  const warning = ensureAccessibleColor("#d97706", "#ffffff", MIN_ACCENT_CONTRAST);
  const danger = ensureAccessibleColor("#dc2626", "#ffffff", MIN_ACCENT_CONTRAST);
  const neutral = ensureAccessibleColor("#64748b", "#ffffff", MIN_ACCENT_CONTRAST);

  const palette = Array.from(
    new Set([primary, secondary, tertiary, info, success, warning, danger, neutral]),
  );

  return {
    primary,
    secondary,
    tertiary,
    success,
    info,
    warning,
    danger,
    neutral,
    palette,
  };
}

export function withBrandingDefaults(config: TenantRuntimeConfig): TenantRuntimeConfig {
  const branding = getNormalizedBranding(config);

  return {
    ...config,
    tenant: {
      ...config.tenant,
      name: branding.tenantName,
      slug: config.tenant.slug?.trim() || config.tenant.id || DEFAULT_TENANT_NAME.toLowerCase(),
    },
    branding: {
      logo: branding.logo,
      logoUrl: branding.logoUrl,
      backgroundImage: branding.backgroundImage,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      fontFamily: branding.fontFamily,
      faviconUrl: branding.faviconUrl,
    },
  };
}

export function getResolvedTheme(config: TenantRuntimeConfig | null): ResolvedTenantTheme {
  const normalizedBranding = getNormalizedBranding(config);
  const primaryColor = normalizedBranding.primaryColor;
  const secondaryColor = normalizedBranding.secondaryColor;
  const primaryHoverColor = createHoverColor(primaryColor);
  const secondaryHoverColor = createHoverColor(secondaryColor);
  const chartColors = createChartColors(primaryColor, secondaryColor);
  const onPrimaryColor = getReadableTextColor(primaryColor);
  const onSecondaryColor = getReadableTextColor(secondaryColor);
  const linkColor = ensureAccessibleColor(primaryColor, "#ffffff", MIN_TEXT_CONTRAST);
  const linkHoverColor = ensureAccessibleColor(createHoverColor(linkColor), "#ffffff", MIN_TEXT_CONTRAST);
  const softAccent = hexToRgba(primaryColor, 0.12);
  const strongAccent = hexToRgba(primaryColor, 0.18);
  const borderAccent = hexToRgba(primaryColor, 0.26);
  const surfaceAccent = hexToRgba(primaryColor, 0.06);
  const surfaceAccentStrong = hexToRgba(primaryColor, 0.11);

  return {
    tenantName: normalizedBranding.tenantName,
    logo: normalizedBranding.logo,
    logoUrl: normalizedBranding.logoUrl,
    backgroundImage: normalizedBranding.backgroundImage,
    faviconUrl: normalizedBranding.faviconUrl,
    fontFamily: normalizedBranding.fontFamily,
    primaryColor,
    primaryHoverColor,
    secondaryColor,
    secondaryHoverColor,
    onPrimaryColor,
    onSecondaryColor,
    linkColor,
    linkHoverColor,
    softAccent,
    strongAccent,
    borderAccent,
    surfaceAccent,
    surfaceAccentStrong,
    brandGradient: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
    heroGradient: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
    headerGradient: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.15)} 0%, ${hexToRgba(secondaryColor, 0.12)} 100%)`,
    pageGradient: `linear-gradient(180deg, ${hexToRgba(primaryColor, 0.06)} 0%, ${DEFAULT_PAGE_BASE} 38%, #ffffff 100%)`,
    dashboardGradient: `linear-gradient(180deg, ${hexToRgba(primaryColor, 0.08)} 0%, ${DEFAULT_DASHBOARD_BASE} 24%, #f8fafc 100%)`,
    cardGradient: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.06)} 0%, #ffffff 42%, ${hexToRgba(secondaryColor, 0.06)} 100%)`,
    chartGridColor: mixHexColors(DEFAULT_CHART_GRID, primaryColor, 0.9),
    chartAxisColor: mixHexColors(DEFAULT_CHART_TEXT, primaryColor, 0.86),
    chartTooltipStyle: {
      backgroundColor: "#ffffff",
      border: `1px solid ${mixHexColors(DEFAULT_CHART_GRID, primaryColor, 0.84)}`,
      borderRadius: "8px",
      boxShadow: "0 14px 36px -24px rgba(15, 23, 42, 0.35)",
      color: DEFAULT_DARK_TEXT,
    },
    chartColors,
  };
}

export function injectThemeVariables(config: TenantRuntimeConfig | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const theme = getResolvedTheme(config);
  const root = document.documentElement;
  const variables: Record<string, string> = {
    "--tenant-primary": theme.primaryColor,
    "--tenant-primary-hover": theme.primaryHoverColor,
    "--tenant-secondary": theme.secondaryColor,
    "--tenant-secondary-hover": theme.secondaryHoverColor,
    "--tenant-on-primary": theme.onPrimaryColor,
    "--tenant-on-secondary": theme.onSecondaryColor,
    "--tenant-link": theme.linkColor,
    "--tenant-link-hover": theme.linkHoverColor,
    "--tenant-font-family": theme.fontFamily,
    "--tenant-primary-soft": theme.softAccent,
    "--tenant-primary-soft-strong": theme.strongAccent,
    "--tenant-primary-border": theme.borderAccent,
    "--tenant-primary-surface": theme.surfaceAccent,
    "--tenant-primary-surface-strong": theme.surfaceAccentStrong,
    "--tenant-background-image": `url("${theme.backgroundImage}")`,
    "--tenant-brand-gradient": theme.brandGradient,
    "--tenant-header-gradient": theme.headerGradient,
    "--tenant-page-gradient": theme.pageGradient,
    "--tenant-dashboard-gradient": theme.dashboardGradient,
    "--tenant-card-gradient": theme.cardGradient,
    "--tenant-chart-grid": theme.chartGridColor,
    "--tenant-chart-text": theme.chartAxisColor,
    "--tenant-chart-1": theme.chartColors.palette[0] ?? theme.chartColors.primary,
    "--tenant-chart-2": theme.chartColors.palette[1] ?? theme.chartColors.secondary,
    "--tenant-chart-3": theme.chartColors.palette[2] ?? theme.chartColors.tertiary,
    "--tenant-chart-4": theme.chartColors.palette[3] ?? theme.chartColors.info,
    "--tenant-chart-5": theme.chartColors.palette[4] ?? theme.chartColors.success,
    "--tenant-chart-6": theme.chartColors.palette[5] ?? theme.chartColors.warning,
  };

  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  document.body.style.fontFamily = theme.fontFamily;

  const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement("link");
  favicon.rel = "icon";
  favicon.href = theme.faviconUrl;

  if (!favicon.parentNode) {
    document.head.appendChild(favicon);
  }
}
