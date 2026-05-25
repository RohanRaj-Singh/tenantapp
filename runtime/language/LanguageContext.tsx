"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { RuntimeContext } from "../context/RuntimeContext";
import { LANGUAGE_COOKIE_NAME, LANGUAGE_STORAGE_KEY } from "./cookie";
import {
  getTenantCopyWithOverrides,
  type AppLanguage,
  type TenantStaticCopy,
} from "./translations";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  isRtl: boolean;
  direction: "ltr" | "rtl";
  copy: TenantStaticCopy;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
  isRtl: false,
  direction: "ltr",
  copy: getTenantCopyWithOverrides("en"),
});

function isSupportedLanguage(value: string | null): value is AppLanguage {
  return value === "en" || value === "ar";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { config } = useContext(RuntimeContext);
  const router = useRouter();
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isSupportedLanguage(storedLanguage)) {
      setLanguageState(storedLanguage);
      return;
    }

    if (config?.runtimeSettings.language) {
      setLanguageState(config.runtimeSettings.language);
    }
  }, [config?.runtimeSettings.language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      isRtl: false,
      direction: "ltr",
      copy: getTenantCopyWithOverrides(language, config?.content),
    };
  }, [config?.content, language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
