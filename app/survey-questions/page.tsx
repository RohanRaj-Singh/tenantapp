"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { clearRuntimeSurveySession, readRuntimeSurveySession } from "@/runtime/attributes/surveySession";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import type { SurveySubmission } from "@/runtime/contracts/surveySubmission";
import { submitSurvey } from "@/runtime/providers/surveyService";
import {
  auditScannerVersion,
  buildSurveyQuestionSequence,
  type ScannerResponseMap,
  toSurveySubmissionResponses,
} from "@/runtime/scanner/scannerUtils";
import { useTheme } from "@/runtime/theme/useTheme";
import { generateUUID } from "@/lib/utils";

export default function SurveyQuestionsPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const theme = useTheme();
  const [responses, setResponses] = useState<ScannerResponseMap>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [surveySession, setSurveySession] = useState<ReturnType<typeof readRuntimeSurveySession>>(null);

  useEffect(() => {
    if (!config) {
      return;
    }

    setSurveySession(readRuntimeSurveySession(config.tenant.id, config.tenant.slug, config.scannerVersion.id));
    setHasLoadedSession(true);
    setResponses({});
    setCurrentQuestionIndex(0);
    setSubmissionError(null);
    setSubmitted(false);
  }, [config]);

  const scannerAudit = useMemo(() => {
    if (!config) {
      return null;
    }

    return auditScannerVersion(config.scannerVersion);
  }, [config]);

  const surveyQuestions = useMemo(() => {
    if (!scannerAudit) {
      return [];
    }

    return buildSurveyQuestionSequence(scannerAudit, responses);
  }, [scannerAudit, responses]);

  useEffect(() => {
    if (!surveyQuestions.length) {
      setCurrentQuestionIndex(0);
      return;
    }

    setCurrentQuestionIndex((previousIndex) => Math.min(previousIndex, surveyQuestions.length - 1));
  }, [surveyQuestions.length]);

  const currentQuestion = surveyQuestions[currentQuestionIndex] ?? null;
  const isLastQuestion = currentQuestionIndex === surveyQuestions.length - 1;
  const currentResponse = currentQuestion ? responses[currentQuestion.question.id] : undefined;

  const handleAnswer = (questionId: string, answerId: string, answerScore: number) => {
    setResponses((previousResponses) => ({
      ...previousResponses,
      [questionId]: {
        answerId,
        answerScore,
        answeredAt: new Date().toISOString(),
      },
    }));
  };

  const handleSubmit = async () => {
    if (!config || !surveySession || !scannerAudit) {
      return;
    }

    const submissionResponses = toSurveySubmissionResponses(surveyQuestions, responses);

    if (submissionResponses.length !== surveyQuestions.length) {
      setSubmissionError("Every visible question must be answered before the survey can be submitted.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const answeredAt = new Date().toISOString();
      const submission: SurveySubmission = {
        runtimeConfigId: surveySession.runtimeConfigId,
        tenantId: config.tenant.id,
        tenantSlug: config.tenant.slug,
        scannerVersionId: config.scannerVersion.id,
        attributeTemplateVersionId: surveySession.attributeTemplateVersionId,
        attributes: surveySession.attributes,
        responses: submissionResponses.map((response) => ({
          ...response,
          answeredAt: response.answeredAt || answeredAt,
        })),
        completionState: {
          status: "completed",
          startedAt: surveySession.savedAt,
          completedAt: answeredAt,
          totalQuestions: surveyQuestions.length,
          answeredQuestions: submissionResponses.length,
        },
        metadata: {
          userAgent: navigator.userAgent,
          ipAddress: "client-ip",
          sessionId: generateUUID(),
        },
      };

      await submitSurvey(submission);
      clearRuntimeSurveySession();
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to submit your survey right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!currentResponse) {
      return;
    }

    if (!isLastQuestion) {
      setCurrentQuestionIndex((previousIndex) => previousIndex + 1);
      return;
    }

    await handleSubmit();
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((previousIndex) => previousIndex - 1);
    }
  };

  const isFirstQuestion = currentQuestionIndex === 0;

  if (!config || !hasLoadedSession) {
    return (
      <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-20">
        <div
          className="rounded-[28px] border bg-white px-8 py-10 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <p className="text-sm font-medium text-slate-500">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!surveySession) {
    return (
      <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-20">
        <div
          className="w-full max-w-lg rounded-[28px] border bg-white px-8 py-10 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <h1 className="text-xl font-semibold text-slate-900">Survey setup is incomplete</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your tenant attributes are missing, outdated, or tied to a different scanner version. Start again so the
            runtime app can rebuild a safe submission payload.
          </p>
          <Link
            href="/survey"
            className="tenant-button mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Return to survey setup
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-20">
        <div
          className="w-full max-w-xl rounded-[32px] border bg-white p-8 text-center shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:p-12"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.softAccent, color: theme.linkColor }}
          >
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Thank you</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Your wellbeing survey has been submitted successfully. We appreciate your time and honest feedback.
          </p>
        </div>
      </div>
    );
  }

  if (!scannerAudit || !surveyQuestions.length || !currentQuestion) {
    return (
      <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-20">
        <div
          className="w-full max-w-lg rounded-[28px] border bg-white px-8 py-10 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <h1 className="text-xl font-semibold text-slate-900">No survey questions available</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The scanner configuration does not contain any valid runtime questions right now. Please check back after
            the tenant setup is updated.
          </p>
          {scannerAudit?.configurationIssues.length ? (
            <p className="mt-4 text-sm text-amber-700">{scannerAudit.configurationIssues[0]}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-page-shell min-h-screen px-4 pb-28 pt-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col">
        <main className="flex-1 py-6 sm:py-10">
          <section
            className="rounded-[32px] border bg-white/95 px-6 py-8 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10"
            style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
          >
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2rem]">
              {currentQuestion.question.questionText}
            </h1>

            <div className="mt-8 space-y-3">
              {currentQuestion.question.answers.map((answer) => {
                const isSelected = currentResponse?.answerId === answer.id;

                return (
                  <button
                    key={answer.id}
                    type="button"
                    onClick={() => handleAnswer(currentQuestion.question.id, answer.id, answer.score)}
                    className="w-full rounded-[22px] border px-5 py-4 text-left text-base font-medium text-slate-900 transition-colors sm:px-6"
                    style={
                      isSelected
                        ? {
                            borderColor: theme.primaryColor,
                            backgroundColor: theme.softAccent,
                          }
                        : {
                            borderColor: theme.borderAccent,
                            backgroundColor: "#ffffff",
                          }
                    }
                  >
                    {answer.label}
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        <div className="sticky bottom-4 mt-4">
          <div
            className="rounded-[24px] border bg-white/95 px-4 py-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:px-5"
            style={{ borderColor: theme.borderAccent }}
          >
            {submissionError ? (
              <p className="mb-3 text-sm text-red-600">{submissionError}</p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstQuestion || isSubmitting}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: theme.borderAccent, backgroundColor: "#ffffff" }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={!currentResponse || isSubmitting}
                className="tenant-button inline-flex min-h-12 flex-1 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : isLastQuestion ? "Submit" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
