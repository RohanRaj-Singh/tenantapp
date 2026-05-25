import type { TenantContentConfig, TenantContentText } from "../contracts/runtime";
import { aboutCopy } from "./modules/about";
import { attributeFormCopy } from "./modules/attributeForm";
import { authCopy } from "./modules/auth";
import { commonCopy } from "./modules/common";
import { contactCopy } from "./modules/contact";
import { dashboardCopy } from "./modules/dashboard";
import { homeCopy } from "./modules/home";
import { runtimeUnavailableCopy } from "./modules/runtimeUnavailable";
import { surveyCopy } from "./modules/survey";
import type { AppLanguage, TenantStaticCopy } from "./types";

export type { AppLanguage, AttributeFieldKey, TenantStaticCopy } from "./types";

const EN_COPY: TenantStaticCopy = {
  ...commonCopy.en,
  ...homeCopy.en,
  ...aboutCopy.en,
  ...contactCopy.en,
  ...surveyCopy.en,
  ...runtimeUnavailableCopy.en,
  ...attributeFormCopy.en,
  ...dashboardCopy.en,
  ...authCopy.en,
};

const AR_COPY: TenantStaticCopy = {
  ...commonCopy.ar,
  ...homeCopy.ar,
  ...aboutCopy.ar,
  ...contactCopy.ar,
  ...surveyCopy.ar,
  ...runtimeUnavailableCopy.ar,
  ...attributeFormCopy.ar,
  ...dashboardCopy.ar,
  ...authCopy.ar,
};

export const APP_COPY: Record<AppLanguage, TenantStaticCopy> = {
  en: EN_COPY,
  ar: AR_COPY,
};

export function getTenantStaticCopy(language: AppLanguage): TenantStaticCopy {
  return APP_COPY[language];
}

function resolveTenantContentValue(
  value: TenantContentText | undefined,
  language: AppLanguage,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const preferred = value[language]?.trim();
  if (preferred) {
    return preferred;
  }

  return value.en?.trim() || value.ar?.trim() || undefined;
}

export function getTenantCopyWithOverrides(
  language: AppLanguage,
  content?: TenantContentConfig | null,
): TenantStaticCopy {
  const baseCopy = getTenantStaticCopy(language);
  const aboutIntro = resolveTenantContentValue(content?.pages?.about?.intro, language);

  if (!aboutIntro) {
    return baseCopy;
  }

  return {
    ...baseCopy,
    about: {
      ...baseCopy.about,
      intro: aboutIntro,
    },
  };
}
