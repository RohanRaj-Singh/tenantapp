"use client";

import { useContext, useMemo } from "react";
import { RuntimeContext } from "../context/RuntimeContext";
import { useLanguage } from "../language/LanguageContext";
import { getResolvedThemeForLanguage } from "./themeUtils";

export function useTheme() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const { language } = useLanguage();

  return useMemo(() => getResolvedThemeForLanguage(config, language), [config, language]);
}
