# Scanner Runtime Tests

## Scope

Source files:

- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/scanner/scannerUtils.ts`
- `tenantapp/runtime/mocks/mockScannerCatalog.ts`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/app/api/survey/submit/route.ts`

## Verification Summary

Verified through implementation audit plus local `tenantapp` typecheck and lint:

- explicit answer-score runtime contract is active
- `answerIndex` runtime submission path is removed
- `isInverted` runtime usage is removed
- variable answer counts render safely
- explicit follow-up triggers are active
- scanner-version session mismatch is blocked safely

## Scenario Matrix

### Tenant A

- scanner contains 5 categories
- runtime renders 2, 3, 4, and 5-option questions
- burnout follow-up appears only when the burnout trigger question is answered with score `-2` or `-1`
- psychological-safety follow-up appears only when the trigger question is answered with score `-2`
- follow-up questions are labeled as diagnostic runtime prompts

### Tenant B

- runtime supports a different scanner structure with fewer categories
- a 2-option operational-pressure question renders safely
- a 3-option follow-up question renders safely after trigger activation
- category/subdomain layout differs from Tenant A without requiring UI changes

### Tenant C

- duplicate answer IDs are filtered safely
- invalid trigger references are ignored safely
- orphan follow-up questions remain hidden
- empty category shells do not crash rendering
- runtime warning banner surfaces configuration issues

### Tenant D

- minimum valid scanner with one binary question is accepted by the runtime

## Payload Verification

Current submission payload rows are:

```json
{
  "questionId": "",
  "answerId": "",
  "answerScore": 1
}
```

Additional runtime fields:

- `answeredAt`
- optional `timeSpentMs`

No frontend aggregate score or risk value is submitted.

## Validation Verification

- questions without at least two valid answers are dropped
- invalid weights drop the affected question
- invalid order values drop the affected question
- stale scanner sessions force the user back to `/survey`
- empty scanner output shows a safe empty state instead of crashing

## Remaining Gaps

- no automated end-to-end scanner tests exist yet
- no persisted API validates question membership against a published scanner version yet
- calculation-layer formulas are intentionally not implemented yet
