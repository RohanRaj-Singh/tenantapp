import type { LocalizedText } from "../contracts/scannerVersion";
import type { AppLanguage } from "./translations";

export function resolveLocalizedText(
  fallback: string,
  translations: LocalizedText | undefined,
  language: AppLanguage,
) {
  const preferred = translations?.[language]?.trim();

  if (preferred) {
    return preferred;
  }

  const secondary = translations?.en?.trim() || translations?.ar?.trim();
  return secondary || fallback;
}
