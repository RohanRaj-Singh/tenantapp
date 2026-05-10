"use client";

import { useContext, useMemo } from "react";
import { RuntimeContext } from "../context/RuntimeContext";
import { getResolvedTheme } from "./themeUtils";

export function useTheme() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;

  return useMemo(() => getResolvedTheme(config), [config]);
}
