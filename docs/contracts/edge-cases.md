# Edge Cases

## Source Files

- `tenantapp/runtime/theme/themeUtils.ts`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/runtime/attributes/attributeTemplateUtils.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/survey/SurveyContainer.tsx`
- `tenantapp/components/dashboard/filter/DashboardFilters.tsx`
- `tenantapp/components/dashboard/DomainDashboardPage.tsx`
- `tenantapp/app/api/survey/submit/route.ts`
- `backend/src/app/modules/question/question.validation.ts`
- `backend/src/app/modules/survey/survey.service.ts`

## Edge-Case Matrix

| Case | Current behavior | Expected behavior | Required safeguard |
|---|---|---|---|
| Missing branding config | Safe. `withBrandingDefaults()` injects default logo, colors, font, favicon, and tenant name. | Safe. UI should always render with resolved theme fields. | Persist normalized branding fields or normalize on read before UI render. |
| Partial branding config | Safe. Missing secondary color and other fields are derived or defaulted. | Safe. Partial admin payloads must not break the runtime app. | Validate hex colors, allow partial updates, normalize before publish. |
| Unknown tenant slug | Safe. `resolveMockTenantSlug()` falls back to `tenant-a`. | Safe, but production should return a controlled tenant-not-found path. | Add tenant lookup + 404 handling in API layer. |
| No streams configured | Safe. `tenant-d` renders an empty stream selector with a blocking empty-state message. | Safe blocked state. | Validate publish-time templates contain at least one stream for active tenants. |
| Partial hierarchy with broken references | Safe. Invalid function and department mappings in `tenant-c` are filtered out during normalization. | Safe render plus publish-time rejection. | Validate stream/function/department references before publish and log rejected edges. |
| Empty departments for a valid stream | Safe. The survey form renders a blocking empty state when the current hierarchy resolves to no departments. | Safe blocked state. | Validate every published stream path exposes at least one department and one function. |
| Missing demographic arrays | Safe. The field disables by default unless `fixedAttributes` explicitly forces it on. | Safe optional omission or explicit admin error. | Persist `enabled` and `required` flags with every fixed attribute definition. |
| Enabled fixed attribute with no options | Safe. The field renders an explicit empty state and blocks progression. | Safe blocked state. | Reject publish if `enabled === true` and the options list is empty. |
| Invalid stored survey session | Safe. `surveySession.ts` clears malformed session payloads. | Safe recovery state. | Add session versioning if the runtime contract evolves. |
| Attribute session missing on `/survey-questions` | Safe. The page renders a recovery card and links back to `/survey`. | Safe recovery state. | Create a start-survey session record once a backend exists. |
| Runtime submit payload missing attributes | Safe. The local Next route rejects missing or non-string `attributes`. | Safe rejection. | Add schema validation for all submission sections, not just top-level presence. |
| Missing scanner categories or all questions | `tenantapp/app/survey-questions/page.tsx` shows "No survey questions available" when the flattened question list is empty. | Safe empty state. | Validate published scanners contain at least one category, subdomain, and question. |
| Broken follow-up mapping | Active route still ignores follow-up rules. Unmounted `SurveyContainer` can reveal only mapped IDs that exist in its own question list. | Broken mappings should fail validation before publish. | Validate `triggerQuestionId` and every `followUpQuestionId` against the same scanner version. |
| Empty dashboard age or department arrays | `AgeGroupAnalysis` and `DepartmentAnalysis` show explicit empty states. | Safe. | Keep empty-state support when moving to API data. |
| Empty dashboard location or department arrays in domain pages | Unsafe. `DomainDashboardPage` still dereferences top items without guarding for empty arrays. | Safe empty state instead of runtime failure. | Guard derived top items before dereferencing. |

## Highest-Risk Current Divergences

- The mounted survey route still ignores `followUpRules`, `weight`, and scoring data.
- The dashboard filter hierarchy is still hardcoded and not yet aligned with runtime attribute templates.
- The runtime payload uses canonical value strings, while legacy backend contracts still assume a different shape and enum set.
