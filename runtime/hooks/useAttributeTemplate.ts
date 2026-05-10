"use client";

import { useContext, useMemo } from "react";
import { resolveRuntimeAttributeTemplate } from "../attributes/attributeTemplateUtils";
import { RuntimeContext } from "../context/RuntimeContext";

export function useAttributeTemplate() {
  const { config } = useContext(RuntimeContext);
  if (!config) {
    throw new Error("Runtime config not loaded");
  }

  return useMemo(
    () => resolveRuntimeAttributeTemplate(config.attributeTemplate),
    [config.attributeTemplate],
  );
}
