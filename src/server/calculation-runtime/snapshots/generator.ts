/**
 * Calculation Runtime - Snapshot Generator
 *
 * Creates immutable calculation snapshots.
 * Embeds pure calculation formulas (same as admin app engine).
 * Snapshots become the source of truth for future analytics.
 */

import type {
  RuntimeSubmission,
  RuntimeScanner,
  SubmissionCalculationSnapshot,
  DomainSnapshot,
  SnapshotAttributes,
  CalculationTraceability,
  QuestionTraceResult,
  DomainTraceResult,
} from "../contracts/types";
import { roundScore, mapAttributesToSnapshot } from "../mappers";

/**
 * Generate unique snapshot ID
 */
function generateSnapshotId(submissionId: string): string {
  return `snapshot-${submissionId}-${Date.now()}`;
}

/**
 * PURE CALCULATION FORMULAS (mirrored from admin app calculation engine)
 */

// Calculate Weighted Raw Score: WRS = RawScore × QuestionWeight
function calculateWeightedScore(answer: number, weight: number): number {
  return answer * weight;
}

// Calculate Maximum Possible Score: MPS = Σ(weights) × 4
function calculateMPS(weights: number[]): number {
  return weights.reduce((sum, w) => sum + w, 0) * 4;
}

// Normalize health score: (ΣWRS / MPS) × 100
function normalizeHealthScore(sumWeightedScores: number, mps: number): number {
  if (mps === 0 || !Number.isFinite(mps)) return 0;
  const ratio = sumWeightedScores / mps;
  return Math.max(0, Math.min(1, ratio)) * 100;
}

// Normalize risk score: (1 - ΣWRS / MPS) × 100
function normalizeRiskScore(sumWeightedScores: number, mps: number): number {
  if (mps === 0 || !Number.isFinite(mps)) return 0;
  const ratio = 1 - (sumWeightedScores / mps);
  return Math.max(0, Math.min(1, ratio)) * 100;
}

/**
 * Calculate weighted score for a single response
 */
function calculateSingleWeightedScore(
  answerValue: number,
  weight: number
): { rawScore: number; weightedScore: number } {
  const clampedAnswer = Math.max(1, Math.min(4, Math.round(answerValue))) as 1 | 2 | 3 | 4;
  return {
    rawScore: clampedAnswer,
    weightedScore: calculateWeightedScore(clampedAnswer, weight),
  };
}

/**
 * Calculate domain score
 */
function calculateDomainScore(
  domainId: string,
  domainName: string,
  formulaType: "health" | "risk",
  responses: { questionId: string; answerValue: number; weight: number }[]
): {
  domainId: string;
  domainName: string;
  formulaType: "health" | "risk";
  sumWeightedScores: number;
  maximumPossibleScore: number;
  normalizedScore: number;
  questionCount: number;
  weightedScores: { questionId: string; rawScore: number; weight: number; weightedScore: number }[];
} {
  const weights = responses.map((r) => r.weight);
  const mps = calculateMPS(weights);

  let sumWeightedScores = 0;
  const weightedScores: { questionId: string; rawScore: number; weight: number; weightedScore: number }[] = [];

  responses.forEach((r) => {
    const { rawScore, weightedScore } = calculateSingleWeightedScore(r.answerValue, r.weight);
    sumWeightedScores += weightedScore;
    weightedScores.push({ questionId: r.questionId, rawScore, weight: r.weight, weightedScore });
  });

  const normalizedScore = formulaType === "health"
    ? normalizeHealthScore(sumWeightedScores, mps)
    : normalizeRiskScore(sumWeightedScores, mps);

  return {
    domainId,
    domainName,
    formulaType,
    sumWeightedScores: roundScore(sumWeightedScores),
    maximumPossibleScore: roundScore(mps),
    normalizedScore: roundScore(normalizedScore),
    questionCount: responses.length,
    weightedScores,
  };
}

/**
 * Extract traceability from calculation
 */
function extractTraceability(
  domainResults: ReturnType<typeof calculateDomainScore>[],
  scanner: RuntimeScanner,
  runtimeConfigId: string
): CalculationTraceability {
  // Map question results
  const questionResults: QuestionTraceResult[] = [];
  const domainResultsList: DomainTraceResult[] = [];
  const mpsByDomain: Record<string, number> = {};
  const formulaTypes: Record<string, "health" | "risk"> = {};

  domainResults.forEach((dr) => {
    formulaTypes[dr.domainId] = dr.formulaType;
    mpsByDomain[dr.domainId] = dr.maximumPossibleScore;

    dr.weightedScores.forEach((ws) => {
      const question = scanner.questions.find((q) => q.id === ws.questionId);
      questionResults.push({
        questionId: ws.questionId,
        domainId: dr.domainId,
        categoryId: question?.categoryId || "",
        rawAnswer: ws.rawScore,
        weight: ws.weight,
        weightedScore: ws.weightedScore,
      });
    });

    domainResultsList.push({
      domainId: dr.domainId,
      sumWeightedScores: dr.sumWeightedScores,
      maximumPossibleScore: dr.maximumPossibleScore,
      normalizedScore: dr.normalizedScore,
      formulaType: dr.formulaType,
    });
  });

  return {
    questionResults,
    domainResults: domainResultsList,
    mpsByDomain,
    formulaTypes,
    scannerId: scanner.id,
    scannerVersion: scanner.version,
    runtimeConfigId,
  };
}

