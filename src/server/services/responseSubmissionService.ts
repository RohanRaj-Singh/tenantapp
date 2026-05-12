import { randomUUID } from "crypto";
import {
  buildRuntimeAttributeFormState,
  resolveRuntimeAttributeTemplate,
  sanitizeRuntimeAttributeSelections,
  type RuntimeAttributeSelections,
} from "@/runtime/attributes/attributeTemplateUtils";
import type { RuntimeAttributeTemplate } from "@/runtime/contracts/runtime";
import type { RuntimeTenantRequestResolution } from "@/runtime/tenant/tenantResolution";
import {
  auditScannerVersion,
  buildSurveyQuestionSequence,
  findAnswerOption,
  type ScannerResponseMap,
} from "@/runtime/scanner/scannerUtils";
import type {
  SurveySubmission,
  SurveySubmissionAttributes,
  SurveySubmissionResponse,
} from "@/runtime/contracts/surveySubmission";
import { ApiError } from "@/src/server/api/errors";
import { generateAndStoreAggregationSnapshot } from "./aggregationService";
import { resolveRuntimeContext } from "./runtimeContextService";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(
      400,
      "INVALID_SUBMISSION_PAYLOAD",
      `The field "${field}" must be a non-empty string.`,
    );
  }

  return value.trim();
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readStringValue(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new ApiError(
      400,
      "INVALID_SUBMISSION_PAYLOAD",
      `The field "${field}" must be a string.`,
    );
  }

  return value.trim();
}

function readOptionalIsoDate(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedDate = new Date(value);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new ApiError(
      400,
      "INVALID_SUBMISSION_PAYLOAD",
      `The provided date value "${value}" is not a valid ISO timestamp.`,
    );
  }

  return normalizedDate.toISOString();
}

function parseSubmissionAttributes(value: unknown): SurveySubmissionAttributes {
  if (!isRecord(value)) {
    throw new ApiError(
      400,
      "INVALID_SUBMISSION_PAYLOAD",
      "Survey submissions require an attributes object.",
    );
  }

  return {
    stream: readStringValue(value.stream, "attributes.stream"),
    location: readStringValue(value.location, "attributes.location"),
    function: readStringValue(value.function, "attributes.function"),
    department: readStringValue(value.department, "attributes.department"),
    gender: readStringValue(value.gender, "attributes.gender"),
    age: readStringValue(value.age, "attributes.age"),
    seniority: readStringValue(value.seniority, "attributes.seniority"),
  };
}

function parseSubmissionResponses(value: unknown): SurveySubmissionResponse[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(
      400,
      "INVALID_SUBMISSION_PAYLOAD",
      "Survey submissions require a non-empty responses array.",
    );
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ApiError(
        400,
        "INVALID_SUBMISSION_PAYLOAD",
        `Response row ${index + 1} must be an object.`,
      );
    }

    const answerScore = item.answerScore;

    if (typeof answerScore !== "number" || !Number.isFinite(answerScore)) {
      throw new ApiError(
        400,
        "INVALID_SUBMISSION_PAYLOAD",
        `Response row ${index + 1} requires a finite numeric answerScore.`,
      );
    }

    return {
      questionId: readRequiredString(item.questionId, `responses[${index}].questionId`),
      answerId: readRequiredString(item.answerId, `responses[${index}].answerId`),
      answerScore,
      answeredAt: readOptionalIsoDate(item.answeredAt, new Date().toISOString()),
      timeSpentMs:
        typeof item.timeSpentMs === "number" && Number.isFinite(item.timeSpentMs)
          ? item.timeSpentMs
          : undefined,
      questionKind:
        item.questionKind === "follow-up" || item.questionKind === "primary"
          ? item.questionKind
          : undefined,
      triggerQuestionId: readOptionalString(item.triggerQuestionId),
    };
  });
}

