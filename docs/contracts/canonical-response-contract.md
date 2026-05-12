# Canonical Response Contract

## Source Files

- `tenantapp/runtime/contracts/surveySubmission.ts`
- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/contracts/runtime.ts`
- `docs/contracts/canonical-scanner-contract.md`
- `docs/contracts/immutable-versioning-strategy.md`

## Purpose

This document defines the final raw response record for the response pipeline preparation phase.

`rawResponses` is the immutable truth layer.
It stores what the respondent submitted, which published runtime snapshot rendered the survey, and which version tuple must be preserved forever.

## Canonical Persisted Record

```json
{
  "submissionId": "sub_01JTZF5K2F4P7F0QXQ4S8RX8AQ",
  "tenantId": "tenant_acme_health",
  "runtimeConfigId": "runtimecfg_2026_05_10_001",
  "scannerVersionId": "scanner_v7",
  "attributeTemplateVersionId": "attr_v3",
  "calculationVersionId": "calc_v1",
  "submittedAt": "2026-05-10T09:30:00.000Z",
  "completionState": {
    "status": "completed",
    "startedAt": "2026-05-10T09:24:12.000Z",
    "completedAt": "2026-05-10T09:30:00.000Z",
    "totalQuestions": 26,
    "answeredQuestions": 26
  },
  "attributes": {
    "stream": "clinical_services",
    "location": "central_campus",
    "function": "care_delivery",
    "department": "patient_services",
    "gender": "female",
    "age": "25-34",
    "seniority": "manager"
  },
  "responses": [
    {
      "responseId": "resp_01JTZF5K6SE4R2G2JVXW6Q8FMH",
      "questionId": "question_primary_001",
      "questionKind": "primary",
      "answerId": "answer_004",
      "answerScore": 1,
      "answeredAt": "2026-05-10T09:24:26.000Z",
      "timeSpentMs": 14200
    },
    {
      "responseId": "resp_01JTZF5K8FQ4JWE4S6D42C4HRP",
      "questionId": "question_followup_004",
      "questionKind": "follow-up",
      "triggerQuestionId": "question_primary_001",
      "answerId": "answer_002",
      "answerScore": -1,
      "answeredAt": "2026-05-10T09:25:09.000Z",
      "timeSpentMs": 8100
    }
  ],
  "metadata": {
    "sessionId": "sess_01JTZF57D2T8T1W4P6Q7F8R9SA",
    "inviteToken": "invite_6VEX3A",
    "userAgent": "Mozilla/5.0",
    "ipAddress": "203.0.113.10"
  },
  "snapshotRefs": {
    "brandingVersionId": "brand_v2"
  }
}
```

## Canonical Rules

- `rawResponses` stores flat response rows.
- Follow-up answers remain first-class responses with `questionKind: "follow-up"`.
- `triggerQuestionId` links a follow-up response to the primary question that unlocked it.
- Persisted records do not nest `followUpResponses[]`.
- If any frontend transport shape groups follow-ups, the API must flatten and validate it before persistence.

## Top-Level Field Purposes

| Field | Type | Purpose | Notes |
| --- | --- | --- | --- |
| `submissionId` | `string` | Immutable ID for the accepted raw record | Unique across `rawResponses` |
| `tenantId` | `string` | Tenant isolation key | Required on every response record |
| `runtimeConfigId` | `string` | Published runtime snapshot used by the respondent | Composition pointer for runtime audit |
| `scannerVersionId` | `string` | Immutable scanner tree used at submission time | Never rewritten after accept |
| `attributeTemplateVersionId` | `string` | Immutable attribute template used at submission time | Locks filter vocabulary and dependencies |
| `calculationVersionId` | `string` | Calculation contract version bound at submission time | Frontend never derives formulas from it |
| `submittedAt` | `string` | Server acceptance timestamp | Canonical persistence timestamp |
| `completionState` | `object` | Submission progress summary | `aggregationSnapshots` use only completed records unless a future metric explicitly opts in |
| `attributes` | `object` | Normalized selected attribute values | Store template `value` strings, not labels |
| `responses` | `array` | Raw answer selections | Ordered by respondent completion order |
| `metadata` | `object` | Operational audit metadata | Client may send partial values, backend stamps authoritative network metadata |
| `snapshotRefs` | `object` | Additional immutable version references | `brandingVersionId` is audit-facing, not calculation-facing |

## Response Row Purposes

| Field | Type | Purpose | Notes |
| --- | --- | --- | --- |
| `responseId` | `string` | Immutable row identifier inside a submission | Useful for audit and debugging |
| `questionId` | `string` | Published question ID from the scanner version | Must belong to `scannerVersionId` |
| `questionKind` | `"primary" \| "follow-up"` | Preserves question role at submission time | Aggregation can exclude follow-ups where required |
| `triggerQuestionId` | `string` | Primary question that unlocked a follow-up | Omit for primary rows |
| `answerId` | `string` | Published answer ID | Must belong to the submitted question |
| `answerScore` | `number` | Raw answer metadata selected by the respondent | Backend validates against the published answer object |
| `answeredAt` | `string` | Client-side answer timestamp | Preserved for sequencing and audit |
| `timeSpentMs` | `number` | Optional UX timing signal | Never used as a calculation formula input by default |

## Immutable Rules

- Never update `responses`, `attributes`, or version IDs after a raw record is accepted.
- Never overwrite `answerScore` because of later formula changes.
- Never hard-delete a raw record that is already referenced by an aggregation snapshot or audit trail.
- Administrative corrections must create a new accepted record with a new `submissionId`; the original record remains retained.

## Snapshot Expectations

- `runtimeConfigId` must resolve to the published runtime composition that served the survey.
- `scannerVersionId`, `attributeTemplateVersionId`, and `calculationVersionId` must always match the resolved runtime config snapshot.
- `brandingVersionId` is retained so historical exports can reconstruct the respondent-facing experience without affecting scoring.

## Frontend Responsibilities

- Render only from the published runtime config payload.
- Submit selected `questionId`, `answerId`, and raw configured `answerScore`.
- Preserve runtime attribute `value` strings exactly as delivered by the backend.
- Preserve follow-up linkage context if the UI reveals follow-up questions.

## Backend Responsibilities

- Resolve the authoritative runtime config snapshot by `runtimeConfigId` and tenant context.
- Validate that every `questionId` and `answerId` belongs to the published `scannerVersionId`.
- Validate that every `answerScore` matches the published answer metadata.
- Stamp `submissionId`, `submittedAt`, `calculationVersionId`, and authoritative request metadata.
- Persist the accepted record immutably and hand it off to the aggregation pipeline.

## Forbidden Patterns

- Frontend-derived score formulas
- Runtime mutation of historical raw records
- Persisting dashboard-ready metrics inside `rawResponses`
- Treating `aggregationSnapshots` as the source of truth for what a respondent answered
