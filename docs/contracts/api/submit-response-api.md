# Submit Response API

## Endpoint

```text
POST /api/survey/submit
```

## Purpose

Accept a respondent submission, validate it against the published runtime snapshot, persist an immutable raw response record, and queue aggregation work.

## Request Body

```json
{
  "runtimeConfigId": "runtimecfg_2026_05_10_001",
  "tenantId": "tenant_acme_health",
  "tenantSlug": "acme-health",
  "scannerVersionId": "scanner_v7",
  "attributeTemplateVersionId": "attr_v3",
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
      "questionId": "question_primary_001",
      "questionKind": "primary",
      "answerId": "answer_004",
      "answerScore": 1,
      "answeredAt": "2026-05-10T09:24:26.000Z",
      "timeSpentMs": 14200
    },
    {
      "questionId": "question_followup_004",
      "questionKind": "follow-up",
      "triggerQuestionId": "question_primary_001",
      "answerId": "answer_002",
      "answerScore": -1,
      "answeredAt": "2026-05-10T09:25:09.000Z",
      "timeSpentMs": 8100
    }
  ],
  "completionState": {
    "status": "completed",
    "startedAt": "2026-05-10T09:24:12.000Z",
    "completedAt": "2026-05-10T09:30:00.000Z",
    "totalQuestions": 26,
    "answeredQuestions": 26
  },
  "metadata": {
    "sessionId": "sess_01JTZF57D2T8T1W4P6Q7F8R9SA",
    "inviteToken": "invite_6VEX3A"
  }
}
```

## Request Rules

- `runtimeConfigId` is required.
- `tenantId` and `tenantSlug` must match the resolved runtime config.
- `scannerVersionId` and `attributeTemplateVersionId` are echoed for drift detection and must match the resolved runtime config.
- `calculationVersionId` is not trusted from the frontend; the backend resolves it from `runtimeConfigId`.
- `responses` must use flat rows, not nested follow-up payloads.
- `answerScore` is allowed only as raw configured answer metadata and must match the published answer definition exactly.

## Success Response

```json
{
  "submissionId": "sub_01JTZF5K2F4P7F0QXQ4S8RX8AQ",
  "status": "accepted",
  "submittedAt": "2026-05-10T09:30:00.000Z",
  "versionRefs": {
    "runtimeConfigId": "runtimecfg_2026_05_10_001",
    "scannerVersionId": "scanner_v7",
    "attributeTemplateVersionId": "attr_v3",
    "calculationVersionId": "calc_v1"
  },
  "aggregation": {
    "queued": true
  }
}
```

## Error Response

```json
{
  "error": {
    "code": "VERSION_MISMATCH",
    "message": "Submitted version references do not match the published runtime configuration.",
    "details": {}
  }
}
```

## Backend Responsibilities

- resolve the authoritative published runtime config
- verify question and answer membership against the published scanner version
- verify follow-up rows were validly unlocked
- verify attribute values against the published attribute template
- stamp `submissionId`, `submittedAt`, network metadata, and `calculationVersionId`
- persist the canonical raw response record immutably
- queue aggregation snapshot generation

## Frontend Responsibilities

- submit only raw selections and runtime context
- preserve backend-provided IDs and attribute values exactly
- send follow-up rows only when the published runtime flow exposed them
- handle validation errors without attempting local recalculation

## Forbidden Frontend Behaviors

- calculating scores from answer order
- deriving risk locally
- patching version mismatches client-side
- reading dashboard APIs as a substitute for successful submission persistence
