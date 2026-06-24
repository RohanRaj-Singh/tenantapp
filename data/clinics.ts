/**
 * Shared clinic reference data used by both the Tenant App dashboard
 * and the Marketing Site employee portal.
 *
 * This is the source of truth for clinic dropdowns in claim forms.
 * Keep in sync with remedygcc-marketing/src/data/clinics.ts.
 */
export interface Clinic {
  id: number;
  slug: string;
  name: string;
  nameAr: string;
}

export const clinicsData: Clinic[] = [
  { id: 1, slug: "eunoia-clinic", name: "Eunoia Clinic", nameAr: "عيادة يونويا" },
  { id: 2, slug: "hayat-counseling-center", name: "Hayat Counseling Center", nameAr: "مركز حياة للاستشارات" },
  { id: 3, slug: "al-harub-medical-center", name: "Al Harub Medical Center", nameAr: "مركز الحاروب الطبي" },
  { id: 4, slug: "whispers-of-serenity-clinic", name: "Whispers of Serenity Clinic", nameAr: "عيادة همسات السكينة" },
  { id: 5, slug: "ehtewa-mental-health-clinic", name: "Ehtewa Mental Health Clinic", nameAr: "عيادة احتواء للصحة النفسية" },
  { id: 6, slug: "nine-wellness-centre", name: "Nine – Pregnancy, Mother & Child Wellness Centre", nameAr: "ناين – مركز صحة الأم والطفل والعائلة" },
];

export function getClinicBySlug(slug: string): Clinic | undefined {
  return clinicsData.find((c) => c.slug === slug);
}

export function getClinicById(id: number): Clinic | undefined {
  return clinicsData.find((c) => c.id === id);
}