/**
 * Generate calculation snapshot from submission
 * This is the CORE snapshot generation - immutable historical record
 */
export function generateCalculationSnapshot(
  submission: RuntimeSubmission,
  scanner: RuntimeScanner
): SubmissionCalculationSnapshot {
  // Group responses by domain
  const domainResponses = new Map<string, { questionId: string; answerValue: number; weight: number }[]>();

  submission.responses.forEach((response) => {
    const question = scanner.questions.find((q) => q.id === response.questionId);
    if (!question) return;

    const domainId = question.domainId;
    if (!domainResponses.has(domainId)) {
      domainResponses.set(domainId, []);
    }
    domainResponses.get(domainId)!.push({
      questionId: response.questionId,
      answerValue: response.answerValue,
      weight: question.weight,
    });
  });

  // Calculate score for each domain
  const domainSnapshots: DomainSnapshot[] = [];
  let totalWeightedScore = 0;
  let totalMPS = 0;
  let totalQuestions = 0;

  scanner.domains.forEach((domain) => {
    const responses = domainResponses.get(domain.id) || [];
    const domainResult = calculateDomainScore(domain.id, domain.name, domain.formulaType, responses);

    totalWeightedScore += domainResult.sumWeightedScores;
    totalMPS += domainResult.maximumPossibleScore;
    totalQuestions += domainResult.questionCount;

    domainSnapshots.push({
      domainId: domain.id,
      domainName: domain.name,
      formulaType: domain.formulaType,
      weightedScore: domainResult.sumWeightedScores,
      maximumPossibleScore: domainResult.maximumPossibleScore,
      normalizedScore: domainResult.normalizedScore,
      questionCount: domainResult.questionCount,
      answeredCount: responses.length,
      aggregationWeight: totalQuestions > 0 ? domainResult.questionCount / totalQuestions : 0,
    });
  });

  // Calculate overall score (weighted average by question count)
  const overallScore = totalQuestions > 0
    ? domainSnapshots.reduce((sum, ds) => sum + ds.normalizedScore * (ds.questionCount / totalQuestions), 0)
    : 0;

  // Extract attributes
  const attributes: SnapshotAttributes = {
    stream: submission.respondentAttributes?.stream,
    location: submission.respondentAttributes?.location,
    functionField: submission.respondentAttributes?.function,
    department: submission.respondentAttributes?.department,
    seniority: submission.respondentAttributes?.seniority,
  };

  // Extract traceability
  const traceability = extractTraceability(
    scanner.domains.map((d) => {
      const responses = domainResponses.get(d.id) || [];
      return calculateDomainScore(d.id, d.name, d.formulaType, responses);
    }),
    scanner,
    submission.runtimeConfigId
  );

  return {
    snapshotId: generateSnapshotId(submission.id),
    submissionId: submission.id,
    tenantId: submission.tenantId,
    scannerId: submission.scannerId,
    scannerVersion: submission.scannerVersion,
    runtimeConfigId: submission.runtimeConfigId,
    calculatedAt: new Date().toISOString(),
    calculationVersion: "1.0.0",
    domainSnapshots,
    totalWeightedScore: roundScore(totalWeightedScore),
    totalMaximumPossibleScore: roundScore(totalMPS),
    overallScore: roundScore(overallScore),
    questionCount: totalQuestions,
    answeredQuestionCount: submission.responses.length,
    attributes,
    traceability,
  };
}

/**
 * Verify snapshot integrity
 */
export function verifySnapshotIntegrity(snapshot: SubmissionCalculationSnapshot): boolean {
  if (!snapshot.snapshotId || !snapshot.submissionId || !snapshot.tenantId) {
    return false;
  }

  for (const domain of snapshot.domainSnapshots) {
    if (domain.normalizedScore < 0 || domain.normalizedScore > 100) {
      return false;
    }
  }

  if (snapshot.overallScore < 0 || snapshot.overallScore > 100) {
    return false;
  }

  return true;
}

/**
 * Calculate aggregation weight for a snapshot
 */
export function calculateAggregationWeight(snapshot: SubmissionCalculationSnapshot): number {
  if (snapshot.questionCount === 0) return 0;
  return snapshot.answeredQuestionCount / snapshot.questionCount;
}