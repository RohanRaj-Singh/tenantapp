import type { AppLanguage, TenantStaticCopy } from "../types";

type HomeCopySection = Pick<TenantStaticCopy, "home">;

export const homeCopy: Record<AppLanguage, HomeCopySection> = {
  en: {
    home: {
      bannerAlt: "Wellbeing Survey Banner",
      heroTitle: "Employee Wellbeing Survey",
      heroDescription:
        "Your organization cares about your wellbeing. Take this anonymous survey to help us understand and improve your work experience.",
      startSurvey: "Start Survey",
    },
  },
  ar: {
    home: {
      bannerAlt: "بانر استبيان الرفاهية",
      heroTitle: "استبيان رفاهية الموظفين",
      heroDescription:
        "تهتم مؤسستك برفاهيتك. شارك في هذا الاستبيان المجهول لمساعدتنا على فهم تجربة عملك وتحسينها.",
      startSurvey: "ابدأ الاستبيان",
    },
  },
};
