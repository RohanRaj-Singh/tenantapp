import type { AppLanguage, TenantStaticCopy } from "../types";

type AboutCopySection = Pick<TenantStaticCopy, "about">;

export const aboutCopy: Record<AppLanguage, AboutCopySection> = {
  en: {
    about: {
      titlePrefix: "About",
      intro:
        "Our wellbeing platform helps organizations understand and improve employee experience through data-driven insights.",
      missionTitle: "Our Mission",
      missionCopy:
        "To create healthier, more productive workplaces through meaningful employee feedback.",
      visionTitle: "Our Vision",
      visionCopy: "A world where every workplace prioritizes mental health and wellbeing.",
      valuesTitle: "Our Values",
      valuesCopy: "Privacy, Accuracy, Simplicity, and Growth guide everything we do.",
    },
  },
  ar: {
    about: {
      titlePrefix: "عن",
      intro:
        "تساعد منصتنا للرفاهية المؤسسات على فهم تجربة الموظفين وتحسينها من خلال رؤى قائمة على البيانات.",
      missionTitle: "رسالتنا",
      missionCopy:
        "بناء بيئات عمل أكثر صحة وإنتاجية من خلال ملاحظات الموظفين الهادفة.",
      visionTitle: "رؤيتنا",
      visionCopy: "عالم تعطي فيه كل جهة عمل أولوية للصحة النفسية والرفاهية.",
      valuesTitle: "قيمنا",
      valuesCopy: "الخصوصية والدقة والبساطة والنمو هي المبادئ التي توجه كل ما نقوم به.",
    },
  },
};
