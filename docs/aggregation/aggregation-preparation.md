# Aggregation Preparation

## Source Files

- `tenantapp/runtime/contracts/aggregation.ts`
- `tenantapp/runtime/mocks/mockAggregation.ts`
- `tenantapp/runtime/mocks/mockAggregatedMetrics.ts`
- `backend/src/app/modules/survey/survey.model.ts`
- `backend/src/app/modules/survey/survey.interface.ts`
- `backend/src/app/modules/survey/survey.service.ts`
- `backend/src/app/modules/survey/employeeInvite.model.ts`
- `backend/src/app/modules/survey/surveyReference.model.ts`
- `backend/src/types/scoring.ts`

## Current Persisted Survey State in `backend`

The legacy backend already persists:

- organizations
- flat questions
- `SurveyResponse`
- `employee_invites`
- `survey_references`

The aggregation logic currently runs directly from raw survey responses inside `survey.service.ts`.

## Current Raw Scoring Logic

The legacy backend uses a fixed score map:

```ts
answerIndex -> score
0 -> -2
1 -> -1
2 -> 1
3 -> 2
```

Then:

```ts
riskFraction = (2 - score) / 4
weightedRisk = riskFraction * question.weight
```

This logic assumes 4-option questions.

## Current Follow-Up Trigger Logic

Legacy backend completion logic:

- store all non-follow-up question IDs in the survey at start
- increment `domainRisks[domain]` when a non-follow-up answer index is `0` or `1`
- after main questions finish, add follow-up questions when `domainRiskCount >= 2`
- mark survey complete when no more applicable questions remain

This is different from the active `tenantapp` route, which never calls this backend flow.

## Current Roll-Up / Privacy Logic

The legacy backend already contains roll-up behavior in organization and super-admin statistics endpoints.

Observed behavior:

- start with requested filters
- if result count is below 4, remove filters in a fixed order
- continue until the query reaches at least 4 responses or no filters remain
- return `removedFilters` and `rollUp`

This roll-up logic is not currently connected to `tenantapp`.

## Current Output Shapes

There are three different output families in the repo:

- `AggregationOutput` in `tenantapp/runtime/contracts/aggregation.ts`
- `DashboardMockData` in `tenantapp/lib/dashboardMockData.ts`
- legacy organization/super-admin metrics returned by `backend/src/app/modules/survey/survey.service.ts`

These shapes are not interchangeable.

## Current Mismatches Blocking Direct Reuse

- legacy backend keys off `organizationId`, not `tenantId`
- no persisted scanner version collection exists
- submissions are not bound to immutable runtime scanner versions
- legacy scoring only supports 4-option questions
- runtime mock scanner already contains 5-option questions
- runtime demographic sets do not match legacy enums
- dashboard UI consumes `DashboardMockData`, not `AggregationOutput`

## Future Aggregation Expectations

The future aggregation engine should:

- read completed submissions bound to one published `scannerVersionId`
- use each question's stored `optionScores`, not a fixed answer-index table
- aggregate per category and per subdomain
- keep tenant isolation on every query
- store materialized snapshots for dashboard use
- preserve anonymity roll-up metadata in the stored output

## Recommended Transition

1. Align persisted survey submissions to the runtime scanner contract.
2. Persist immutable scanner versions before running any runtime-backed aggregation.
3. Replace fixed 4-option scoring with question-bound `optionScores`.
4. Add a mapper from stored aggregation snapshots to the current dashboard view model or refactor the dashboard to read `AggregationOutput` directly.
