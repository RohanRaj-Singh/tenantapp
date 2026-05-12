# Survey Submission Contracts

## Canonical Source Files

- `tenantapp/runtime/contracts/surveySubmission.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/runtime/providers/surveyService.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/app/api/survey/submit/route.ts`
- `tenantapp/components/survey/SurveyContainer.tsx`

## Active Runtime Submission Path

Current runtime flow:

1. `/survey`
   collects runtime attribute selections
2. `saveRuntimeSurveySession(...)`
   stores tenant, tenant slug, scanner version, and attributes
3. `/survey-questions`
   renders questions from the active scanner contract
4. visible questions are converted to raw submission rows
5. `submitSurvey(...)`
   posts a batch payload to `/api/survey/submit`

## Canonical Payload

```ts
interface SurveySubmissionAttributes {
  stream: string;
  location: string;
  function: string;
  department: string;
  gender: string;
  age: string;
  seniority: string;
}

interface SurveySubmissionResponse {
  questionId: string;
  answerId: string;
  answerScore: number;
  answeredAt: string;
  timeSpentMs?: number;
}

interface SurveySubmission {
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
```

## Runtime Payload Rules

- `responses[]` contains only visible runtime questions
- `answerId` and `answerScore` come directly from the selected answer object
- frontend does not derive score from answer position
- disabled optional attributes remain empty strings
- `scannerVersionId` must match the active session and active tenant config

## Session Safety

`readRuntimeSurveySession(...)` now rejects stale sessions when:

- `tenantId` changes
- `tenantSlug` changes
- `scannerVersionId` changes

This prevents runtime submissions from crossing tenant or scanner boundaries.

## Local Submit Route Validation

`tenantapp/app/api/survey/submit/route.ts` currently enforces:

- `tenantId` is present
- `scannerVersionId` is present
- `attributes` exists
- `responses` is non-empty
- every runtime attribute key is a string
- every response includes string `questionId`
- every response includes string `answerId`
- every response includes numeric `answerScore`

The local route still does not validate:

- question membership in the published scanner version
- answer membership in the question definition
- duplicate response rows
- submission replay policy

These checks belong in the future API/database layer.
