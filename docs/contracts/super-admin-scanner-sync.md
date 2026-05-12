# Super Admin Scanner Sync

## Source Files

- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/runtime/mocks/mockScannerCatalog.ts`
- `tenantapp/runtime/contracts/scannerCalculations.ts`

## Builder Requirements

The future Super Admin scanner builder must be able to create and edit:

- scanner versions
- categories
- subdomains
- questions
- answers
- follow-up triggers

## Required Field Support

### Scanner version

- `id`
- `version`
- `publishedAt`
- `isActive`

### Category

- `id`
- `order`
- `label`
- `description`
- `weight`

### Subdomain

- `id`
- `order`
- `label`
- `description`
- `weight`

### Question

- `id`
- `order`
- `questionText`
- `weight`
- `kind`
- `helpText`

### Answer

- `id`
- `order`
- `label`
- `score`

### Follow-up trigger

- `id`
- `triggerQuestionId`
- `triggerAnswerScores[]`
- `followUpQuestionIds[]`

## Mandatory Builder Behavior

- generate stable UUID-style IDs
- allow flexible answer counts
- allow neutral scores
- allow arbitrary explicit numeric scores
- keep `order` editable without changing IDs
- allow follow-up question creation inside normal subdomain trees
- allow trigger editing at scanner-version level

## Removed Legacy Builder Concepts

The builder must not depend on:

- `answerIndex`
- `isInverted`
- `options.length === 4`
- `optionScores[]` separate from answers
- dashboard-domain-wide follow-up trigger rules

## Draft Validation Requirements

Draft save and publish validation must reject:

- duplicate IDs
- empty labels
- missing question text
- questions with fewer than two answers
- answers missing score
- non-numeric order values
- invalid trigger references
- triggers that point to primary questions as follow-up targets

## Publish Workflow Expectations

Publishing must:

1. validate the full scanner tree
2. snapshot the scanner immutably
3. freeze answer scores and orders for that version
4. freeze trigger graph for that version
5. update the tenant's active scanner pointer

Edits after publish must create a new version, not mutate the published one.
