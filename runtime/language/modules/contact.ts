import type { AppLanguage, TenantStaticCopy } from "../types";

type ContactCopySection = Pick<TenantStaticCopy, "contact">;

export const contactCopy: Record<AppLanguage, ContactCopySection> = {
  en: {
    contact: {
      chip: "Contact",
      title: "Contact Us",
      description: (tenantName) =>
        `Have questions about the ${tenantName} wellbeing survey? Reach out to us.`,
      email: "support@remedygcc.com",
      location: "Oman",
    },
  },
  ar: {
    contact: {
      chip: "تواصل",
      title: "تواصل معنا",
      description: (tenantName) =>
        `هل لديك أسئلة حول استبيان رفاهية ${tenantName}؟ تواصل معنا.`,
      email: "support@remedygcc.com",
      location: "عُمان",
    },
  },
};
