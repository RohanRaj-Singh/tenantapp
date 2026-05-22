"use client";

import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

export default function LanguageTogglePill() {
  const theme = useTheme();
  const { language, setLanguage, copy } = useLanguage();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-40 flex justify-end px-4 sm:top-[6.1rem] sm:px-6">
      <div
        className="pointer-events-auto inline-flex rounded-full border bg-white/90 p-1 shadow-sm backdrop-blur"
        style={{ borderColor: theme.borderAccent, boxShadow: `0 18px 36px -30px ${theme.strongAccent}` }}
        aria-label={copy.languageToggle.ariaLabel}
      >
        {(["en", "ar"] as const).map((item) => {
          const isActive = language === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setLanguage(item)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm"
              style={
                isActive
                  ? {
                      background: theme.brandGradient,
                      color: theme.onPrimaryColor,
                    }
                  : {
                      color: theme.linkColor,
                    }
              }
            >
              {item === "en" ? copy.languageToggle.english : copy.languageToggle.arabic}
            </button>
          );
        })}
      </div>
    </div>
  );
}
