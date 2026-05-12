# AI Implementation Context

## Purpose

Use this file as the top-level implementation boundary for future AI agents working on the RemedyGCC platform.

## Naming Conventions

- tenant identity
  Use `tenantId` and `tenantSlug` for the new runtime platform.
- legacy organization identity
  `organizationId` is still used in `frontend` and `backend`. Do not silently treat it as runtime `tenantId` without an explicit migration layer.
- versioned config IDs
  Use `scannerVersionId`, `categoryId`, `subdomainId`, `questionId`, `streamId`, `functionId`, `departmentId`, `locationId`.
- UI field labels
  `label` is presentation text.
- canonical values
  `value` is storage and API-facing canonical data.

## Architectural Boundaries

- `tenantapp`
  Public runtime renderer. It should consume a fully composed runtime contract and should not own business aggregation logic.
- `frontend`
  Legacy admin and organization UI. It currently manages questions, organizations, and surveys, but it does not manage runtime-ready branding or immutable scanner versions.
- `backend`
  Legacy API and persistence layer. It currently stores flat questions and raw survey responses, not runtime-ready versioned configs.
- future database layer
  Must align with `tenantapp/runtime/contracts/*`, not only with legacy `backend` models.
- future aggregation layer
  Must emit stored snapshots that the dashboard can consume without browser-side metric calculation.

## Data Flow Expectations

1. Super admin writes tenant config drafts.
2. A publish step freezes branding, attribute template, and scanner version into immutable runtime-ready records.
3. Runtime config API composes one `TenantRuntimeConfig` for a tenant.
4. Public runtime app renders only from that config.
5. Survey submissions persist against `tenantId` and `scannerVersionId`.
6. Aggregation jobs read completed submissions and emit stored dashboard snapshots.
7. Dashboard routes consume stored snapshots only.

## Forbidden Patterns

- Do not mutate published scanner versions in place.
- Do not keep duplicate hierarchy definitions across runtime, dashboard filters, and backend enums.
- Do not assume every question has exactly 4 options.
- Do not hardcode organization IDs or tenant IDs in public runtime code.
- Do not make the dashboard depend on raw survey responses once aggregation snapshots exist.
- Do not use display labels as canonical database keys.
- Do not derive `questionCount` from user input; derive it from stored questions.
- Do not force `isInverted` at persistence time.

## Required Invariants

- runtime config must be readable even when branding is partial
- every published scanner question must belong to one subdomain and one category
- every follow-up rule must resolve to existing question IDs in the same scanner version
- option-score arrays must match option-array length
- every submission must reference the scanner version that produced the UI
- every persisted record used by runtime or aggregation must be tenant-isolated

## Migration Rules

- Treat the current `backend` question collection as legacy seed data, not as the final scanner-version store.
- Treat the current `organization` collection as legacy tenant-like identity, not as the final runtime tenant contract.
- Preserve old routes until the runtime app has an API-backed replacement path.
- Prefer additive migration over destructive rewrites while both systems coexist.
