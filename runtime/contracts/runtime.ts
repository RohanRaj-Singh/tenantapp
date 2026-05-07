export interface TenantRuntimeConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'inactive' | 'suspended';
    plan: 'free' | 'pro' | 'enterprise';
    createdAt: string;
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    faviconUrl: string;
  };
  attributeTemplate: {
    streams: Array<{ id: string; label: string; value: string }>;
    locations: Array<{ id: string; label: string; value: string }>;
    functions: Array<{ id: string; label: string; value: string; streamId: string }>;
    departments: Array<{ id: string; label: string; value: string; streamId: string; functionId: string }>;
    genders: string[];
    ageGroups: string[];
    seniorityLevels: string[];
  };
  scannerVersion: {
    id: string;
    version: string;
    publishedAt: string;
    isActive: boolean;
    categories: Array<{
      id: string;
      label: string;
      subdomains: Array<{
        id: string;
        label: string;
        questionCount: number;
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
  };
  runtimeSettings: {
    allowAnonymous: boolean;
    requireAuthentication: boolean;
    surveyExpirationDays: number;
    allowMultipleSubmissions: boolean;
    language: 'en' | 'ar';
    featureFlags: Record<string, boolean>;
  };
}