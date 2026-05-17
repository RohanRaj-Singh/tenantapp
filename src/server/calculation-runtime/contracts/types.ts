/**
 * Calculation Runtime - Type Contracts
 *
 * Orchestration layer for connecting runtime submissions to calculation engine.
 * This module belongs to tenantapp runtime - NOT super admin.
 *
 * Key Concept: Calculation happens AT SUBMISSION TIME
 */

// Formula type for scoring - derived from existing runtime patterns
export type FormulaType = "health" | "risk";

// Domain identifier
export type DomainId = string;

/**
 * Runtime submission response from tenant app
 */
export interface RuntimeSubmission {
  id: string;
  tenantId: string;
  scannerId: string;
  scannerVersion: string;
  runtimeConfigId: string;
  submittedAt: string;
  responses: RuntimeAnswer[];
  respondentAttributes?: RespondentAttributes;
}

/**
 * Single answer from runtime
 */
export interface RuntimeAnswer {
  questionId: string;
  answerValue: number;
  answeredAt?: string;
}

/**
 * Respondent attributes from submission
 */
export interface RespondentAttributes {
  stream?: string;
  location?: string;
  functionField?: string;
  department?: string;
  seniority?: string;
  [key: string]: string | undefined;
}

/**
 * Scanner metadata from runtime
 */
export interface RuntimeScanner {
  id: string;
  version: string;
  questions: RuntimeQuestion[];
  domains: RuntimeDomain[];
  categories: RuntimeCategory[];
}

/**
 * Runtime question definition
 */
export interface RuntimeQuestion {
  id: string;
  categoryId: string;
  weight: number;
  domainId: string;
  text?: string;
}

/**
 * Runtime domain definition
 */
export interface RuntimeDomain {
  id: DomainId;
  formulaType: FormulaType;
  name: string;
}

/**
 * Runtime category definition
 */
export interface RuntimeCategory {
  id: string;
  name: string;
}

/**
 * Input for the orchestration layer
 */
export interface OrchestrationInput {
  submission: RuntimeSubmission;
  scanner: RuntimeScanner;
}

/**
 * Pre-calculation validation result
 */
export interface CalculationValidationResult {
  valid: boolean;
  errors: CalculationError[];
}

export interface CalculationError {
  code: 'MISSING_SUBMISSION' | 'MISSING_SCANNER' | 'INVALID_ANSWER' | 'MISSING_QUESTION' | 'INVALID_DOMAIN' | 'INVALID_WEIGHT' | 'MISSING_RESPONSES';
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Orchestration result after successful processing
 */
export interface OrchestrationResult {
  success: boolean;
  snapshot?: SubmissionCalculationSnapshot;
  error?: CalculationError;
}

/**
 * Canonical calculation snapshot - the persisted result
 */
export interface SubmissionCalculationSnapshot {
  snapshotId: string;
  submissionId: string;
  tenantId: string;
  scannerId: string;
  scannerVersion: string;
  runtimeConfigId: string;
  calculatedAt: string;
  calculationVersion: string;
  domainSnapshots: DomainSnapshot[];
  totalWeightedScore: number;
  totalMaximumPossibleScore: number;
  overallScore: number;
  questionCount: number;
  answeredQuestionCount: number;
  attributes: SnapshotAttributes;
  traceability: CalculationTraceability;
}

/**
 * Individual domain snapshot
 */
export interface DomainSnapshot {
  domainId: string;
  domainName: string;
  formulaType: FormulaType;
  weightedScore: number;
  maximumPossibleScore: number;
  normalizedScore: number;
  questionCount: number;
  answeredCount: number;
  aggregationWeight: number;
}

/**
 * Snapshot attributes for aggregation
 */
export interface SnapshotAttributes {
  stream?: string;
  location?: string;
  functionField?: string;
  department?: string;
  seniority?: string;
}

/**
 * Traceability data
 */
export interface CalculationTraceability {
  questionResults: QuestionTraceResult[];
  domainResults: DomainTraceResult[];
  mpsByDomain: Record<DomainId, number>;
  formulaTypes: Record<DomainId, FormulaType>;
  scannerId: string;
  scannerVersion: string;
  runtimeConfigId: string;
}

export interface QuestionTraceResult {
  questionId: string;
  domainId: DomainId;
  categoryId: string;
  rawAnswer: number;
  weight: number;
  weightedScore: number;
}

export interface DomainTraceResult {
  domainId: DomainId;
  sumWeightedScores: number;
  maximumPossibleScore: number;
  normalizedScore: number;
  formulaType: FormulaType;
}

/**
 * Dashboard score for quick reads
 */
export interface DashboardScore {
  submissionId: string;
  overallScore: number;
  domainScores: Record<DomainId, number>;
  submittedAt: string;
  attributes: SnapshotAttributes;
}