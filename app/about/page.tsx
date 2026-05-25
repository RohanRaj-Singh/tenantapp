"use client";

import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

export default function AboutPage() {
  const theme = useTheme();
  const { copy } = useLanguage();

  return (
    <div className="tenant-page-shell min-h-screen">
      <section className="flex w-full flex-col items-center justify-center px-4 py-12 pt-28 text-center sm:px-6 sm:pt-32">
        
        <h1 className="mb-4 max-w-4xl break-words text-3xl font-medium text-gray-900 sm:text-4xl">
          {copy.about.titlePrefix} <span className="font-semibold" style={{ color: theme.linkColor }}>{theme.tenantName}</span>
        </h1>
        

        <div
          className="mx-auto mb-10 mt-8 max-w-5xl rounded-2xl border bg-white p-5 shadow-md sm:mb-12 sm:mt-12 sm:p-6"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <p className="mb-6 text-sm leading-7 text-gray-700 md:text-base">
            {copy.about.intro}
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {[
            {
              title: copy.about.missionTitle,
              copy: copy.about.missionCopy,
            },
            {
              title: copy.about.visionTitle,
              copy: copy.about.visionCopy,
            },
            {
              title: copy.about.valuesTitle,
              copy: copy.about.valuesCopy,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border bg-white p-5 text-center shadow-md sm:p-6"
              style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
            >
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
