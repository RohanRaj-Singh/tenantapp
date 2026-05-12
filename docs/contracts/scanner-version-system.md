# Scanner Version System

## Canonical Status

This document reflects the active scanner runtime in `tenantapp/`.

Canonical source files:

- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/contracts/scannerCalculations.ts`
- `tenantapp/runtime/contracts/surveySubmission.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/runtime/mocks/mockScannerCatalog.ts`
- `tenantapp/runtime/mocks/mockRuntimeConfig.ts`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/survey/SurveyContainer.tsx`

## Active Runtime Shape

`TenantRuntimeConfig.scannerVersion` now uses the canonical shape:

```ts
interface RuntimeScannerVersion {
  id: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
  categories: ScannerCategory[];
  followUpTriggers: ScannerFollowUpTrigger[];
}
```

Hierarchy:

```text
Category
-> Subdomain
-> Question
-> Answers
```

## Category and Subdomain Contracts

Categories and subdomains are now explicit first-class runtime nodes.

```ts
interface ScannerCategory {
  id: string;
  order: number;
  label: string;
  description: string;
  weight: number;
  subdomains: ScannerSubdomain[];
}

interface ScannerSubdomain {
  id: string;
  order: number;
  label: string;
  description: string;
  weight: number;
  questions: ScannerQuestion[];
}
```

Rules:

- `id` must be stable and UUID-style.
- `order` is the only sequencing field.
- `id` is never used for ordering.

## Question Contract

```ts
interface ScannerQuestion {
  id: string;
  order: number;
  questionText: string;
  weight: number;
  kind: "primary" | "follow-up";
  answers: ScannerAnswerOption[];
  helpText?: string;
}
```

Removed legacy fields:

- `options`
- `isInverted`
- `polarity`
- `scoring.optionScores`
- `questionCount`

## Answer Contract

```ts
interface ScannerAnswerOption {
  id: string;
  order: number;
  label: string;
  score: number;
}
```

Runtime behavior:

- answer objects carry explicit score meaning
- answer count is flexible
- neutral options are supported
- frontend does not derive score from answer position

## Follow-Up Trigger Contract

```ts
interface ScannerFollowUpTrigger {
  id: string;
  triggerQuestionId: string;
  triggerAnswerScores: number[];
  followUpQuestionIds: string[];
}
```

Rules:

- follow-up triggers live at scanner-version level
- trigger selection is based on explicit answer scores
- follow-up questions must be declared with `kind: "follow-up"`
- follow-ups remain diagnostic only

## Runtime Processing Path

`tenantapp/runtime/scanner/scannerUtils.ts` is the active scanner runtime boundary.

Current flow:

1. `auditScannerVersion(scannerVersion)`
   validates IDs, orders, answers, weights, and follow-up references
2. invalid nodes are filtered safely
3. runtime warnings are collected in `configurationIssues`
4. `buildSurveyQuestionSequence(auditResult, responses)`
   builds visible primary questions plus triggered follow-ups
5. `toSurveySubmissionResponses(...)`
   emits raw question/answer payload rows

## Multi-Tenant Scanner Variants

Current mock scanners:

- `tenant-a`
  full canonical scanner, multiple categories, 2/3/4/5-option answers, triggered follow-ups
- `tenant-b`
  reduced scanner with different category layout, binary question flow, and shorter follow-up chain
- `tenant-c`
  partial scanner with intentionally imperfect data to verify safe filtering
- `tenant-d`
  minimum valid scanner with one binary question

## Safety Filters

Current runtime drops invalid scanner nodes safely instead of crashing.

Filtered conditions:

- duplicate category IDs
- duplicate subdomain IDs
- duplicate question IDs
- duplicate answer IDs within a question
- missing question text
- invalid or non-positive weights
- missing numeric `order`
- answers missing numeric `score`
- questions with fewer than two valid answers
- triggers pointing to missing questions
- triggers pointing to non-follow-up targets

## Versioning Direction

The runtime is now prepared for immutable versioned storage.

Required persistence boundaries:

- scanner version metadata
- ordered category tree
- ordered answer definitions
- explicit follow-up trigger graph
- submission rows containing `questionId`, `answerId`, and `answerScore`

Legacy OQEP patterns are no longer canonical for `tenantapp`.
