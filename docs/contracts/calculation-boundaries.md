# Calculation Boundaries

## Source Files

- `tenantapp/runtime/contracts/scannerCalculations.ts`
- `tenantapp/runtime/contracts/surveySubmission.ts`
- `docs/contracts/canonical-response-contract.md`
- `docs/contracts/canonical-aggregation-contract.md`

## Canonical Ownership

```text
frontend
-> submit validated raw payload only
backend
-> accept and persist immutable raw response
aggregation engine
-> calculate and persist immutable snapshot
dashboard
-> read snapshot only
```

## Frontend Forbidden Responsibilities

The frontend must not:

- calculate category scores
- calculate subdomain scores
- calculate overall scores
- calculate risk status
- normalize answer scores from answer position
- infer missing answers
- aggregate demographic slices
- apply anonymity roll-up rules

## Backend Calculation Ownership

The backend owns:

- submission validation against the published runtime config
- authoritative answer score verification
- resolution of `calculationVersionId`
- handing accepted raw records to the aggregation layer

The submit API is allowed to validate.
The submit API is not allowed to embed ad hoc dashboard formulas into request handlers.

## Aggregation Engine Ownership

The aggregation engine owns:

- category metric calculation
- subdomain metric calculation
- overall metric calculation
- demographic aggregation
- privacy threshold enforcement
- snapshot materialization

## Dashboard Read-Only Behavior

The dashboard:

- reads `aggregationSnapshots`
- renders labels and values supplied by the backend
- displays privacy roll-up state when returned

The dashboard must not:

- query `rawResponses`
- rebuild metrics from response rows
- infer risk color thresholds as authoritative business logic
- merge partial client-side aggregates into server metrics

## Interface Examples

```ts
export interface CanonicalCalculationInput {
  tenantId: string;
  runtimeConfigId: string;
  scannerVersionId: string;
  attributeTemplateVersionId: string;
  calculationVersionId: string;
  attributes: Record<string, string>;
  responses: Array<{
    questionId: string;
    questionKind: "primary" | "follow-up";
    answerId: string;
    answerScore: number;
    triggerQuestionId?: string;
  }>;
}

export function calculateCategoryMetrics(
  input: CanonicalCalculationInput,
): CategoryMetricSnapshot[] {}

export function calculateSubdomainMetrics(
  input: CanonicalCalculationInput,
): SubdomainMetricSnapshot[] {}

export function calculateOverallMetrics(
  input: CanonicalCalculationInput,
): OverallMetricSnapshot {}
```

## Boundary Rules

- Interface shapes may evolve.
- Formula internals must stay behind the calculation layer.
- Frontend contracts may carry raw configured `answerScore`, but that does not authorize frontend formulas.
- Follow-up responses remain visible to the calculation layer, but whether they affect primary metrics is a backend rule, not a UI rule.
