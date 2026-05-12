# Follow-Up System

Superseded for active `tenantapp` runtime work by:

- `docs/contracts/canonical-scanner-contract.md`
- `docs/contracts/scoring-boundary-contract.md`

This file remains a legacy audit snapshot from the older OQEP structure.

## Scope

This document describes the implemented follow-up behavior found in:

- `backend/src/app/modules/question/question.interface.ts`
- `backend/src/app/modules/question/question.service.ts`
- `backend/src/app/modules/survey/survey.model.ts`
- `backend/src/app/modules/survey/survey.service.ts`
- `frontend/src/components/landing/surveyQuestions/SurveyFlow.tsx`
- `frontend/src/components/landing/surveyQuestions/NewSurveyFlow.tsx`

## Follow-Up Question Contract

Follow-up questions are regular questions with:

```ts
isFollowUp: true
```

They still carry:

- `id`
- `question`
- `options`
- `domain`
- `weight`
- `dashboardDomain`

There is no separate follow-up relation model and no explicit trigger map on the question.

## Main to Follow-Up Transition

Runtime survey flow is:

```text
start survey
-> answer all main questions
-> calculate domain risk counts
-> choose follow-up questions for risky dashboard domains
-> answer follow-up questions
-> complete survey
```

Follow-ups do not interleave with main questions.

## Actual Trigger Logic

Follow-ups are not selected by question id.
Follow-ups are not selected by answer label.
Follow-ups are not selected by subdomain.

Current backend logic:

```ts
riskyDomains = dashboard domains where riskCount >= 2
followUps = all questions where isFollowUp === true and dashboardDomain in riskyDomains
```

Risk count basis:

- only main questions contribute
- `answerIndex` `0` or `1` increments the domain risk count

Implications:

- a domain with two low-position answers unlocks all of its follow-up questions
- a domain with one severe weighted answer does not unlock follow-ups unless risk count reaches `2`
- question weight does not affect follow-up triggering

## Current Follow-Up Inventory

Current follow-up questions in backend seed:

| Question id | Domain | Dashboard domain | Weight |
| --- | --- | --- | ---: |
| `Q26` | `Burnout` | `Clinical Risk Index` | `10` |
| `Q27` | `Depression Severity` | `Clinical Risk Index` | `10` |
| `Q28` | `Anxiety Severity` | `Clinical Risk Index` | `10` |
| `Q29` | `Anxiety Symptom` | `Clinical Risk Index` | `5` |
| `Q30` | `Health Impact` | `Satisfaction & Engagement` | `5` |
| `Q31` | `Root Cause Intensity` | `Workload & Efficiency` | `5` |
| `Q32` | `Fear/Blame Intensity` | `Psychological Safety Index` | `5` |
| `Q33` | `Trust Refinement` | `Psychological Safety Index` | `3` |

`Leadership & Alignment` currently has no follow-up questions.

## Storage Behavior

Survey documents store follow-up progression separately:

```ts
followUpQuestions: ObjectId[]
responses: Array<{
  question: ObjectId;
  answerIndex: number;
  score: number;
}>
```

Important behavior:

- follow-up question ids are persisted after main-question completion
- follow-up responses are stored in the same `responses` array as main responses
- there is no separate follow-up response collection

## Ordering Behavior

Follow-up ordering is based on question id sorting:

```ts
sort({ id: 1 })
```

This means:

- `Q26` appears before `Q27`
- order is global within selected dashboard domains
- there is no explicit per-domain follow-up sequence field

## Scoring Behavior

Follow-ups receive normal stored scores:

```ts
score = ANSWER_INDEX_SCORES[answerIndex]
```

But current runtime excludes follow-up responses from primary scoring outputs.

Confirmed exclusions:

- `domainRisks` only count main questions
- `highRiskCount` only counts main questions
- `getSurveyResult` filters out `isFollowUp === true`
- dashboard subdomain/domain aggregations skip follow-up questions

Current functional meaning:

- follow-ups are collected as secondary diagnostic data
- follow-ups do not change the main domain score outputs

## Frontend Runtime Behavior

Frontend does not contain its own follow-up trigger logic.

Current frontend role:

- render `nextQuestion` from backend
- submit selected `answerIndex`
- continue until backend returns completion state

The backend is the only active source of follow-up selection.

## Follow-Up Risks

- There is no explicit trigger-to-follow-up mapping.
- Follow-up inclusion is domain-wide, not question-specific.
- Follow-up severity is not incorporated into current domain scoring.
- `Leadership & Alignment` has no follow-up path.
- The system cannot distinguish informational follow-ups from scored follow-ups because both use the same question contract.

## DB Boundary Notes

For database implementation, current runtime behavior requires:

- versioned storage of follow-up questions in the same scanner version as main questions
- explicit persistence of follow-up flag
- explicit persistence of follow-up ordering
- a separate trigger definition layer if future behavior must move from domain-wide triggers to question-specific triggers
- a decision on whether follow-up answers remain non-scoring or become part of derived metrics