function parseSubmissionBody(body: unknown) {
  if (!isRecord(body)) {
    throw new ApiError(
      400,
      "INVALID_SUBMISSION_PAYLOAD",
      "Survey submissions require a JSON object payload.",
    );
  }

  const now = new Date().toISOString();
  const completionState = isRecord(body.completionState) ? body.completionState : {};
  const metadata = isRecord(body.metadata) ? body.metadata : {};

  return {
    runtimeConfigId: readOptionalString(body.runtimeConfigId),
    tenantId: readRequiredString(body.tenantId, "tenantId"),
    tenantSlug: readOptionalString(body.tenantSlug),
    scannerVersionId: readRequiredString(body.scannerVersionId, "scannerVersionId"),
    attributeTemplateVersionId: readOptionalString(body.attributeTemplateVersionId),
    inviteToken: readOptionalString(body.inviteToken),
    attributes: parseSubmissionAttributes(body.attributes),
    responses: parseSubmissionResponses(body.responses),
    completionState: {
      status:
        completionState.status === "in-progress" || completionState.status === "completed"
          ? completionState.status
          : "completed",
      startedAt: readOptionalString(completionState.startedAt),
      completedAt: readOptionalIsoDate(completionState.completedAt, now),
      totalQuestions:
        typeof completionState.totalQuestions === "number" &&
        Number.isFinite(completionState.totalQuestions)
          ? completionState.totalQuestions
          : 0,
      answeredQuestions:
        typeof completionState.answeredQuestions === "number" &&
        Number.isFinite(completionState.answeredQuestions)
          ? completionState.answeredQuestions
          : 0,
    },
    metadata: {
      sessionId: readRequiredString(metadata.sessionId, "metadata.sessionId"),
      userAgent: readOptionalString(metadata.userAgent),
      ipAddress: readOptionalString(metadata.ipAddress),
      inviteToken: readOptionalString(metadata.inviteToken),
    },
  } satisfies SurveySubmission;
}

function validateSubmissionAttributes(
  submittedAttributes: SurveySubmissionAttributes,
  runtimeAttributeTemplate: RuntimeAttributeTemplate,
) {
  const resolvedTemplate = resolveRuntimeAttributeTemplate(runtimeAttributeTemplate);
  const sanitizedSelections = sanitizeRuntimeAttributeSelections(
    submittedAttributes as RuntimeAttributeSelections,
    resolvedTemplate,
  );
  const formState = buildRuntimeAttributeFormState(resolvedTemplate, sanitizedSelections);
  const changedKeys = (
    Object.keys(submittedAttributes) as Array<keyof SurveySubmissionAttributes>
  ).filter((key) => submittedAttributes[key] !== sanitizedSelections[key]);

  if (changedKeys.length > 0) {
    throw new ApiError(
      400,
      "INVALID_ATTRIBUTE_SELECTION",
      "One or more submitted tenant attribute selections are not valid for the published runtime configuration.",
      { fields: changedKeys },
    );
  }

  if (formState.validation.blockingIssues.length > 0) {
    throw new ApiError(
      400,
      "INVALID_ATTRIBUTE_TEMPLATE_STATE",
      "The published runtime attribute configuration is incomplete for safe submission handling.",
      { issues: formState.validation.blockingIssues },
    );
  }

  if (formState.validation.missingRequiredFields.length > 0) {
    throw new ApiError(
      400,
      "MISSING_REQUIRED_ATTRIBUTES",
      "Required tenant attributes are missing from the submission payload.",
      { fields: formState.validation.missingRequiredFields },
    );
  }
}

function createResponseMap(
  responses: SurveySubmissionResponse[],
): ScannerResponseMap {
  const responseMap: ScannerResponseMap = {};
  const seenQuestionIds = new Set<string>();

  responses.forEach((response) => {
    if (seenQuestionIds.has(response.questionId)) {
      throw new ApiError(
        400,
        "DUPLICATE_QUESTION_RESPONSE",
        `The question "${response.questionId}" was submitted more than once.`,
      );
    }

    seenQuestionIds.add(response.questionId);
    responseMap[response.questionId] = {
      answerId: response.answerId,
      answerScore: response.answerScore,
      answeredAt: response.answeredAt,
      timeSpentMs: response.timeSpentMs,
    };
  });

  return responseMap;
}

