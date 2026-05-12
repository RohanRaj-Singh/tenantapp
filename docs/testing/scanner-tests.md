# Scanner Tests

Superseded for active `tenantapp` scanner work by:

- `docs/testing/scanner-runtime-tests.md`
- `docs/testing/scanner-edge-cases.md`
- `docs/testing/scanner-risk-analysis.md`

This file remains a legacy runtime audit snapshot.

## Scope

- `tenantapp/runtime/mocks/mockRuntimeConfig.ts`
- `tenantapp/runtime/mocks/mockScannerVersion.ts`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/survey/SurveyContainer.tsx`
- `backend/src/app/modules/question/question.validation.ts`
- `backend/src/app/modules/question/question.service.ts`
- `backend/src/app/modules/survey/survey.service.ts`

## Automation Status

No automated scanner-version tests exist in the repo.

## Verification Matrix

| Scenario | Observed current behavior | Status |
|---|---|---|
| Runtime scanner with categories/subdomains/questions | Active route renders questions when the flattened list is non-empty. | Pass |
| Missing scanner questions | Active route shows a "No survey questions available" empty state only when the flattened list is empty. | Pass |
| Missing subdomain questions inside a non-empty scanner | Subdomain is silently skipped. | Warn |
| Invalid weights in runtime app | Active route ignores weights. | Warn |
| Invalid weights in legacy backend | Backend accepts numeric weights and uses them directly in scoring. | Warn |
| Follow-up logic in active `tenantapp` route | `followUpRules` are ignored. | Fail |
| Follow-up logic in unused `SurveyContainer` | Structural support exists, but current mock rule targets missing `Q26`. | Warn |
| Broken follow-up mappings | No publish-time validation exists. | Fail |
| 4-option question compatibility with legacy backend | Supported. | Pass |
| 5-option question compatibility with legacy backend | Unsupported because backend scoring only handles indexes `0..3`. | Fail |
| Immutable versioning | No persisted scanner version model or publish history exists. | Fail |
| Publish workflow | Not implemented. | Fail |

## Highest-Risk Findings

- The active runtime route ignores follow-up logic completely.
- The runtime mock scanner already exceeds the legacy backend's 4-option scoring model.
- Scanner versioning is declared in contracts but not implemented in persistence.
