# Attribute Template Tests

## Scope

- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/runtime/attributes/attributeTemplateUtils.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/runtime/hooks/useRuntimeAttributeForm.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`

## Tested Tenant Matrix

| Tenant | Coverage target | Result |
|---|---|---|
| `tenant-a` | Full hierarchy, full demographics, baseline runtime path | Pass |
| `tenant-b` | Different hierarchy, many-to-many mappings, optional seniority, custom location label | Pass |
| `tenant-c` | Partial hierarchy, invalid references, stream path with empty departments | Pass |
| `tenant-d` | No streams configured | Pass |

## Verified Runtime Scenarios

| Scenario | Observed current behavior | Status |
|---|---|---|
| Stream options sourced from runtime config | `streams[]` renders directly from the active tenant template. | Pass |
| Location options filtered by stream | `locations[].streamIds` narrows the location selector after stream selection. | Pass |
| Department options filtered by stream | `departments[]` narrows immediately after hierarchy unlock. | Pass |
| Function options filtered by department | `functions[]` narrows using department-driven mappings. | Pass |
| Department options filtered by function | Function changes clear incompatible departments and re-filter the department selector. | Pass |
| Parent reset on stream change | Changing `stream` clears `location`, `department`, and `function`. | Pass |
| Parent reset on location change | Changing `location` clears `department` and `function`. | Pass |
| Invalid stored selections sanitized on config change | `sanitizeRuntimeAttributeSelections()` removes stale values when the tenant config changes. | Pass |
| Gender runtime rendering | `genders[]` renders as choice buttons from runtime config. | Pass |
| Age runtime rendering | `ageGroups[]` renders as choice buttons from runtime config. | Pass |
| Seniority runtime rendering | `seniorityLevels[]` renders when enabled, and disappears cleanly when disabled. | Pass |
| Optional fixed attributes | `tenant-b` and `tenant-c` disable `seniority` through `fixedAttributes`. | Pass |
| Empty streams | `tenant-d` blocks start with a safe empty state. | Pass |
| Invalid hierarchy references | Invalid `streamId` and `functionId` references are filtered out instead of crashing the page. | Pass |
| Empty departments for a valid stream | `tenant-c` produces a safe blocking state for the affected stream path. | Pass |
| Submission payload carries attributes | `/survey-questions` reads the saved runtime attributes and includes them in `SurveySubmission.attributes`. | Pass |

## Failures Found And Fixed

1. Inline attribute dependency logic in `/survey` only supported a single hardcoded path.
2. The mounted runtime flow dropped all selected attributes when navigating to `/survey-questions`.
3. The mounted question route tracked only the current answer and did not build a real submission payload.
4. The local submit stub accepted responses without runtime attributes.

## Fixes Applied

- centralized normalization, filtering, reset rules, and validation in `attributeTemplateUtils.ts`
- introduced `useRuntimeAttributeForm()` as the mounted runtime form state layer
- added `surveySession.ts` to persist validated tenant attributes across routes
- updated the active question route to submit answers together with runtime attributes
- expanded mock tenants to cover full, partial, invalid, and empty hierarchy cases

## Remaining Risks

- `DashboardFilters.tsx` still uses a separate hardcoded hierarchy and is not yet synchronized with the runtime survey layer
- follow-up question visibility is still not active in the mounted question route
- the local submit stub validates field presence only and does not enforce scanner membership or answer-index ranges
