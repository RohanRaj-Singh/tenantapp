import { auditScannerVersion } from "@/runtime/scanner/scannerUtils";
import type {
  DashboardSnapshotCategoryMetric,
  DashboardSnapshotDemographicMetric,
  DashboardSnapshotSubdomainMetric,
} from "@/runtime/contracts/aggregation";
import type { FlattenedScannerQuestion } from "@/runtime/scanner/scannerUtils";
import type { RawResponseDocument, RawResponseRow } from "@/src/server/db/documents";
import type { AggregationPipelineInput, SubmissionScoreSummary } from "./contracts";

interface EvaluatedResponse {
  submissionId: string;
  sessionId: string;
  attributes: RawResponseDocument["attributes"];
  row: RawResponseRow;
  question: FlattenedScannerQuestion;
  normalizedScore: number | null;
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateRiskStatus(
  riskScore: number,
): "no-risk" | "low-risk" | "medium-risk" | "high-risk" {
  if (riskScore >= 75) {
    return "high-risk";
  }

  if (riskScore >= 50) {
    return "medium-risk";
  }

  if (riskScore >= 25) {
    return "low-risk";
  }

  return "no-risk";
}

function normalizeAnswerScore(question: FlattenedScannerQuestion, answerScore: number) {
  const scores = question.question.answers.map((answer) => answer.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
    return 0;
  }

  if (maxScore === minScore) {
    return answerScore >= 0 ? 100 : 0;
  }

  return ((answerScore - minScore) / (maxScore - minScore)) * 100;
}

function evaluateResponses(input: AggregationPipelineInput) {
  const audit = auditScannerVersion(input.scope.runtimeConfig.scannerVersion);

  return input.rawResponses.flatMap((submission) =>
    submission.responses.flatMap((row) => {
      const question = audit.questionMap.get(row.questionId);

      if (!question) {
        return [];
      }

      return [
        {
          submissionId: submission.submissionId,
          sessionId: submission.metadata.sessionId,
          attributes: submission.attributes,
          row,
          question,
          normalizedScore:
            row.questionKind === "primary"
              ? normalizeAnswerScore(question, row.answerScore)
              : null,
        } satisfies EvaluatedResponse,
      ];
    }),
  );
}

function buildSubmissionSummaries(
  input: AggregationPipelineInput,
  evaluatedResponses: EvaluatedResponse[],
) {
  const scoreMap = new Map<string, number[]>();
  const sessionMap = new Map<string, string>();

  input.rawResponses.forEach((submission) => {
    scoreMap.set(submission.submissionId, []);
    sessionMap.set(submission.submissionId, submission.metadata.sessionId);
  });

  evaluatedResponses.forEach((response) => {
    if (typeof response.normalizedScore === "number") {
      scoreMap.get(response.submissionId)?.push(response.normalizedScore);
    }
  });

  return Array.from(scoreMap.entries()).map(([submissionId, scores]) => {
    const satisfactionScore = roundMetric(average(scores));
    const riskScore = roundMetric(100 - satisfactionScore);

    return {
      submissionId,
      sessionId: sessionMap.get(submissionId) ?? submissionId,
      satisfactionScore,
      riskScore,
      riskStatus: calculateRiskStatus(riskScore),
    } satisfies SubmissionScoreSummary;
  });
}

export function calculateCategoryMetrics(
  input: AggregationPipelineInput,
): DashboardSnapshotCategoryMetric[] {
  const evaluatedResponses = evaluateResponses(input);

  return input.scope.runtimeConfig.scannerVersion.categories.flatMap((category) => {
    const categoryResponses = evaluatedResponses.filter(
      (response) =>
        response.row.categoryId === category.id &&
        typeof response.normalizedScore === "number",
    );
    const participantCount = new Set(
      evaluatedResponses
        .filter((response) => response.row.categoryId === category.id)
        .map((response) => response.submissionId),
    ).size;
    const averageScore = roundMetric(
      average(categoryResponses.map((response) => response.normalizedScore ?? 0)),
    );
    const riskScore = roundMetric(100 - averageScore);

    return [
      {
        categoryId: category.id,
        categoryLabel: category.label,
        participantCount,
        averageScore,
        riskScore,
        satisfactionScore: averageScore,
        riskStatus: calculateRiskStatus(riskScore),
      },
    ];
  });
}

function bucketNameFromRiskScore(riskScore: number) {
  if (riskScore >= 75) {
    return "highRisk";
  }

  if (riskScore >= 50) {
    return "mediumRisk";
  }

  if (riskScore >= 25) {
    return "lowRisk";
  }

  return "noRisk";
}

export function calculateSubdomainMetrics(
  input: AggregationPipelineInput,
): DashboardSnapshotSubdomainMetric[] {
  const evaluatedResponses = evaluateResponses(input);

  return input.scope.runtimeConfig.scannerVersion.categories.flatMap((category) =>
    category.subdomains.map((subdomain) => {
      const subdomainResponses = evaluatedResponses.filter(
        (response) =>
          response.row.subdomainId === subdomain.id &&
          typeof response.normalizedScore === "number",
      );
      const groupedBySubmission = new Map<string, number[]>();

      subdomainResponses.forEach((response) => {
        const submissionScores = groupedBySubmission.get(response.submissionId) ?? [];
        submissionScores.push(response.normalizedScore ?? 0);
        groupedBySubmission.set(response.submissionId, submissionScores);
      });

      const participantCount = new Set(
        evaluatedResponses
          .filter((response) => response.row.subdomainId === subdomain.id)
          .map((response) => response.submissionId),
      ).size;
      const averageScore = roundMetric(
        average(subdomainResponses.map((response) => response.normalizedScore ?? 0)),
      );
      const riskDistribution = {
        noRisk: 0,
        lowRisk: 0,
        mediumRisk: 0,
        highRisk: 0,
      };

      Array.from(groupedBySubmission.values()).forEach((scores) => {
        const submissionRiskScore = 100 - average(scores);
        const bucket = bucketNameFromRiskScore(submissionRiskScore);
        riskDistribution[bucket] += 1;
      });

      return {
        subdomainId: subdomain.id,
        subdomainLabel: subdomain.label,
        categoryId: category.id,
        participantCount,
        averageScore,
        riskDistribution,
      };
    }),
  );
}

export function calculateOverallMetrics(input: AggregationPipelineInput) {
  const evaluatedResponses = evaluateResponses(input);
  const submissionSummaries = buildSubmissionSummaries(input, evaluatedResponses);
  const uniqueRespondents = new Set(submissionSummaries.map((summary) => summary.sessionId)).size;
  const completedResponseCount = input.rawResponses.filter(
    (response) => response.completionState.status === "completed",
  ).length;

  return {
    totalResponses: input.rawResponses.length,
    uniqueRespondents,
    completionRate:
      input.rawResponses.length > 0
        ? roundMetric(completedResponseCount / input.rawResponses.length)
        : 0,
    highRiskResponders: submissionSummaries.filter(
      (summary) => summary.riskStatus === "high-risk",
    ).length,
    mediumRiskResponders: submissionSummaries.filter(
      (summary) => summary.riskStatus === "medium-risk",
    ).length,
    lowRiskResponders: submissionSummaries.filter(
      (summary) => summary.riskStatus === "low-risk",
    ).length,
  };
}

function buildDemographicRows(
  summaries: Array<
    SubmissionScoreSummary & {
      attributes: RawResponseDocument["attributes"];
    }
  >,
  key: keyof RawResponseDocument["attributes"],
): DashboardSnapshotDemographicMetric[] {
  const totalParticipants = summaries.length || 1;
  const grouped = new Map<
    string,
    Array<SubmissionScoreSummary & { attributes: RawResponseDocument["attributes"] }>
  >();

  summaries.forEach((summary) => {
    const value = summary.attributes[key];

    if (!value) {
      return;
    }

    const items = grouped.get(value) ?? [];
    items.push(summary);
    grouped.set(value, items);
  });

  return Array.from(grouped.entries()).map(([value, items]) => ({
    key: value,
    label: formatLabel(value),
    participantCount: items.length,
    percentage: roundMetric((items.length / totalParticipants) * 100),
    averageRiskScore: roundMetric(average(items.map((item) => item.riskScore))),
    satisfactionScore: roundMetric(average(items.map((item) => item.satisfactionScore))),
  }));
}

export function calculateDemographicMetrics(input: AggregationPipelineInput) {
  const evaluatedResponses = evaluateResponses(input);
  const submissionMap = new Map<string, RawResponseDocument>();

  input.rawResponses.forEach((response) => {
    submissionMap.set(response.submissionId, response);
  });

  const summaries = buildSubmissionSummaries(input, evaluatedResponses).map((summary) => ({
    ...summary,
    attributes: submissionMap.get(summary.submissionId)?.attributes ?? {
      stream: "",
      location: "",
      function: "",
      department: "",
      gender: "",
      age: "",
      seniority: "",
    },
  }));

  return {
    byAge: buildDemographicRows(summaries, "age"),
    byGender: buildDemographicRows(summaries, "gender"),
    byDepartment: buildDemographicRows(summaries, "department"),
    byStream: buildDemographicRows(summaries, "stream"),
    byFunction: buildDemographicRows(summaries, "function"),
    byLocation: buildDemographicRows(summaries, "location"),
  };
}
