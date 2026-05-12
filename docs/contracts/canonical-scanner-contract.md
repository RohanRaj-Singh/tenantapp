# Canonical Scanner Contract

## Source Files

- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/mocks/mockScannerCatalog.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/survey/SurveyContainer.tsx`

## Canonical Hierarchy

```text
Category
-> Subdomain
-> Question
-> Answers
```

The active runtime no longer uses:

- answer-position scoring
- `isInverted`
- hardcoded 4-option questions
- subdomain-local follow-up rules
- question ordering derived from IDs

## Runtime Scanner Version

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

## Category Contract

```ts
interface ScannerCategory {
  id: string;
  order: number;
  label: string;
  description: string;
  weight: number;
  subdomains: ScannerSubdomain[];
}
```

Requirements:

- `id` must be stable and UUID-style
- `order` must be explicit and numeric
- `label` is display text
- `weight` is preserved for future calculation layers

## Subdomain Contract

```ts
interface ScannerSubdomain {
  id: string;
  order: number;
  label: string;
  description: string;
  weight: number;
  questions: ScannerQuestion[];
}
```

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

Rules:

- `kind: "primary"` questions are part of the primary survey path
- `kind: "follow-up"` questions are diagnostic only
- follow-up questions are hidden until a trigger activates them

## Answer Contract

```ts
interface ScannerAnswerOption {
  id: string;
  order: number;
  label: string;
  score: number;
}
```

Rules:

- answers own score meaning directly
- any explicit score values are allowed
- neutral scores are supported
- answer count is flexible
- order is explicit and separate from `id`

Current runtime supports:

- 2-option questions
- 3-option questions
- 4-option questions
- 5-option questions

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

- trigger evaluation is based on explicit answer scores
- trigger question must be a primary question
- target questions must be follow-up questions
- follow-ups do not affect primary scoring

## Stable ID Rules

All of these must use stable UUID-style IDs:

- scanner versions
- categories
- subdomains
- questions
- answers
- follow-up triggers

Forbidden:

- `Q1`, `Q2`
- `cat-1`, `sub-2`
- position-derived identifiers

## Ordering Rules

Every ordered entity must carry its own `order` field.

Ordering must never depend on:

- ID lexicographic order
- array insertion order alone
- question text

Current runtime sequence:

- categories sorted by `category.order`
- subdomains sorted by `subdomain.order`
- questions sorted by `question.order`
- answers sorted by `answer.order`

## Runtime Safety Layer

`auditScannerVersion(...)` is the active validation boundary.

It filters:

- duplicate IDs
- missing question text
- invalid weights
- invalid orders
- missing answer scores
- questions with fewer than two valid answers
- invalid follow-up trigger references

Warnings surface to the runtime UI through `configurationIssues`.
