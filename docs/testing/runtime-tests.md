# Runtime Tests

## Scope

- `tenantapp/runtime/providers/RuntimeConfigProvider.tsx`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/runtime/attributes/attributeTemplateUtils.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/survey/SurveyContainer.tsx`
- `tenantapp/app/api/survey/submit/route.ts`

## Automation Status

Verified with:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

No browser automation or integration test suite exists in the repo.

## Verification Matrix

| Scenario | Observed current behavior | Status |
|---|---|---|
| Query-parameter tenant switching | `?tenant=tenant-a|tenant-b|tenant-c|tenant-d` selects the matching mock tenant config. | Pass |
| Local-storage tenant recall | Provider stores the selected tenant slug in `remedygcc-active-tenant`. | Pass |
| Unknown tenant fallback | Unknown slug resolves to `tenant-a`. | Pass |
| Runtime theme injection | CSS variables, font family, and favicon are injected on config change. | Pass |
| Survey intake rendered from runtime attribute template | `/survey` now renders fields from centralized runtime attribute state, not inline mappings. | Pass |
| Attribute persistence into question route | `/survey` stores tenant attributes in `sessionStorage`, and `/survey-questions` rejects missing or stale sessions. | Pass |
| Dynamic question render | Active question route flattens and renders questions from runtime config. | Pass |
| Active runtime submission to API | Active route builds a `SurveySubmission` payload and posts it to `/api/survey/submit`. | Pass |
| Runtime submit validation | The local Next route now rejects missing `attributes` or non-string attribute values. | Pass |
| Unused batch submit path | `SurveyContainer` still is not mounted, but its batch payload now matches the active runtime contract. | Warn |
| Runtime loading/error states | Provider uses mocks only; loading and error are effectively static. | Warn |
| Auth behavior from `runtimeSettings` | Not implemented. | Fail |

## Fixes Applied

- moved attribute hierarchy filtering, resets, and blocking validation into `attributeTemplateUtils.ts`
- added `useRuntimeAttributeForm()` for the mounted `/survey` route
- added `surveySession.ts` to persist validated tenant attributes between routes
- updated `/survey-questions` to record answers by `questionId` and submit the live batch payload
- tightened `/api/survey/submit` to require runtime attributes

## Remaining Risks

- follow-up rules and scoring metadata are still not active in the mounted question route
- runtime state is still mock-backed rather than API-backed
- the dashboard attribute filter hierarchy remains separate from the runtime survey attribute layer
