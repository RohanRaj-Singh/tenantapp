import type { AppLanguage } from "./translations";

interface LocalizedTextLike {
  en?: string;
  ar?: string;
}

export function resolveLocalizedText(
  fallback: string,
  translations: LocalizedTextLike | undefined,
  language: AppLanguage,
) {
  const preferred = translations?.[language]?.trim();

  if (preferred) {
    return preferred;
  }

  const secondary = translations?.en?.trim() || translations?.ar?.trim();
  return secondary || fallback;
}
