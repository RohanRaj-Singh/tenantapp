/**
 * Calculation Runtime - Runtime to Calculation Mappers
 *
 * Maps runtime submission shapes to calculation engine contracts.
 * This is the boundary isolation layer.
 */

import type {
  RuntimeSubmission,
  RuntimeScanner,
  RuntimeAnswer,
  OrchestrationInput,
  CalculationValidationResult,
  CalculationError,
  SubmissionCalculationSnapshot,
  DashboardScore,
  SnapshotAttributes,
} from "../contracts/types";
import type { RuntimeScannerVersion } from "@/runtime/contracts/scannerVersion";
import type { SurveySubmissionAttributes, SurveySubmissionResponse } from "@/runtime/contracts/surveySubmission";

/**
 * Runtime scanner version to calculation scanner format
 * Maps: Category -> Subdomain -> Question to Domain -> Question
 */
export function mapScannerVersionToCalculationScanner(
  scannerVersion: RuntimeScannerVersion
): RuntimeScanner {
  // Map categories to domains (treating subdomains as domains for calculation)
  const domains: RuntimeScanner["domains"] = [];
  const questions: RuntimeScanner["questions"] = [];
  const categories: RuntimeScanner["categories"] = [];

  scannerVersion.categories.forEach((category) => {
    // Add category
    categories.push({
      id: category.id,
      name: category.label,
    });

    // Each category has subdomains - treat each subdomain as a domain
    category.subdomains.forEach((subdomain) => {
      // Determine formula type based on subdomain naming convention
      // This could be made configurable in the scanner
      const formulaType = determineFormulaType(subdomain.label, subdomain.id);

      domains.push({
        id: subdomain.id,
        formulaType,
        name: subdomain.label,
      });

      // Add questions from this subdomain
      subdomain.questions.forEach((question) => {
        questions.push({
          id: question.id,
          categoryId: category.id,
          weight: question.weight,
          domainId: subdomain.id,
          text: question.questionText,
        });
      });
    });
  });

  return {
    id: scannerVersion.id,
    version: scannerVersion.version,
    questions,
    domains,
    categories,
  };
}

/**
 * Determine formula type from subdomain
 * Default: risk for backwards compatibility with existing data
 */
function determineFormulaType(label: string, id: string): "health" | "risk" {
  const labelLower = label.toLowerCase();

  // Check for health-related subdomains
  const healthKeywords = ["satisfaction", "wellness", "positive", "engagement", "happiness"];
  if (healthKeywords.some((k) => labelLower.includes(k))) {
    return "health";
  }

  // Check for explicit risk indicators
  const riskKeywords = ["risk", "safety", "concern", "issue", "problem", "complaint"];
  if (riskKeywords.some((k) => labelLower.includes(k))) {
    return "risk";
  }

  // Default to risk (legacy behavior)
  return "risk";
}

/**
 * Map runtime submission to calculation engine format
 */
export function mapSubmissionToCalculationFormat(
  submission: RuntimeSubmission
): {
  submissionId: string;
  tenantId: string;
  scannerId: string;
  scannerVersion: string;
  responses: { questionId: string; answer: 1 | 2 | 3 | 4 }[];
  submittedAt: string;
} {
  return {
    submissionId: submission.id,
    tenantId: submission.tenantId,
    scannerId: submission.scannerId,
    scannerVersion: submission.scannerVersion,
    responses: submission.responses.map((r) => ({
      questionId: r.questionId,
      answer: normalizeAnswerValue(r.answerValue),
    })),
    submittedAt: submission.submittedAt,
  };
}

/**
 * Normalize answer value to 1-4 scale
 */
function normalizeAnswerValue(value: number): 1 | 2 | 3 | 4 {
  // Clamp to valid range and round
  const clamped = Math.max(1, Math.min(4, Math.round(value)));
  return clamped as 1 | 2 | 3 | 4;
}

/**
 * Validate orchestration input before calculation
 */
