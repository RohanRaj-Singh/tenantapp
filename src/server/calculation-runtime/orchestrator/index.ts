/**
 * Calculation Runtime - Orchestrator
 *
 * Central orchestration layer for submission calculation.
 * This is the ONLY entry point for runtime calculations.
 */

import type {
  RuntimeSubmission,
  RuntimeScanner,
  OrchestrationResult,
  SubmissionCalculationSnapshot,
  DashboardScore,
} from "../contracts/types";
import type { RuntimeScannerVersion } from "@/runtime/contracts/scannerVersion";
import { mapScannerVersionToCalculationScanner, mapSubmissionToCalculationFormat, validateCalculationInput, snapshotToDashboardScore } from "../mappers";
import { generateCalculationSnapshot, verifySnapshotIntegrity } from "../snapshots/generator";

/**
 * Process submission calculation - main entry point
 *
 * This is the ONLY function that should be called to calculate scores.
 * It:
 * 1. Validates input
 * 2. Maps runtime data to calculation format
 * 3. Generates immutable snapshot
 * 4. Returns orchestration result
 *
 * @param submission - The runtime submission
 * @param scannerVersion - The scanner version from runtime
 * @returns OrchestrationResult with snapshot
 */
export function processSubmissionCalculation(
  submission: RuntimeSubmission,
  scannerVersion: RuntimeScannerVersion
): OrchestrationResult {
  try {
    // Step 1: Map runtime scanner to calculation format
    const scanner = mapScannerVersionToCalculationScanner(scannerVersion);

    // Step 2: Validate input
    const validation = validateCalculationInput({ submission, scanner });
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: "MISSING_SUBMISSION",
          message: validation.errors.map((e) => e.message).join("; "),
          context: { errors: validation.errors },
        },
      };
    }

    // Step 3: Generate snapshot
    const snapshot = generateCalculationSnapshot(submission, scanner);

    // Step 4: Verify integrity
    if (!verifySnapshotIntegrity(snapshot)) {
      return {
        success: false,
        error: {
          code: "MISSING_SUBMISSION",
          message: "Snapshot integrity verification failed",
        },
      };
    }

    return {
      success: true,
      snapshot,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "MISSING_SUBMISSION",
        message: error instanceof Error ? error.message : "Calculation failed",
      },
    };
  }
}

/**
 * Get dashboard score from snapshot (for quick reads)
 */
export function getDashboardScore(snapshot: SubmissionCalculationSnapshot): DashboardScore {
  return snapshotToDashboardScore(snapshot);
}

/**
 * Extract domain score from snapshot
 */
export function getDomainScore(
  snapshot: SubmissionCalculationSnapshot,
  domainId: string
): number | undefined {
  const domain = snapshot.domainSnapshots.find((d) => d.domainId === domainId);
  return domain?.normalizedScore;
}

/**
 * Calculate aggregate from multiple snapshots
 */
export function calculateAggregateScore(
  snapshots: SubmissionCalculationSnapshot[]
): { averageScore: number; domainAverages: Record<string, number> } {
  if (snapshots.length === 0) {
    return { averageScore: 0, domainAverages: {} };
  }

  // Calculate overall average
  const totalScore = snapshots.reduce((sum, s) => sum + s.overallScore, 0);
  const averageScore = totalScore / snapshots.length;

  // Calculate domain averages
  const domainAverages: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};

  snapshots.forEach((snapshot) => {
    snapshot.domainSnapshots.forEach((ds) => {
      if (!domainAverages[ds.domainId]) {
        domainAverages[ds.domainId] = 0;
        domainCounts[ds.domainId] = 0;
      }
      domainAverages[ds.domainId] += ds.normalizedScore;
      domainCounts[ds.domainId]++;
    });
  });

  // Average each domain
  Object.keys(domainAverages).forEach((domainId) => {
    domainAverages[domainId] = domainAverages[domainId] / domainCounts[domainId];
  });

  return { averageScore: Math.round(averageScore * 100) / 100, domainAverages };
}

/**
 * Filter snapshots by attributes for aggregation
 */
export function filterSnapshotsByAttributes(
  snapshots: SubmissionCalculationSnapshot[],
  filters: {
    stream?: string;
    location?: string;
    functionField?: string;
    department?: string;
    seniority?: string;
  }
): SubmissionCalculationSnapshot[] {
  return snapshots.filter((snapshot) => {
    const attrs = snapshot.attributes;
    if (filters.stream && attrs.stream !== filters.stream) return false;
    if (filters.location && attrs.location !== filters.location) return false;
    if (filters.functionField && attrs.functionField !== filters.functionField) return false;
    if (filters.department && attrs.department !== filters.department) return false;
    if (filters.seniority && attrs.seniority !== filters.seniority) return false;
    return true;
  });
}

/**
 * Calculate attribute breakdown for dashboard
 */
export function calculateAttributeBreakdown(
  snapshots: SubmissionCalculationSnapshot[]
): Record<string, { value: string; count: number; averageScore: number }[]> {
  const attributes = ["stream", "location", "functionField", "department", "seniority"];
  const breakdown: Record<string, { value: string; count: number; averageScore: number }[]> = {};

  attributes.forEach((attr) => {
    const valuesMap = new Map<string, { total: number; count: number }>();

    snapshots.forEach((snapshot) => {
      const attrValue = snapshot.attributes[attr as keyof typeof snapshot.attributes];
      if (!attrValue) return;

      const existing = valuesMap.get(attrValue) || { total: 0, count: 0 };
      existing.total += snapshot.overallScore;
      existing.count++;
      valuesMap.set(attrValue, existing);
    });

    breakdown[attr] = Array.from(valuesMap.entries()).map(([value, data]) => ({
      value,
      count: data.count,
      averageScore: Math.round((data.total / data.count) * 100) / 100,
    }));
  });

  return breakdown;
}