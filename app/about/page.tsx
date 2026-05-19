"use client";

import { useTheme } from "@/runtime/theme/useTheme";

export default function AboutPage() {
  const theme = useTheme();

  return (
    <div className="tenant-page-shell min-h-screen">
      <section className="flex w-full flex-col items-center justify-center px-4 py-12 pt-28 text-center sm:px-6 sm:pt-32">
        <span className="tenant-chip mb-4 inline-flex rounded-full px-4 py-1.5 text-sm font-medium">
          Tenant Overview
        </span>
        <h1 className="mb-4 max-w-4xl break-words text-3xl font-medium text-gray-900 sm:text-4xl">
          About <span className="font-semibold" style={{ color: theme.linkColor }}>{theme.tenantName}</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
          {theme.tenantName} partners with RemedyGCC to provide comprehensive wellbeing insights.
        </p>

        <div
          className="mx-auto mb-10 mt-8 max-w-5xl rounded-2xl border bg-white p-5 shadow-md sm:mb-12 sm:mt-12 sm:p-6"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <p className="mb-6 text-sm leading-7 text-gray-700 md:text-base">
            Our wellbeing platform helps organizations understand and improve employee experience through data-driven
            insights.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {[
            {
              title: "Our Mission",
              copy: "To create healthier, more productive workplaces through meaningful employee feedback.",
            },
            {
              title: "Our Vision",
              copy: "A world where every workplace prioritizes mental health and wellbeing.",
            },
            {
              title: "Our Values",
              copy: "Privacy, Accuracy, Simplicity, and Growth guide everything we do.",
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
