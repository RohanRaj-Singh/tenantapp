import type { SurveySubmissionAttributes } from "../contracts/surveySubmission";

export const RUNTIME_SURVEY_SESSION_STORAGE_KEY = "remedygcc-runtime-survey-session";

export interface RuntimeSurveySession {
  tenantId: string;
  tenantSlug: string;
  scannerVersionId: string;
  attributes: SurveySubmissionAttributes;
  savedAt: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAttributeRecord(value: unknown): value is SurveySubmissionAttributes {
  if (!value || typeof value !== "object") {
    return false;
  }

  const attributes = value as Record<keyof SurveySubmissionAttributes, unknown>;

  return (
    typeof attributes.stream === "string" &&
    typeof attributes.location === "string" &&
    typeof attributes.department === "string" &&
    typeof attributes.function === "string" &&
    typeof attributes.gender === "string" &&
    typeof attributes.age === "string" &&
    typeof attributes.seniority === "string"
  );
}

export function saveRuntimeSurveySession(session: RuntimeSurveySession) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(RUNTIME_SURVEY_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readRuntimeSurveySession(
  tenantId?: string | null,
  tenantSlug?: string | null,
  scannerVersionId?: string | null,
): RuntimeSurveySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(RUNTIME_SURVEY_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<RuntimeSurveySession>;
    const sessionIsValid =
      isNonEmptyString(parsedValue?.tenantId) &&
      isNonEmptyString(parsedValue?.tenantSlug) &&
      isNonEmptyString(parsedValue?.scannerVersionId) &&
      isNonEmptyString(parsedValue?.savedAt) &&
      isAttributeRecord(parsedValue?.attributes);

    if (!sessionIsValid) {
      clearRuntimeSurveySession();
      return null;
    }

    if (
      (tenantId && parsedValue.tenantId !== tenantId) ||
      (tenantSlug && parsedValue.tenantSlug !== tenantSlug) ||
      (scannerVersionId && parsedValue.scannerVersionId !== scannerVersionId)
    ) {
      return null;
    }

    const session = parsedValue as RuntimeSurveySession;

    return {
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
      scannerVersionId: session.scannerVersionId,
      attributes: session.attributes,
      savedAt: session.savedAt,
    };
  } catch {
    clearRuntimeSurveySession();
    return null;
  }
}

export function clearRuntimeSurveySession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(RUNTIME_SURVEY_SESSION_STORAGE_KEY);
}
