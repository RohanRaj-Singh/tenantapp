# Scoring Boundary Contract

## Source Files

- `tenantapp/runtime/contracts/scannerCalculations.ts`
- `tenantapp/runtime/contracts/surveySubmission.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/app/api/survey/submit/route.ts`

## Frontend Responsibilities

The runtime frontend is responsible for:

- rendering scanner categories, subdomains, questions, and answers
- collecting runtime attributes
- collecting selected answer IDs and explicit answer scores
- applying runtime follow-up visibility
- submitting raw structured payloads

## Forbidden Frontend Responsibilities

The runtime frontend must not perform:

- answer-position scoring
- score normalization
- risk formulas
- category aggregation
- subdomain aggregation
- dashboard metric calculation
- follow-up diagnostic scoring

## Canonical Submission Boundary

Frontend submission rows are:

```ts
{
  questionId: string;
  answerId: string;
  answerScore: number;
  answeredAt: string;
  timeSpentMs?: number;
}
```

`answerScore` is allowed in the payload because it is raw configured answer metadata, not a frontend-derived formula.

## Follow-Up Boundary

Follow-up questions are diagnostic only.

Current contract:

- follow-ups may be collected
- follow-ups do not contribute to primary scoring
- follow-ups should not mutate category or subdomain score outputs

## Calculation Layer Interfaces

Prepared interfaces in `tenantapp/runtime/contracts/scannerCalculations.ts`:

```ts
type CalculateCategoryMetrics
type CalculateSubdomainMetrics
type CalculateOverallMetrics
```

Current request boundary:

```ts
interface ScannerCalculationRequest {
  tenantId: string;
  scannerVersionId: string;
  scannerVersion: RuntimeScannerVersion;
  attributes: SurveySubmissionAttributes;
  responses: SurveySubmissionResponse[];
}
```

These interfaces define the handoff point for the future aggregation engine. They do not contain business formulas yet.

## Aggregation Responsibilities

Future calculation and aggregation layers own:

- score formulas
- category rollups
- subdomain rollups
- overall score calculation
- dashboard summary snapshots
- anonymity thresholds
- demographic aggregations

## Dashboard Responsibilities

Dashboard runtime should consume:

- stored aggregation outputs
- published scanner metadata
- prepared labels and score values from the server

Dashboard runtime should not:

- recalculate survey results from client payloads
- infer missing answer scores
- infer question order from IDs

## Forbidden Patterns

- `answerIndex`
- `isInverted`
- fixed `[-2, -1, 1, 2]` index maps
- hardcoded `options.length === 4`
- follow-up triggers based on domain-wide risk counters
