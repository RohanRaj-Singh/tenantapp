import type {
  RuntimeScannerVersion,
  ScannerAnswerOption,
  ScannerCategory,
  ScannerFollowUpTrigger,
  ScannerQuestion,
  ScannerSubdomain,
} from "../contracts/scannerVersion";
import type { SurveySubmissionResponse } from "../contracts/surveySubmission";

export interface ScannerResponseSelection {
  answerId: string;
  answerScore: number;
  answeredAt: string;
  timeSpentMs?: number;
}

export type ScannerResponseMap = Record<string, ScannerResponseSelection>;

export interface FlattenedScannerQuestion {
  category: ScannerCategory;
  subdomain: ScannerSubdomain;
  question: ScannerQuestion;
}

export interface ScannerAuditResult {
  orderedQuestions: FlattenedScannerQuestion[];
  primaryQuestions: FlattenedScannerQuestion[];
  followUpQuestions: FlattenedScannerQuestion[];
  questionMap: Map<string, FlattenedScannerQuestion>;
  followUpTriggers: ScannerFollowUpTrigger[];
  configurationIssues: string[];
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeAnswerOptions(question: ScannerQuestion, issues: string[]) {
  const seenAnswerIds = new Set<string>();
  const answers: ScannerAnswerOption[] = [];

  for (const answer of sortByOrder(question.answers)) {
    if (!isNonEmptyString(answer.id)) {
      issues.push(`Question "${question.questionText}" contains an answer with a missing id. The answer was ignored.`);
      continue;
    }

    if (seenAnswerIds.has(answer.id)) {
      issues.push(`Question "${question.questionText}" contains a duplicate answer id "${answer.id}". The duplicate answer was ignored.`);
      continue;
    }

    if (!isNonEmptyString(answer.label)) {
      issues.push(`Question "${question.questionText}" contains answer "${answer.id}" without a label. The answer was ignored.`);
      continue;
    }

    if (!isFiniteNumber(answer.score)) {
      issues.push(`Question "${question.questionText}" contains answer "${answer.id}" without a numeric score. The answer was ignored.`);
      continue;
    }

    if (!isFiniteNumber(answer.order)) {
      issues.push(`Question "${question.questionText}" contains answer "${answer.id}" without a numeric order. The answer was ignored.`);
      continue;
    }

    seenAnswerIds.add(answer.id);
    answers.push(answer);
  }

  return answers;
}

export function auditScannerVersion(scannerVersion: RuntimeScannerVersion): ScannerAuditResult {
  const configurationIssues: string[] = [];
  const questionMap = new Map<string, FlattenedScannerQuestion>();
  const orderedQuestions: FlattenedScannerQuestion[] = [];
  const primaryQuestions: FlattenedScannerQuestion[] = [];
  const followUpQuestions: FlattenedScannerQuestion[] = [];
  const seenCategoryIds = new Set<string>();
  const seenSubdomainIds = new Set<string>();

  for (const category of sortByOrder(scannerVersion.categories)) {
    if (!isNonEmptyString(category.id)) {
      configurationIssues.push(`A scanner category is missing an id and was ignored.`);
      continue;
    }

    if (seenCategoryIds.has(category.id)) {
      configurationIssues.push(`Duplicate category id "${category.id}" was ignored.`);
      continue;
    }

    if (!isNonEmptyString(category.label)) {
      configurationIssues.push(`Category "${category.id}" is missing a label and was ignored.`);
      continue;
    }

    if (!isFiniteNumber(category.order)) {
      configurationIssues.push(`Category "${category.id}" is missing a numeric order and was ignored.`);
      continue;
    }

    if (!isFiniteNumber(category.weight) || category.weight <= 0) {
      configurationIssues.push(`Category "${category.id}" has an invalid weight and was ignored.`);
      continue;
    }

    seenCategoryIds.add(category.id);

    for (const subdomain of sortByOrder(category.subdomains)) {
      if (!isNonEmptyString(subdomain.id)) {
        configurationIssues.push(`Category "${category.label}" contains a subdomain without an id. The subdomain was ignored.`);
        continue;
      }

      if (seenSubdomainIds.has(subdomain.id)) {
        configurationIssues.push(`Duplicate subdomain id "${subdomain.id}" was ignored.`);
        continue;
      }

      if (!isNonEmptyString(subdomain.label)) {
        configurationIssues.push(`Subdomain "${subdomain.id}" is missing a label and was ignored.`);
        continue;
      }

      if (!isFiniteNumber(subdomain.order)) {
        configurationIssues.push(`Subdomain "${subdomain.id}" is missing a numeric order and was ignored.`);
        continue;
      }

      if (!isFiniteNumber(subdomain.weight) || subdomain.weight <= 0) {
        configurationIssues.push(`Subdomain "${subdomain.id}" has an invalid weight and was ignored.`);
        continue;
      }

      seenSubdomainIds.add(subdomain.id);

      for (const question of sortByOrder(subdomain.questions)) {
        if (!isNonEmptyString(question.id)) {
          configurationIssues.push(`Subdomain "${subdomain.label}" contains a question without an id. The question was ignored.`);
          continue;
        }

        if (questionMap.has(question.id)) {
          configurationIssues.push(`Duplicate question id "${question.id}" was ignored.`);
          continue;
        }

        if (!isNonEmptyString(question.questionText)) {
          configurationIssues.push(`Question "${question.id}" is missing text and was ignored.`);
          continue;
        }

        if (!isFiniteNumber(question.order)) {
          configurationIssues.push(`Question "${question.id}" is missing a numeric order and was ignored.`);
          continue;
        }

        if (!isFiniteNumber(question.weight) || question.weight <= 0) {
          configurationIssues.push(`Question "${question.id}" has an invalid weight. The question was ignored.`);
          continue;
        }

        const answers = sanitizeAnswerOptions(question, configurationIssues);

        if (answers.length < 2) {
          configurationIssues.push(`Question "${question.questionText}" has fewer than two valid answers and was ignored.`);
          continue;
        }

        const sanitizedQuestion: ScannerQuestion = {
          ...question,
          answers,
        };
        const flattenedQuestion: FlattenedScannerQuestion = {
          category,
          subdomain,
          question: sanitizedQuestion,
        };

        questionMap.set(question.id, flattenedQuestion);
        orderedQuestions.push(flattenedQuestion);

        if (sanitizedQuestion.kind === "follow-up") {
          followUpQuestions.push(flattenedQuestion);
        } else {
          primaryQuestions.push(flattenedQuestion);
        }
      }
    }
  }

  const validFollowUpTriggers: ScannerFollowUpTrigger[] = [];
  const seenTriggerIds = new Set<string>();

  for (const trigger of scannerVersion.followUpTriggers) {
    if (!isNonEmptyString(trigger.id)) {
      configurationIssues.push(`A follow-up trigger is missing an id and was ignored.`);
      continue;
    }

    if (seenTriggerIds.has(trigger.id)) {
      configurationIssues.push(`Duplicate follow-up trigger id "${trigger.id}" was ignored.`);
      continue;
    }

    seenTriggerIds.add(trigger.id);

    const triggerQuestion = questionMap.get(trigger.triggerQuestionId);

    if (!triggerQuestion) {
      configurationIssues.push(`Follow-up trigger "${trigger.id}" references missing trigger question "${trigger.triggerQuestionId}" and was ignored.`);
      continue;
    }

    if (triggerQuestion.question.kind !== "primary") {
      configurationIssues.push(`Follow-up trigger "${trigger.id}" references follow-up question "${trigger.triggerQuestionId}" as a trigger. The trigger was ignored.`);
      continue;
    }

    const triggerAnswerScores = trigger.triggerAnswerScores.filter((score) => isFiniteNumber(score));

    if (triggerAnswerScores.length === 0) {
      configurationIssues.push(`Follow-up trigger "${trigger.id}" does not contain any valid trigger scores and was ignored.`);
      continue;
    }

    const validFollowUpQuestionIds = trigger.followUpQuestionIds.filter((questionId) => {
      const question = questionMap.get(questionId);
      const isValidFollowUp = question?.question.kind === "follow-up";

      if (!isValidFollowUp) {
        configurationIssues.push(`Follow-up trigger "${trigger.id}" references invalid follow-up question "${questionId}". The reference was ignored.`);
      }

      return isValidFollowUp;
    });

    if (validFollowUpQuestionIds.length === 0) {
      configurationIssues.push(`Follow-up trigger "${trigger.id}" does not point to any valid follow-up questions and was ignored.`);
      continue;
    }

    validFollowUpTriggers.push({
      ...trigger,
      triggerAnswerScores,
      followUpQuestionIds: Array.from(new Set(validFollowUpQuestionIds)),
    });
  }

  const referencedFollowUpIds = new Set(
    validFollowUpTriggers.flatMap((trigger) => trigger.followUpQuestionIds),
  );

  for (const followUpQuestion of followUpQuestions) {
    if (!referencedFollowUpIds.has(followUpQuestion.question.id)) {
      configurationIssues.push(`Follow-up question "${followUpQuestion.question.questionText}" is not referenced by any trigger and will stay hidden.`);
    }
  }

  return {
    orderedQuestions,
    primaryQuestions,
    followUpQuestions,
    questionMap,
    followUpTriggers: validFollowUpTriggers,
    configurationIssues,
  };
}

export function buildSurveyQuestionSequence(
  auditResult: ScannerAuditResult,
  responses: ScannerResponseMap,
): FlattenedScannerQuestion[] {
  const triggeredFollowUpIds = new Set<string>();

  for (const trigger of auditResult.followUpTriggers) {
    const selectedResponse = responses[trigger.triggerQuestionId];

    if (!selectedResponse) {
      continue;
    }

    if (trigger.triggerAnswerScores.includes(selectedResponse.answerScore)) {
      for (const followUpQuestionId of trigger.followUpQuestionIds) {
        triggeredFollowUpIds.add(followUpQuestionId);
      }
    }
  }

  const visibleFollowUps = auditResult.followUpQuestions.filter((question) =>
    triggeredFollowUpIds.has(question.question.id),
  );

  return [...auditResult.primaryQuestions, ...visibleFollowUps];
}

export function findAnswerOption(question: ScannerQuestion, answerId: string) {
  return question.answers.find((answer) => answer.id === answerId) ?? null;
}

export function toSurveySubmissionResponses(
  questions: FlattenedScannerQuestion[],
  responses: ScannerResponseMap,
): SurveySubmissionResponse[] {
  return questions.flatMap((item) => {
    const response = responses[item.question.id];

    if (!response) {
      return [];
    }

    return [
      {
        questionId: item.question.id,
        answerId: response.answerId,
        answerScore: response.answerScore,
        answeredAt: response.answeredAt,
        timeSpentMs: response.timeSpentMs,
      },
    ];
  });
}
