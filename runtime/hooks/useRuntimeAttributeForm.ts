"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RuntimeAttributeTemplate } from "../contracts/runtime";
import {
  applyRuntimeAttributeSelection,
  buildRuntimeAttributeFormState,
  EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS,
  resolveRuntimeAttributeTemplate,
  sanitizeRuntimeAttributeSelections,
  type RuntimeAttributeSelections,
  type RuntimeSelectionField,
} from "../attributes/attributeTemplateUtils";
import type { AppLanguage } from "../language/translations";

export function useRuntimeAttributeForm(
  attributeTemplate: RuntimeAttributeTemplate,
  language: AppLanguage = "en",
) {
  const resolvedTemplate = useMemo(
    () => resolveRuntimeAttributeTemplate(attributeTemplate, language),
    [attributeTemplate, language],
  );
  const [selections, setSelections] = useState<RuntimeAttributeSelections>(
    EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS,
  );

  useEffect(() => {
    setSelections((currentSelections) =>
      sanitizeRuntimeAttributeSelections(currentSelections, resolvedTemplate),
    );
  }, [resolvedTemplate]);

  const formState = useMemo(
    () => buildRuntimeAttributeFormState(resolvedTemplate, selections, language),
    [resolvedTemplate, selections, language],
  );

  const updateSelection = useCallback((field: RuntimeSelectionField, value: string) => {
    setSelections((currentSelections) =>
      applyRuntimeAttributeSelection(currentSelections, field, value, resolvedTemplate),
    );
  }, [resolvedTemplate]);

  const resetSelections = useCallback(() => {
    setSelections(EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS);
  }, []);

  return {
    resolvedTemplate,
    selections,
    updateSelection,
    resetSelections,
    ...formState,
  };
}
