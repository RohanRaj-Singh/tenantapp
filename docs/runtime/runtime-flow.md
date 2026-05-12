# Runtime App Flow

## Source Files

- `tenantapp/app/layout.tsx`
- `tenantapp/middleware.ts`
- `tenantapp/runtime/context/RuntimeContext.ts`
- `tenantapp/runtime/providers/RuntimeConfigProvider.tsx`
- `tenantapp/runtime/tenant/tenantResolution.ts`
- `tenantapp/runtime/hooks/useRuntimeConfig.ts`
- `tenantapp/runtime/hooks/useRuntimeAttributeForm.ts`
- `tenantapp/runtime/attributes/attributeTemplateUtils.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/runtime/RuntimeAppShell.tsx`
- `tenantapp/components/runtime/RuntimeUnavailableState.tsx`
- `tenantapp/runtime/providers/surveyService.ts`
- `tenantapp/app/api/runtime/current/route.ts`
- `tenantapp/app/api/survey/submit/route.ts`

## App Bootstrap

`tenantapp/app/layout.tsx` wraps the app with:

1. `RuntimeConfigProvider`
2. `RuntimeAppShell`
3. `Header`
4. route content

`RuntimeContext` exposes:

- `config`
- `loading`
- `error`
- `tenantSlug`
- `tenantSource`

Current implementation notes:

- the provider bootstraps from `/api/runtime/current`
- tenant resolution is shared between middleware, the client provider, and server routes
- invalid or unpublished tenants render a runtime-safe unavailable screen
- localhost fallback is preserved without overriding hostname-based requests

## Active Public Survey Path

1. `GET /survey`
2. `RuntimeConfigProvider` loads the published runtime config for the active hostname or localhost fallback tenant
3. `useRuntimeAttributeForm()` resolves the active tenant attribute template
4. runtime validation gates the "Start Survey" action
5. selected attributes are saved to `sessionStorage`
6. `GET /survey-questions`
7. the question route reads the saved runtime attribute session
8. answers are recorded by `questionId`
9. the final step submits a batch payload to `/api/survey/submit`
10. success clears the stored session and shows the thank-you state

## Tenant Resolution

Request resolution order:

1. hostname subdomain
2. localhost query fallback
3. stored local fallback
4. environment fallback

Examples:

- `demo.lvh.me:3001` -> `demo`
- `tenant-b.lvh.me:3001` -> `tenant-b`
- `localhost:3001?tenant=demo` -> `demo`

Middleware attaches the canonical request tenant context for:

- `/api/runtime/current`
- `/api/dashboard/metrics`
- `/api/survey/submit`

## Runtime Safeguards

Implemented safeguards now include:

- host-over-query priority enforcement
- active-tenant-only runtime access
- published runtime config enforcement
- dashboard tenant isolation
- submission host/body/runtime mismatch rejection
- safe unavailable screens for missing or invalid tenant context

## Secondary Survey Path Still Present

`tenantapp/components/survey/SurveyContainer.tsx` remains unmounted.

## Runtime Boundaries

Implemented:

- hostname-based tenant switching
- localhost query fallback
- middleware-backed request tenant context
- published runtime config fetch
- runtime-driven theme injection
- runtime-backed dashboard aggregation fetch
- persisted submission handling with tenant/runtime linkage
- runtime-safe unavailable UX

Not implemented:

- production DNS or wildcard SSL
- super-admin routing changes
- custom-domain tenant routing outside the configured root domain
- runtime authentication behavior from `runtimeSettings`
- infrastructure changes for future production wildcard hosting
