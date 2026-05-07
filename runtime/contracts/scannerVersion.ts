export interface ScannerVersion {
  scannerVersion: {
    id: string;
    version: string;
    tenantId: string;
    publishedAt: string;
    createdBy: string;
    changeLog: string;
  };
  categories: Array<{
    id: string;
    label: string;
    description: string;
    weight: number;
    subdomains: Array<{
      id: string;
      label: string;
      description: string;
      weight: number;
      maxPossibleScore: number;
      questions: Array<{
        id: string;
        questionText: string;
        options: string[];
        weight: number;
        isInverted: boolean;
        isFollowUp: boolean;
        polarity: 'positive' | 'negative';
        scoring: {
          minScore: number;
          maxScore: number;
          optionScores: number[];
        };
      }>;
      followUpRules: Array<{
        triggerQuestionId: string;
        triggerAnswerIndex: number;
        followUpQuestionIds: string[];
      }>;
    }>;
  }>;
}