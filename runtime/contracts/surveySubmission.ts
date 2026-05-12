export interface SurveySubmissionAttributes {
  stream: string;
  location: string;
  function: string;
  department: string;
  gender: string;
  age: string;
  seniority: string;
}

export interface SurveySubmissionResponse {
  questionId: string;
  answerId: string;
  answerScore: number;
  answeredAt: string;
  timeSpentMs?: number;
  questionKind?: "primary" | "follow-up";
  triggerQuestionId?: string;
}

export interface SurveySubmission {
  runtimeConfigId?: string;
  tenantId: string;
  tenantSlug?: string;
  scannerVersionId: string;
  attributeTemplateVersionId?: string;
  inviteToken?: string;
  attributes: SurveySubmissionAttributes;
  responses: SurveySubmissionResponse[];
  completionState: {
    status: "in-progress" | "completed";
    startedAt?: string;
    completedAt?: string;
    totalQuestions: number;
    answeredQuestions: number;
  };
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId: string;
    inviteToken?: string;
  };
}