export function validateCalculationInput(input: OrchestrationInput): CalculationValidationResult {
  const errors: CalculationError[] = [];

  // Validate submission
  if (!input.submission) {
    errors.push({
      code: "MISSING_SUBMISSION",
      message: "Submission is required",
    });
    return { valid: false, errors };
  }

  if (!input.submission.id) {
    errors.push({ code: "MISSING_SUBMISSION", message: "Submission ID is required" });
  }

  if (!input.submission.tenantId) {
    errors.push({ code: "MISSING_SUBMISSION", message: "Tenant ID is required" });
  }

  if (!input.submission.responses || input.submission.responses.length === 0) {
    errors.push({
      code: "MISSING_RESPONSES",
      message: "Submission must have at least one response",
    });
  }

  // Validate scanner
  if (!input.scanner) {
    errors.push({ code: "MISSING_SCANNER", message: "Scanner is required" });
    return { valid: false, errors };
  }

  if (!input.scanner.questions || input.scanner.questions.length === 0) {
    errors.push({ code: "MISSING_SCANNER", message: "Scanner must have at least one question" });
  }

  if (!input.scanner.domains || input.scanner.domains.length === 0) {
    errors.push({ code: "MISSING_SCANNER", message: "Scanner must have at least one domain" });
  }

  // Validate responses match questions
  if (input.submission.responses && input.scanner.questions) {
    const questionIds = new Set(input.scanner.questions.map((q) => q.id));
    input.submission.responses.forEach((response) => {
      if (!questionIds.has(response.questionId)) {
        errors.push({
          code: "MISSING_QUESTION",
          message: `Question ${response.questionId} not found in scanner`,
          context: { questionId: response.questionId },
        });
      }
    });
  }

  // Validate answers
  if (input.submission.responses) {
    input.submission.responses.forEach((response) => {
      if (response.answerValue < 1 || response.answerValue > 4) {
        errors.push({
          code: "INVALID_ANSWER",
          message: `Invalid answer value ${response.answerValue} for question ${response.questionId}`,
          context: { questionId: response.questionId, answerValue: response.answerValue },
        });
      }
    });
  }

  // Validate weights
  if (input.scanner.questions) {
    input.scanner.questions.forEach((question) => {
      if (question.weight < 0 || question.weight > 100) {
        errors.push({
          code: "INVALID_WEIGHT",
          message: `Invalid weight ${question.weight} for question ${question.id}`,
          context: { questionId: question.id, weight: question.weight },
        });
      }
    });
  }

  // Validate domain formula types
  if (input.scanner.domains) {
    const validFormulaTypes = ["health", "risk"];
    input.scanner.domains.forEach((domain) => {
      if (!validFormulaTypes.includes(domain.formulaType)) {
        errors.push({
          code: "INVALID_DOMAIN",
          message: `Invalid formula type ${domain.formulaType} for domain ${domain.id}`,
          context: { domainId: domain.id, formulaType: domain.formulaType },
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Map respondent attributes to snapshot attributes
 */
export function mapAttributesToSnapshot(
  attributes?: SurveySubmissionAttributes
): SnapshotAttributes {
  if (!attributes) {
    return {};
  }

  return {
    stream: attributes.stream,
    location: attributes.location,
    functionField: attributes.function,
    department: attributes.department,
    seniority: attributes.seniority,
  };
}

/**
 * Convert snapshot to dashboard score for quick reads
 */
export function snapshotToDashboardScore(snapshot: SubmissionCalculationSnapshot): DashboardScore {
  const domainScores: Record<string, number> = {};

  snapshot.domainSnapshots.forEach((ds) => {
    domainScores[ds.domainId] = ds.normalizedScore;
  });

  return {
    submissionId: snapshot.submissionId,
    overallScore: snapshot.overallScore,
    domainScores,
    submittedAt: snapshot.calculatedAt,
    attributes: snapshot.attributes,
  };
}

/**
 * Round score to 2 decimal places
 */
export function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}