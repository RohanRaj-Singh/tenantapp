import type { AppLanguage, TenantStaticCopy } from "../types";

type CommonCopySection = Pick<
  TenantStaticCopy,
  "navigation" | "languageToggle" | "header" | "notFound"
>;

export const commonCopy: Record<AppLanguage, CommonCopySection> = {
  en: {
    navigation: {
      home: "Home",
      about: "About",
      contact: "Contact Us",
    },
    languageToggle: {
      ariaLabel: "Switch language",
      english: "EN",
      arabic: "AR",
    },
    header: {
      menuAriaLabel: "Toggle menu",
      logoAlt: (tenantName) => `${tenantName} logo`,
    },
    notFound: {
      description: "Page not found",
      goHome: "Go Home",
    },
  },
  ar: {
    navigation: {
      home: "الرئيسية",
      about: "من نحن",
      contact: "تواصل معنا",
    },
    languageToggle: {
      ariaLabel: "تبديل اللغة",
      english: "EN",
      arabic: "AR",
    },
    header: {
      menuAriaLabel: "تبديل القائمة",
      logoAlt: (tenantName) => `شعار ${tenantName}`,
    },
    notFound: {
      description: "الصفحة غير موجودة",
      goHome: "العودة للرئيسية",
    },
  },
};
