# Scoring System

Superseded for active `tenantapp` runtime work by:

- `docs/contracts/scoring-boundary-contract.md`

This file remains a legacy audit snapshot from the older OQEP structure.

## Scope

This document describes the actual implemented scoring behavior found in:

- `backend/src/app/modules/survey/survey.service.ts`
- `backend/src/app/modules/question/question.service.ts`
- `backend/src/app/modules/survey/survey.model.ts`
- `frontend/src/components/landing/surveyQuestions/SurveyFlow.tsx`
- `frontend/src/components/landing/surveyQuestions/NewSurveyFlow.tsx`
- `frontend/src/app/(OrganizationDashboard)/organizationDashboard/surveys/[id]/page.tsx`

## Actual Answer Score Mapping

The current runtime system derives score from answer position.

Implemented mapping:

```ts
const ANSWER_INDEX_SCORES = [-2, -1, 1, 2];
```

Meaning:

| `answerIndex` | Stored score |
| ---: | ---: |
| `0` | `-2` |
| `1` | `-1` |
| `2` | `1` |
| `3` | `2` |

Implications:

- There is no score value stored on answer options themselves.
- There is no neutral `0` score.
- Score polarity is controlled by answer order only.

## How Score Is Created

Frontend submits:

```ts
{
  questionId: string;
  answerIndex: number;
}
```

Backend persists:

```ts
{
  question: ObjectId;
  answerIndex: number;
  score: number;
}
```

The authoritative score is computed in backend:

```ts
score = ANSWER_INDEX_SCORES[answerIndex];
```

## Risk Fraction Formula

Weighted survey and dashboard calculations convert score to risk fraction with:

```ts
riskFraction = (2 - score) / 4;
```

Effective mapping:

| Score | Risk fraction |
| ---: | ---: |
| `-2` | `1.00` |
| `-1` | `0.75` |
| `1` | `0.25` |
| `2` | `0.00` |

This means:

- Lower answer positions produce higher risk.
- Higher answer positions produce lower risk.
- Runtime scoring is monotonic by option order.

## Per-Question Weighting

Each question carries:

```ts
weight: number
```

Weighted risk contribution:

```ts
weightedRisk = question.weight * riskFraction;
```

Maximum weighted contribution per question is currently:

```ts
question.weight * 1
```

because the risk fraction range is `0..1`.

## Per-Domain Survey Result Formula

`getSurveyResult` excludes follow-up questions and computes, per `dashboardDomain`:

```ts
totalWeight = sum(question.weight)
totalRiskWeight = sum(question.weight * riskFraction)
domainRiskPercent = (totalRiskWeight / totalWeight) * 100
healthyFraction = 1 - domainRiskPercent / 100
```

Response shape returned to frontend:

```ts
{
  dashboardDomain: string;
  riskCount: number;
  totalWRS: number;
  domainScore: string;
  healthyScore: number;
  responses: [...]
}
```

Current meanings:

- `totalWRS` is raw weighted risk sum, not percentage.
- `domainScore` is risk percentage as a string.
- `healthyScore` is a `0..1` fraction, not a percentage.

## High-Risk Counting Logic

Separate from weighted scoring, runtime keeps a simple high-risk count:

```ts
if (answerIndex === 0 || answerIndex === 1) {
  riskCount += 1;
}
```

This affects:

- `domainRisks[].riskCount`
- `highRiskCount`
- follow-up triggering

This logic does not use question weight.

## Dashboard Aggregation Paths

The current codebase contains multiple score paths.

### Weighted Percentage Path

Used in:

- `getSurveyResult`
- `getSubdomainSeats2`
- `getAllDomainMetrics`
- `getSuperAdminSubdomainSeats`
- `getSuperAdminAllSurveyResult`
- part of `getOrganizationSurveyStats2`

Formula basis:

```ts
percentage = sum(weight * riskFraction) / sum(weight) * 100
```

This is the most internally consistent scoring path in the current backend.

### Raw Risk-Count Path

Used in:

- `getAdminSurveyStats`

Formula basis:

- domain `riskCount` is the number of answers with `answerIndex` `0` or `1`
- averages are taken over those counts
- domain high risk thresholds are based on raw counts, not weighted percentages

This path is materially different from the weighted percentage path.

## Reverse Scoring

`isInverted` exists in the data model, but current runtime scoring does not apply inverted logic.

Confirmed implementation behavior:

- question creation forces `isInverted: true` in backend service
- question update also forces `isInverted: true`
- survey score calculation never reads `isInverted`
- risk formulas depend only on `answerIndex`

Current conclusion:

- reverse scoring is not operational
- `isInverted` is metadata drift, not effective scoring behavior

## Dashboard Domain Weight Constants

Question creation assigns fixed constants by `dashboardDomain`:

| Dashboard domain | Stored `dashboardDomainMaxPossibleScore` | Stored `dashboardDomainWeight` |
| --- | ---: | ---: |
| `Clinical Risk Index` | `180` | `45` |
| `Psychological Safety Index` | `120` | `30` |
| `Satisfaction & Engagement` | `60` | `15` |
| `Workload & Efficiency` | `48` | `12` |
| `Leadership & Alignment` | `36` | `9` |

Current runtime status:

- these fields are stored on questions
- active scoring formulas do not consume them

Observed drift against the current backend seed:

| Dashboard domain | Sum of seeded question weights | Weighted max from current formula | Stored max possible score |
| --- | ---: | ---: | ---: |
| `Satisfaction & Engagement` | `33` | `66` | `60` |
| `Clinical Risk Index` | `84` | `168` | `180` |
| `Workload & Efficiency` | `17` | `34` | `48` |
| `Leadership & Alignment` | `4` | `8` | `36` |
| `Psychological Safety Index` | `35` | `70` | `120` |

The stored constants do not match the active seeded question set.

## Follow-Up Scoring Effect

Follow-up responses are stored with score values, but current scoring excludes them from:

- `domainRisks`
- `highRiskCount`
- `getSurveyResult` domain calculations
- domain percentage calculations in dashboard aggregation helpers

Current runtime effect:

- follow-ups are collected
- follow-ups are not part of the primary scored outputs

## Frontend Assumptions and Drift

Current frontend behavior relevant to scoring:

- `SurveyFlow` and `NewSurveyFlow` submit only `answerIndex`
- frontend does not apply score math before submit
- `frontend/src/utils/getQuestions.ts` contains old commented scoring logic and is not active
- `frontend/src/components/questions/QuestionForm.tsx` lets admins edit `isInverted`, but backend ignores that setting

Important mismatch:

- `frontend/src/app/(OrganizationDashboard)/organizationDashboard/surveys/[id]/page.tsx` displays a per-question `WRS` formula derived from `response.score`
- that display formula is not the same as backend risk-fraction scoring

## Scoring Risks

- Answer text and answer score are decoupled; option order is the hidden contract.
- `isInverted` suggests a feature the runtime does not actually use.
- Two different aggregation strategies coexist in backend.
- Stored `dashboardDomainMaxPossibleScore` constants are not aligned with active question weights.
- Frontend survey detail math is not equivalent to backend risk scoring.

## DB Boundary Notes

For database design, current runtime behavior requires:

- immutable storage of answer order
- immutable storage of per-question weight
- explicit versioning of scoring rules
- one canonical aggregation strategy for dashboards
- removal of non-authoritative frontend score assumptions from the source-of-truth layer
