/**
 * Calculation Runtime Module
 *
 * Orchestration layer for submission calculations.
 * This belongs to tenantapp runtime - NOT super admin.
 *
 * Key Concepts:
 * - Calculation happens AT SUBMISSION TIME
 * - Snapshots persist for future dashboard reads
 * - Engine formulas embedded for runtime independence
 *
 * Usage:
 * ```ts
 * import { processSubmissionCalculation } from "@/server/calculation-runtime";
 *
 * const result = processSubmissionCalculation(submission, scannerVersion);
 * if (result.success) {
 *   // Persist result.snapshot
 * }
 * ```
 */

// Orchestrator exports
export {
  processSubmissionCalculation,
  getDashboardScore,
  getDomainScore,
  calculateAggregateScore,
  filterSnapshotsByAttributes,
  calculateAttributeBreakdown,
} from "./orchestrator";

// Snapshot exports
export {
  generateCalculationSnapshot,
  verifySnapshotIntegrity,
  calculateAggregationWeight,
} from "./snapshots/generator";

// Mapper exports
export {
  mapScannerVersionToCalculationScanner,
  mapSubmissionToCalculationFormat,
  validateCalculationInput,
  mapAttributesToSnapshot,
  snapshotToDashboardScore,
  roundScore,
} from "./mappers";

// Type exports
export type {
  RuntimeSubmission,
  RuntimeAnswer,
  RespondentAttributes,
  RuntimeScanner,
  RuntimeQuestion,
  RuntimeDomain,
  RuntimeCategory,
  OrchestrationInput,
  CalculationValidationResult,
  CalculationError,
  OrchestrationResult,
  SubmissionCalculationSnapshot,
  DomainSnapshot,
  SnapshotAttributes,
  CalculationTraceability,
  QuestionTraceResult,
  DomainTraceResult,
  DashboardScore,
  FormulaType,
  DomainId,
} from "./contracts/types";