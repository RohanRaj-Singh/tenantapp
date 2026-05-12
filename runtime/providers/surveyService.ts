import type { SurveySubmission } from "../contracts/surveySubmission";

interface SurveySubmissionResult {
  submissionId: string;
  status: "accepted";
  submittedAt: string;
  versionRefs: {
    runtimeConfigId: string;
    scannerVersionId: string;
    attributeTemplateVersionId: string;
    calculationVersionId: string;
  };
  aggregation: {
    queued: boolean;
    snapshotId?: string;
  };
}

export async function submitSurvey(
  submission: SurveySubmission,
): Promise<SurveySubmissionResult> {
  const response = await fetch("/api/survey/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(errorBody?.error?.message ?? "Failed to submit survey.");
  }

  return response.json();
}
