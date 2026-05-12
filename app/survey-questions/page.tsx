"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, MoveLeft } from "lucide-react";
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
  const progress = surveyQuestions.length > 0 ? ((currentQuestionIndex + 1) / surveyQuestions.length) * 100 : 0;
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
    <div className="tenant-page-shell min-h-screen px-4 pb-5 pt-24 sm:px-6">
      <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-6xl flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
          <Link
            href="/"
            className="tenant-brand-text inline-flex items-center justify-center gap-2 self-start rounded-full border bg-white px-4 py-3 text-sm font-medium shadow-sm transition-colors"
            style={{ borderColor: theme.borderAccent }}
          >
            <MoveLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div
            className="rounded-[28px] border bg-white/90 px-4 py-4 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.3)] backdrop-blur sm:px-6"
            style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {theme.tenantName}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    Question {currentQuestionIndex + 1} of {surveyQuestions.length}
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
                  <span>{Math.round(progress)}% completed</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {currentQuestion.question.answers.length} response options
                </div>
                <div
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: theme.softAccent, color: theme.linkColor }}
                >
                  {currentQuestion.question.kind === "follow-up" ? "Diagnostic follow-up" : "Primary question"}
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: theme.primaryColor }}
              />
            </div>

            {scannerAudit.configurationIssues.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">Scanner configuration issues were filtered safely.</p>
                <p className="mt-1">
                  {scannerAudit.configurationIssues[0]}
                  {scannerAudit.configurationIssues.length > 1
                    ? ` ${scannerAudit.configurationIssues.length - 1} more issue(s) were ignored at runtime.`
                    : ""}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <section
          className="min-h-0 flex-1 overflow-hidden rounded-[32px] border bg-white/95 p-4 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:p-6"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <div className="flex h-full min-h-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div
              className="shrink-0 rounded-[28px] p-5 sm:p-6 lg:flex lg:min-h-0 lg:flex-col"
              style={{ backgroundColor: theme.surfaceAccent }}
            >
              <div className="flex flex-wrap gap-2">
                <div
                  className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ backgroundColor: theme.softAccent, color: theme.linkColor }}
                >
                  {currentQuestion.category.label}
                </div>
                <div
                  className="rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                  style={{ borderColor: theme.borderAccent }}
                >
                  {currentQuestion.subdomain.label}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Current prompt</p>
                <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2rem]">
                  {currentQuestion.question.questionText}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  {currentQuestion.question.helpText ??
                    "Choose the response that best reflects your recent experience. Your selection will be added to the runtime submission payload exactly as configured."}
                </p>
              </div>

              <div className="mt-5 hidden gap-3 md:grid md:grid-cols-3 lg:mt-auto lg:pt-6">
                {[
                  { label: "Section", value: currentQuestion.category.label },
                  { label: "Response", value: "Single choice" },
                  {
                    label: "Status",
                    value: currentResponse ? "Ready to continue" : "Answer required",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border bg-white px-4 py-4 shadow-sm"
                    style={{ borderColor: theme.borderAccent }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col rounded-[28px] border p-3 sm:p-4"
              style={{ borderColor: theme.borderAccent, backgroundColor: theme.surfaceAccentStrong }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Select one option
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    The action button stays visible while options scroll here if needed.
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
                  Required
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-2">
                  {currentQuestion.question.answers.map((answer) => {
                    const isSelected = currentResponse?.answerId === answer.id;

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() => handleAnswer(currentQuestion.question.id, answer.id, answer.score)}
                        className="w-full rounded-[22px] border bg-white px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_45px_-35px_rgba(15,23,42,0.45)] sm:px-5 sm:py-3.5"
                        style={
                          isSelected
                            ? {
                                borderColor: theme.primaryColor,
                                backgroundColor: theme.softAccent,
                                boxShadow: `0 28px 50px -40px ${theme.strongAccent}`,
                              }
                            : { borderColor: theme.borderAccent }
                        }
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors"
                            style={
                              isSelected
                                ? {
                                    borderColor: theme.primaryColor,
                                    backgroundColor: theme.primaryColor,
                                    color: theme.onPrimaryColor,
                                  }
                                : { borderColor: "#e2e8f0", backgroundColor: "#ffffff", color: "#475569" }
                            }
                          >
                            {answer.order}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 sm:text-base">{answer.label}</p>
                            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                              {isSelected ? "Selected response." : "Tap to select this response."}
                            </p>
                          </div>

                          <div
                            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors"
                            style={
                              isSelected
                                ? {
                                    borderColor: theme.primaryColor,
                                    backgroundColor: theme.primaryColor,
                                    color: theme.onPrimaryColor,
                                  }
                                : {
                                    borderColor: theme.borderAccent,
                                    backgroundColor: "#ffffff",
                                    color: "transparent",
                                  }
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="mt-4 flex flex-col gap-3 rounded-[24px] border bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: theme.borderAccent }}
              >
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">
                    {currentResponse
                      ? "Answer selected. Continue when you are ready."
                      : "Choose one option to unlock the next step."}
                  </p>
                  {submissionError ? <p className="text-sm text-red-600">{submissionError}</p> : null}
                </div>

                <div className="flex gap-2">
                  {!isFirstQuestion ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ borderColor: theme.borderAccent }}
                    >
                      Back
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleNext()}
                    disabled={!currentResponse || isSubmitting}
                    className="tenant-button inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                    style={currentResponse ? { boxShadow: `0 24px 50px -32px ${theme.strongAccent}` } : undefined}
                  >
                    {isSubmitting ? "Submitting..." : isLastQuestion ? "Submit survey" : "Next question"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
