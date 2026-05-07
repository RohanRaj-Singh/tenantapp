export interface SurveySubmission {
  tenantId: string;
  scannerVersionId: string;
  inviteToken?: string;
  attributes: {
    streamId: string;
    locationId: string;
    functionId: string;
    departmentId: string;
    gender: 'male' | 'female' | 'other';
    ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
    seniorityLevel: 'senior' | 'manager' | 'employee';
  };
  responses: Array<{
    questionId: string;
    answerIndex: number;
    answeredAt: string;
    timeSpentMs?: number;
  }>;
  completionState: {
    status: 'in-progress' | 'completed';
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