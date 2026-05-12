# Database Preparation Scanner

## Source Files

- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/contracts/scannerCalculations.ts`
- `tenantapp/runtime/contracts/surveySubmission.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/runtime/mocks/mockScannerCatalog.ts`

## Canonical Persistence Boundaries

The database layer should preserve these runtime boundaries:

1. published scanner versions are immutable snapshots
2. question order and answer order are explicit fields
3. answers store explicit scores
4. follow-up triggers are explicit graph records
5. submissions store raw answer selections without frontend-derived formulas

## Recommended Collections

### `tenant_scanner_versions`

One document per immutable published or draft scanner version.

Required fields:

- `id`
- `tenantId`
- `version`
- `status`
- `publishedAt`
- `createdBy`
- `changeLog`
- `categories[]`
- `followUpTriggers[]`

### `tenant_scanner_publications`

One active pointer per tenant.

Required fields:

- `tenantId`
- `activeScannerVersionId`
- `updatedAt`
- `updatedBy`

### `survey_submissions`

One document per respondent submission.

Required fields:

- `tenantId`
- `scannerVersionId`
- `attributes`
- `responses[]`
- `completionState`
- `metadata`
- `createdAt`

### `aggregation_snapshots`

Future derived storage only.

Required fields:

- `tenantId`
- `scannerVersionId`
- `period`
- `categoryMetrics`
- `subdomainMetrics`
- `overallMetrics`
- `computedAt`

## Relationship Expectations

- one tenant can have many scanner versions
- one tenant can have one active published scanner version at a time
- one scanner version owns many categories
- one category owns many subdomains
- one subdomain owns many questions
- one question owns many answers
- one scanner version owns many follow-up triggers
- one submission references exactly one scanner version

## Immutable Versioning Expectations

Publishing must snapshot:

- category tree
- question texts
- answer labels
- answer scores
- answer order
- question order
- follow-up trigger definitions

Never mutate a published scanner version in place.

## Submission Snapshot Strategy

Store raw submission rows as:

```ts
{
  questionId: string;
  answerId: string;
  answerScore: number;
  answeredAt: string;
  timeSpentMs?: number;
}
```

Recommended addition for long-term audit safety:

- store question/category/subdomain label snapshots alongside version IDs when submissions are finalized

## Follow-Up Storage Strategy

Follow-up questions should remain normal questions with `kind: "follow-up"`.

Triggers should be stored separately from questions as:

```ts
{
  id: string;
  triggerQuestionId: string;
  triggerAnswerScores: number[];
  followUpQuestionIds: string[];
}
```

This keeps trigger logic versioned and queryable.

## Recommended Indexes

### `tenant_scanner_versions`

- `{ tenantId: 1, version: 1 }`
- `{ tenantId: 1, status: 1, publishedAt: -1 }`
- unique `{ id: 1 }`

### `tenant_scanner_publications`

- unique `{ tenantId: 1 }`
- `{ activeScannerVersionId: 1 }`

### `survey_submissions`

- `{ tenantId: 1, scannerVersionId: 1, createdAt: -1 }`
- `{ tenantId: 1, "completionState.status": 1, createdAt: -1 }`
- optional compound indexes for filtered aggregation dimensions

## Validation Expectations

Persisted validation should reject:

- duplicate IDs inside a scanner version
- missing numeric order fields
- questions with fewer than two answers
- answers without numeric scores
- invalid trigger references
- triggers pointing to non-follow-up questions
- non-positive weights where weights are required
