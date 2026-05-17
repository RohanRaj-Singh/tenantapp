import type { TenantRuntimeConfig } from "../contracts/runtime";

export const DEFAULT_PRIMARY = "#f58220";
export const DEFAULT_SECONDARY = "#f37820";
export const DEFAULT_LOGO = "/images/logo.png";
export const DEFAULT_TENANT_NAME = "RemedyGCC";
export const DEFAULT_FONT_FAMILY = "Inter, system-ui, sans-serif";
export const DEFAULT_FAVICON = "/favicon.ico";

function clampChannel(channel: number): number {
  return Math.max(0, Math.min(255, Math.round(channel)));
}

export function normalizeHexColor(
  value?: string | null,
  fallback = DEFAULT_PRIMARY,
): string {
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

export function getContrastRatio(
  foreground: string,
  background: string,
): number {
  const getLuminance = (color: string): number => {
    const [r, g, b] = getRgb(color).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.715 * g + 0.0722 * b;
  };

  const lighter = Math.max(getLuminance(foreground), getLuminance(background));
  const darker = Math.min(getLuminance(foreground), getLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureAccessibleColor(
  foregroundColor: string,
  backgroundColor: string,
  minimumContrast = 4.5,
): string {
  return getContrastRatio(normalizeHexColor(foregroundColor), backgroundColor) >= minimumContrast
    ? foregroundColor
    : foregroundColor;
}

export function withBrandingDefaults(
  config: TenantRuntimeConfig,
): TenantRuntimeConfig {
  const primaryColor = ensureAccessibleColor(
    config.branding?.primaryColor ?? DEFAULT_PRIMARY,
    "#ffffff",
    3,
  );
  const fallbackSecondary = mixHexColors(primaryColor, DEFAULT_SECONDARY, 0.55);
  const secondaryColor = ensureAccessibleColor(
    config.branding?.secondaryColor ?? fallbackSecondary,
    "#ffffff",
    3,
  );

  return {
    ...config,
    tenant: {
      ...config.tenant,
      name: config.tenant.name?.trim() || DEFAULT_TENANT_NAME,
      slug: config.tenant.slug?.trim() || config.tenant.id || DEFAULT_TENANT_NAME.toLowerCase(),
    },
    branding: {
      logoUrl: config.branding?.logoUrl?.trim() || DEFAULT_LOGO,
      primaryColor,
      secondaryColor,
      fontFamily: config.branding?.fontFamily?.trim() || DEFAULT_FONT_FAMILY,
      faviconUrl: config.branding?.faviconUrl?.trim() || DEFAULT_FAVICON,
    },
  };
}

function mixHexColors(
  colorA: string,
  colorB: string,
  colorAWeight = 0.5,
): string {
  const normalizedWeight = Math.max(0, Math.min(colorAWeight, 1));
  const [redA, greenA, blueA] = getRgb(colorA);
  const [redB, greenB, blueB] = getRgb(colorB);

  const red = clampChannel(redA * normalizedWeight + redB * (1 - normalizedWeight));
  const green = clampChannel(greenA * normalizedWeight + greenB * (1 - normalizedWeight));
  const blue = clampChannel(blueA * normalizedWeight + blueB * (1 - normalizedWeight));

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
