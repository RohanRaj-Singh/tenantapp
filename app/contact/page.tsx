"use client";

import { Mail, MapPin } from "lucide-react";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

export default function ContactPage() {
  const theme = useTheme();
  const { copy } = useLanguage();

  return (
    <div className="tenant-page-shell min-h-screen px-4 py-12 pt-28 sm:px-6 sm:pt-32">
      <div className="mx-auto max-w-3xl">
        <span className="tenant-chip mb-4 inline-flex rounded-full px-4 py-1.5 text-sm font-medium">
          {copy.contact.chip}
        </span>
        <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">{copy.contact.title}</h1>
        <p className="mb-8 text-sm leading-7 text-gray-600 sm:text-base">
          {copy.contact.description(theme.tenantName)}
        </p>

        <div
          className="rounded-2xl border bg-white p-5 shadow sm:p-6"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <div className="space-y-4">
            {[
              { icon: Mail, text: copy.contact.email },
              //{ icon: Phone, text: "+1 (555) 123-4567" },
              { icon: MapPin, text: copy.contact.location },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.text} className="flex items-start gap-3 sm:items-center">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.surfaceAccentStrong, color: theme.linkColor }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="min-w-0 break-words text-gray-700">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
