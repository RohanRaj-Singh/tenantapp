import { ScannerVersion } from '../contracts/scannerVersion';

export const mockScannerVersion: ScannerVersion = {
  scannerVersion: {
    id: 'scanner-v1',
    version: '1.0.0',
    tenantId: 'tenant-demo-001',
    publishedAt: '2024-01-15T00:00:00.000Z',
    createdBy: 'system',
    changeLog: 'Initial release',
  },
  categories: [
    {
      id: 'cat-1',
      label: 'Satisfaction & Engagement',
      description: 'Measures employee satisfaction and engagement levels',
      weight: 100,
      subdomains: [
        {
          id: 'sub-1',
          label: 'Personal Wellbeing',
          description: 'Personal wellbeing questions',
          weight: 50,
          maxPossibleScore: 60,
          questions: [
            {
              id: 'Q1',
              questionText: 'How often have you felt calm and peaceful in the last two weeks?',
              options: ['Never', 'Rarely', 'Often', 'Always'],
              weight: 2,
              isInverted: false,
              isFollowUp: false,
              polarity: 'positive',
              scoring: { minScore: -2, maxScore: 2, optionScores: [-2, -1, 1, 2] },
            },
            {
              id: 'Q3',
              questionText: 'To what extent do you feel you have the personal resilience to handle workplace stressors without feeling overwhelmed?',
              options: ['Not at all', 'Slightly', 'Moderately', 'Highly'],
              weight: 3,
              isInverted: false,
              isFollowUp: false,
              polarity: 'positive',
              scoring: { minScore: -2, maxScore: 2, optionScores: [-2, -1, 1, 2] },
            },
          ],
          followUpRules: [],
        },
      ],
    },
    {
      id: 'cat-2',
      label: 'Clinical Risk Index',
      description: 'Clinical risk assessment',
      weight: 135,
      subdomains: [
        {
          id: 'sub-3',
          label: 'Burnout',
          description: 'Burnout risk questions',
          weight: 45,
          maxPossibleScore: 90,
          questions: [
            {
              id: 'Q2',
              questionText: 'How often do you feel that your mental and emotional energy is depleted at the end of a workday?',
              options: ['Always', 'Often', 'Rarely', 'Never'],
              weight: 4,
              isInverted: true,
              isFollowUp: false,
              polarity: 'negative',
              scoring: { minScore: -2, maxScore: 2, optionScores: [-2, -1, 1, 2] },
            },
          ],
          followUpRules: [
            {
              triggerQuestionId: 'Q2',
              triggerAnswerIndex: 0,
              followUpQuestionIds: ['Q26'],
            },
          ],
        },
      ],
    },
  ],
};