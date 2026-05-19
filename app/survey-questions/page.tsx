"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import RuntimeUnavailableState from "@/components/runtime/RuntimeUnavailableState";
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
  const loading = context?.loading ?? true;
  const runtimeError = context?.error ?? null;
  const tenantSlug = context?.tenantSlug ?? null;
  const tenantSource = context?.tenantSource ?? null;
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
  const questionNumber = currentQuestionIndex + 1;
  const progressPercent = surveyQuestions.length
    ? Math.max((questionNumber / surveyQuestions.length) * 100, 4)
    : 0;

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

  if (loading) {
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

  if (!config) {
    return <RuntimeUnavailableState error={runtimeError} tenantSlug={tenantSlug} tenantSource={tenantSource} />;
  }

  if (!hasLoadedSession) {
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
    <div className="tenant-page-shell min-h-screen px-4 pb-32 pt-4 sm:px-6 sm:pb-36 sm:pt-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-4xl flex-col sm:min-h-[calc(100dvh-3rem)]">
        <main className="flex flex-1 items-start py-2 sm:items-center sm:py-4">
          <section
            className="flex min-h-[calc(100dvh-10.5rem)] w-full flex-col overflow-hidden rounded-[28px] border bg-white/95 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:min-h-[calc(100dvh-13rem)] sm:rounded-[32px]"
            style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
          >
            <div className="border-b px-5 py-5 sm:px-8 sm:py-6" style={{ borderColor: theme.borderAccent }}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] sm:text-[0.7rem]"
                      style={{
                        borderColor: theme.primaryColor,
                        backgroundColor: theme.softAccent,
                        color: theme.linkColor,
                      }}
                    >
                      Domain: {currentQuestion.category.label}
                    </span>
                    <span
                      className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] sm:text-[0.7rem]"
                      style={{
                        borderColor: theme.borderAccent,
                        backgroundColor: "#ffffff",
                        color: theme.linkColor,
                      }}
                    >
                      Subdomain: {currentQuestion.subdomain.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Question {questionNumber}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {questionNumber} / {surveyQuestions.length}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${progressPercent}%`,
                          background: theme.brandGradient,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.1rem]">
                  {currentQuestion.question.questionText}
                </h1>
              </div>

              <div className="mt-6 flex-1 overflow-y-auto pr-1 sm:mt-8">
                <div className="space-y-3 pb-2">
                  {currentQuestion.question.answers.map((answer) => {
                    const isSelected = currentResponse?.answerId === answer.id;

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() => handleAnswer(currentQuestion.question.id, answer.id, answer.score)}
                        className="w-full rounded-[20px] border px-4 py-4 text-left text-base font-medium text-slate-900 transition-colors sm:rounded-[22px] sm:px-6 sm:py-5"
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
              </div>
            </div>
          </section>
        </main>

        <div className="sticky bottom-3 mt-4 pb-[max(env(safe-area-inset-bottom),0px)] sm:bottom-4">
          <div
            className="rounded-[22px] border bg-white/95 px-4 py-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:rounded-[24px] sm:px-5"
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
