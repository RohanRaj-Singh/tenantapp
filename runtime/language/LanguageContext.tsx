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
import { RuntimeContext } from "../context/RuntimeContext";
import {
  getTenantStaticCopy,
  type AppLanguage,
  type TenantStaticCopy,
} from "./translations";

const LANGUAGE_STORAGE_KEY = "remedygcc-language";

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
  copy: getTenantStaticCopy("en"),
});

function isSupportedLanguage(value: string | null): value is AppLanguage {
  return value === "en" || value === "ar";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { config } = useContext(RuntimeContext);
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
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const direction = language === "ar" ? "rtl" : "ltr";

    return {
      language,
      setLanguage,
      isRtl: direction === "rtl",
      direction,
      copy: getTenantStaticCopy(language),
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
