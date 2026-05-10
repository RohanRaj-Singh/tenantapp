"use client";

import { useState, useMemo, useContext } from "react";
import { EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS } from "@/runtime/attributes/attributeTemplateUtils";
import { readRuntimeSurveySession } from "@/runtime/attributes/surveySession";
import { RuntimeContext } from "../../runtime/context/RuntimeContext";
import { QuestionRenderer } from "./QuestionRenderer";
import { useTheme } from "@/runtime/theme/useTheme";
import { submitSurvey } from "@/runtime/providers/surveyService";
import {
  auditScannerVersion,
  buildSurveyQuestionSequence,
  type ScannerResponseMap,
  toSurveySubmissionResponses,
} from "@/runtime/scanner/scannerUtils";

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <p className="text-lg">Loading survey...</p>
    </div>
  );
}

function ThankYouState() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Thank You!</h1>
      <p className="text-gray-600">Your survey has been submitted successfully.</p>
    </div>
  );
}

export function SurveyContainer() {
  const { config, loading } = useContext(RuntimeContext);
  const theme = useTheme();
  const [responses, setResponses] = useState<ScannerResponseMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

    try {
      const surveySession = readRuntimeSurveySession(config.tenant.id, config.tenant.slug, config.scannerVersion.id);
      const submissionResponses = toSurveySubmissionResponses(visibleQuestions, responses);

      await submitSurvey({
        tenantId: config.tenant.id,
        scannerVersionId: config.scannerVersion.id,
        attributes: surveySession?.attributes ?? EMPTY_RUNTIME_ATTRIBUTE_SELECTIONS,
        responses: submissionResponses,
        completionState: {
          status: "completed",
          completedAt: new Date().toISOString(),
          totalQuestions: visibleQuestions.length,
          answeredQuestions: submissionResponses.length,
        },
        metadata: {
          userAgent: navigator.userAgent,
          ipAddress: "client-ip",
          sessionId: crypto.randomUUID(),
        },
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(responses).length;
  const totalCount = visibleQuestions.length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex justify-between gap-3">
        <h1 className="text-2xl font-bold">{theme.tenantName} Survey</h1>
        <span className="text-sm text-gray-500">
          {answeredCount} / {totalCount} answered
        </span>
      </div>

      {scannerAudit.configurationIssues.length > 0 ? (
        <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Scanner configuration issues were filtered safely.</p>
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
            <span>{item.question.kind === "follow-up" ? "Follow-up" : "Primary"}</span>
          </div>

          <QuestionRenderer
            question={item.question}
            selectedAnswerId={responses[item.question.id]?.answerId ?? null}
            onSelect={(answerId, answerScore) => handleAnswer(item.question.id, answerId, answerScore)}
          />
        </div>
      ))}

      <button
        onClick={() => void handleSubmit()}
        disabled={isSubmitting || totalCount === 0 || answeredCount < totalCount}
        className="btn-primary mt-6"
      >
        {isSubmitting ? "Submitting..." : "Submit Survey"}
      </button>
    </div>
  );
}