interface SubmitSurveyResponseOptions {
  requestTenant?: RuntimeTenantRequestResolution;
}

export async function submitSurveyResponse(
  body: unknown,
  options: SubmitSurveyResponseOptions = {},
) {
  const submission = parseSubmissionBody(body);
  const runtimeContext = await resolveRuntimeContext({
    runtimeConfigId: submission.runtimeConfigId,
    tenantId: submission.tenantId,
    tenantSlug: options.requestTenant?.tenantSlug ?? submission.tenantSlug,
  });

  if (submission.tenantId !== runtimeContext.tenant.tenantId) {
    throw new ApiError(
      409,
      "TENANT_MISMATCH",
      "Submitted tenantId does not match the resolved runtime configuration.",
    );
  }

  if (
    submission.tenantSlug &&
    submission.tenantSlug !== runtimeContext.tenant.slug
  ) {
    throw new ApiError(
      409,
      "TENANT_MISMATCH",
      "Submitted tenantSlug does not match the resolved runtime configuration.",
    );
  }

  if (
    options.requestTenant?.tenantSlug &&
    options.requestTenant.tenantSlug !== runtimeContext.tenant.slug
  ) {
    throw new ApiError(
      409,
      "TENANT_MISMATCH",
      "The active hostname does not match the submitted tenant.",
      {
        requestTenantSlug: options.requestTenant.tenantSlug,
        resolvedTenantSlug: runtimeContext.tenant.slug,
      },
    );
  }

  if (
    submission.runtimeConfigId &&
    submission.runtimeConfigId !== runtimeContext.runtimeConfig.runtimeConfigId
  ) {
    throw new ApiError(
      409,
      "VERSION_MISMATCH",
      "Submitted runtimeConfigId does not match the published runtime configuration.",
    );
  }

  if (
    submission.scannerVersionId !==
    runtimeContext.runtimeConfig.versionRefs.scannerVersionId
  ) {
    throw new ApiError(
      409,
      "VERSION_MISMATCH",
      "Submitted scannerVersionId does not match the published runtime configuration.",
    );
  }

  if (
    submission.attributeTemplateVersionId &&
    submission.attributeTemplateVersionId !==
      runtimeContext.runtimeConfig.versionRefs.attributeTemplateVersionId
  ) {
    throw new ApiError(
      409,
      "VERSION_MISMATCH",
      "Submitted attributeTemplateVersionId does not match the published runtime configuration.",
    );
  }

  const scannerVersion = await runtimeContext.repositories.scannerVersions.findByScannerVersionId(
    runtimeContext.runtimeConfig.versionRefs.scannerVersionId,
  );
  const attributeTemplateVersion =
    await runtimeContext.repositories.attributeTemplateVersions.findByAttributeTemplateVersionId(
      runtimeContext.runtimeConfig.versionRefs.attributeTemplateVersionId,
    );

  if (!scannerVersion) {
    throw new ApiError(
      409,
      "INVALID_SCANNER_VERSION",
      "The referenced scanner version could not be resolved from storage.",
    );
  }

  if (!attributeTemplateVersion) {
    throw new ApiError(
      409,
      "INVALID_ATTRIBUTE_TEMPLATE_VERSION",
      "The referenced attribute template version could not be resolved from storage.",
    );
  }

  validateSubmissionAttributes(
    submission.attributes,
    runtimeContext.runtimeConfig.attributeTemplate,
  );

  const scannerAudit = auditScannerVersion(runtimeContext.runtimeConfig.scannerVersion);
  const responseMap = createResponseMap(submission.responses);
  const visibleQuestions = buildSurveyQuestionSequence(scannerAudit, responseMap);
  const visibleQuestionIds = new Set(
    visibleQuestions.map((question) => question.question.id),
  );

  const triggerQuestionByFollowUpId = new Map<string, string>();
  scannerAudit.followUpTriggers.forEach((trigger) => {
    trigger.followUpQuestionIds.forEach((followUpQuestionId) => {
      triggerQuestionByFollowUpId.set(followUpQuestionId, trigger.triggerQuestionId);
    });
  });

  const enrichedResponses = submission.responses.map((response) => {
    const question = scannerAudit.questionMap.get(response.questionId);

    if (!question) {
      throw new ApiError(
        400,
        "INVALID_QUESTION",
        `The question "${response.questionId}" does not exist in the published scanner version.`,
      );
    }

    if (!visibleQuestionIds.has(response.questionId)) {
      throw new ApiError(
        400,
        "INVALID_QUESTION_VISIBILITY",
        `The question "${response.questionId}" was not visible in the published runtime flow for this submission.`,
      );
    }

    const answerOption = findAnswerOption(question.question, response.answerId);

    if (!answerOption) {
      throw new ApiError(
        400,
        "INVALID_ANSWER",
        `The answer "${response.answerId}" does not exist on question "${response.questionId}".`,
      );
    }

    if (answerOption.score !== response.answerScore) {
      throw new ApiError(
        400,
        "INVALID_ANSWER_SCORE",
        `The answerScore for question "${response.questionId}" does not match the published answer definition.`,
      );
    }

    return {
      questionId: response.questionId,
      answerId: response.answerId,
      answerScore: response.answerScore,
      answeredAt: response.answeredAt,
      timeSpentMs: response.timeSpentMs,
      questionKind: question.question.kind,
      triggerQuestionId: triggerQuestionByFollowUpId.get(response.questionId),
      categoryId: question.category.id,
      categoryLabel: question.category.label,
      subdomainId: question.subdomain.id,
      subdomainLabel: question.subdomain.label,
    };
  });

  if (
    submission.completionState.status === "completed" &&
    visibleQuestions.length !== enrichedResponses.length
  ) {
    throw new ApiError(
      400,
      "INCOMPLETE_SUBMISSION",
      "Every visible question must be answered before a submission can be completed.",
      {
        expectedQuestions: visibleQuestions.length,
        receivedResponses: enrichedResponses.length,
      },
    );
  }

  const submissionId = `sub_${randomUUID()}`;
  const submittedAt =
    submission.completionState.completedAt ?? new Date().toISOString();
  const canonicalCompletionState = {
    status: submission.completionState.status,
    startedAt: submission.completionState.startedAt,
    completedAt:
      submission.completionState.status === "completed" ? submittedAt : undefined,
    totalQuestions: visibleQuestions.length,
    answeredQuestions: enrichedResponses.length,
  };

  await runtimeContext.repositories.responses.insert({
    submissionId,
    submittedAt,
    tenantId: runtimeContext.tenant.tenantId,
    tenantSlug: runtimeContext.tenant.slug,
    runtimeConfigId: runtimeContext.runtimeConfig.runtimeConfigId,
    versionRefs: runtimeContext.runtimeConfig.versionRefs,
    attributes: submission.attributes,
    responses: enrichedResponses,
    completionState: canonicalCompletionState,
    metadata: {
      sessionId: submission.metadata.sessionId,
      userAgent: submission.metadata.userAgent,
      ipAddress: submission.metadata.ipAddress,
      inviteToken:
        submission.metadata.inviteToken ?? submission.inviteToken,
    },
    createdAt: submittedAt,
    updatedAt: submittedAt,
  });

  const snapshot = await generateAndStoreAggregationSnapshot({
    repositories: runtimeContext.repositories,
    tenant: runtimeContext.tenant,
    runtimeConfig: runtimeContext.runtimeConfig,
    filters: {},
    period: {
      from: runtimeContext.runtimeConfig.publishedAt,
      to: submittedAt,
    },
  });

  return {
    submissionId,
    status: "accepted" as const,
    submittedAt,
    versionRefs: {
      runtimeConfigId: runtimeContext.runtimeConfig.runtimeConfigId,
      scannerVersionId: runtimeContext.runtimeConfig.versionRefs.scannerVersionId,
      attributeTemplateVersionId:
        runtimeContext.runtimeConfig.versionRefs.attributeTemplateVersionId,
      calculationVersionId:
        runtimeContext.runtimeConfig.versionRefs.calculationVersionId,
    },
    aggregation: {
      queued: true,
      snapshotId: snapshot.snapshotId,
    },
  };
}
