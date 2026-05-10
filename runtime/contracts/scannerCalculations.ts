import type { RuntimeScannerVersion } from "./scannerVersion";
import type { SurveySubmissionAttributes, SurveySubmissionResponse } from "./surveySubmission";

export interface ScannerCalculationRequest {
  tenantId: string;
  scannerVersionId: string;
  scannerVersion: RuntimeScannerVersion;
  attributes: SurveySubmissionAttributes;
  responses: SurveySubmissionResponse[];
}

export interface CategoryMetricSnapshot {
  categoryId: string;
  categoryLabel: string;
  participantCount: number;
}

export interface SubdomainMetricSnapshot {
  subdomainId: string;
  subdomainLabel: string;
  categoryId: string;
  participantCount: number;
}

export interface OverallMetricSnapshot {
  scannerVersionId: string;
  participantCount: number;
  completedResponseCount: number;
}

export type CalculateCategoryMetrics = (
  input: ScannerCalculationRequest,
) => CategoryMetricSnapshot[];

export type CalculateSubdomainMetrics = (
  input: ScannerCalculationRequest,
) => SubdomainMetricSnapshot[];

export type CalculateOverallMetrics = (
  input: ScannerCalculationRequest,
) => OverallMetricSnapshot;
