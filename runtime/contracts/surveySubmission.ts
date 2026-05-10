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
}

export interface SurveySubmission {
  tenantId: string;
  scannerVersionId: string;
  inviteToken?: string;
  attributes: SurveySubmissionAttributes;
  responses: SurveySubmissionResponse[];
  completionState: {
    status: "in-progress" | "completed";
    completedAt?: string;
    totalQuestions: number;
    answeredQuestions: number;
  };
  metadata: {
    userAgent: string;
    ipAddress: string;
    sessionId: string;
  };
}
