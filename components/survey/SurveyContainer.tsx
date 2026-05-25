"use client";

import { useState, useMemo, useContext } from "react";
import { EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS } from "@/runtime/attributes/attributeTemplateUtils";
import { readRuntimeSurveySession } from "@/runtime/attributes/surveySession";
import { RuntimeContext } from "../../runtime/context/RuntimeContext";
import { QuestionRenderer } from "./QuestionRenderer";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";
import { submitSurvey } from "@/runtime/providers/surveyService";
import {
  auditScannerVersion,
  buildSurveyQuestionSequence,
  type ScannerResponseMap,
  toSurveySubmissionResponses,
} from "@/runtime/scanner/scannerUtils";
import { generateUUID } from "@/lib/utils";

function LoadingState() {
  const { copy } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <p className="text-lg">{copy.legacySurvey.loading}</p>
    </div>
  );
}

function ThankYouState() {
  const { copy } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">{copy.legacySurvey.thankYouTitle}</h1>
      <p className="text-gray-600">{copy.legacySurvey.thankYouBody}</p>
    </div>
  );
}

export function SurveyContainer() {
  const { config, loading } = useContext(RuntimeContext);
  const theme = useTheme();
  const { copy } = useLanguage();
  const [responses, setResponses] = useState<ScannerResponseMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const scannerAudit = useMemo(
    () => (config ? auditScannerVersion(config.scannerVersion) : null),
    [config],
  );
  const visibleQuestions = useMemo(
    () => (scannerAudit ? buildSurveyQuestionSequence(scannerAudit, responses) : []),
    [scannerAudit, responses],
  );

  if (loading || !config || !scannerAudit) {
    return <LoadingState />;
  }

  if (submitted) {
    return <ThankYouState />;
  }

  const handleAnswer = (questionId: string, answerId: string, answerScore: number) => {
    setResponses((previous) => ({
      ...previous,
      [questionId]: {
        answerId,
        answerScore,
        answeredAt: new Date().toISOString(),
      },
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const surveySession = readRuntimeSurveySession(config.tenant.id, config.tenant.slug, config.scannerVersion.id);
      const submissionResponses = toSurveySubmissionResponses(visibleQuestions, responses);

      await submitSurvey({
        runtimeConfigId: surveySession?.runtimeConfigId ?? config.runtimeConfigId,
        tenantId: config.tenant.id,
        tenantSlug: config.tenant.slug,
        scannerVersionId: config.scannerVersion.id,
        attributeTemplateVersionId:
          surveySession?.attributeTemplateVersionId ??
          config.versionRefs.attributeTemplateVersionId,
        attributes: surveySession?.attributes ?? EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS,
        responses: submissionResponses,
        completionState: {
          status: "completed",
          startedAt: surveySession?.savedAt,
          completedAt: new Date().toISOString(),
          totalQuestions: visibleQuestions.length,
          answeredQuestions: submissionResponses.length,
        },
metadata: {
           userAgent: navigator.userAgent,
           ipAddress: "client-ip",
           sessionId: generateUUID(),
         },
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmissionError(
        error instanceof Error
          ? error.message
          : copy.legacySurvey.submitFailure,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(responses).length;
  const totalCount = visibleQuestions.length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex justify-between gap-3">
        <h1 className="text-2xl font-bold">{copy.legacySurvey.title(theme.tenantName)}</h1>
        <span className="text-sm text-gray-500">
          {copy.legacySurvey.answeredProgress(answeredCount, totalCount)}
        </span>
      </div>

      {scannerAudit.configurationIssues.length > 0 ? (
        <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">{copy.legacySurvey.filteredIssues}</p>
          <p className="mt-1">{scannerAudit.configurationIssues[0]}</p>
        </div>
      ) : null}

      {visibleQuestions.map((item) => (
        <div
          key={item.question.id}
          className="mb-4 rounded border bg-white p-4"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <span>{item.category.label}</span>
            <span>&middot;</span>
            <span>{item.subdomain.label}</span>
            <span>&middot;</span>
            <span>
              {item.question.kind === "follow-up"
                ? copy.legacySurvey.followUpQuestion
                : copy.legacySurvey.primaryQuestion}
            </span>
          </div>

          <QuestionRenderer
            question={item.question}
            selectedAnswerId={responses[item.question.id]?.answerId ?? null}
            onSelect={(answerId, answerScore) => handleAnswer(item.question.id, answerId, answerScore)}
          />
        </div>
      ))}

      {submissionError ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submissionError}
        </div>
      ) : null}

      <button
        onClick={() => void handleSubmit()}
        disabled={isSubmitting || totalCount === 0 || answeredCount < totalCount}
        className="btn-primary mt-6"
      >
        {isSubmitting ? copy.legacySurvey.submitting : copy.legacySurvey.submitSurvey}
      </button>
    </div>
  );
}
