# RemedyGCC Implementation Docs

This `docs/` tree is the implementation-facing source of truth for the current repository state.

## Scope

- `tenantapp/`
  Runtime tenant app with mock tenant switching, centralized theme resolution, runtime contracts, mock scanner data, and mock dashboard data.
- `frontend/`
  Legacy admin and organization dashboard app backed by the existing Express API.
- `backend/`
  Legacy organization, question, survey, invitation, and raw aggregation services.

## Current Status

| Area | Status | Notes |
|---|---|---|
| Runtime branding | Implemented in `tenantapp` | Mock tenants, centralized theme helpers, fallback-safe defaults, chart theming, responsive header/sidebar/dashboard surfaces. |
| Runtime tenant config | Implemented with Mongo runtime API | `RuntimeConfigProvider` now loads `GET /api/runtime/:tenantSlug` with local fallback safety and immutable version references. |
| Runtime scanner rendering | Implemented in `tenantapp` | Canonical category/subdomain/question/answer contract, explicit answer scores, flexible answer counts, explicit follow-up triggers, centralized scanner validation, and raw structured submission payloads. |
| Runtime dashboard | Implemented with snapshot API integration | Executive summary and domain dashboards now read `GET /api/dashboard/metrics` with local fallback safety. |
| Response pipeline foundation | Implemented | Mongo repositories/services, immutable raw response persistence, aggregation snapshot generation, and runtime/dashboard APIs are now live in `src/server/`. |
| Super admin questions | Legacy flat CRUD | No scanner versioning, no category/subdomain tree, no publish flow. |
| Database layer aligned to runtime | Implemented for tenant runtime flow | `tenants`, `runtimeConfigs`, `scannerVersions`, `attributeTemplateVersions`, `rawResponses`, and `aggregationSnapshots` are wired into the `tenantapp` backend layer, with a non-production in-memory fallback when Mongo is unavailable. |
| Public runtime APIs | Implemented | `GET /api/runtime/:tenantSlug`, `POST /api/survey/submit`, and `GET /api/dashboard/metrics` now resolve through the repository/service architecture. |
| Immutable scanner publishing | Not implemented | No persisted draft/published scanner version model exists. |

## Document Map

- `runtime/branding-system.md`
  Runtime branding contract, fallback rules, tenant switching, and theming surfaces.
- `runtime/attribute-template-system.md`
  Attribute hierarchy contract, active runtime rendering flow, and current mismatches.
- `runtime/runtime-flow.md`
  Current `tenantapp` route flow, active vs unused survey paths, and integration boundaries.
- `backend-foundation.md`
  Implemented Mongo collections, repository/service boundaries, API behavior, aggregation flow, and remaining backend TODOs.
- `contracts/scanner-version-system.md`
  Active scanner version shape, runtime processing path, and versioning boundaries in `tenantapp`.
- `contracts/canonical-scanner-contract.md`
  Canonical category/subdomain/question/answer hierarchy, stable ID rules, ordering rules, and follow-up trigger contract.
- `contracts/scoring-boundary-contract.md`
  Frontend/runtime calculation boundaries, forbidden scoring patterns, and future aggregation handoff.
- `contracts/canonical-response-contract.md`
  Final immutable raw response record for accepted submissions, including version tuple preservation and follow-up linkage.
- `contracts/canonical-aggregation-contract.md`
  Final immutable aggregation snapshot contract for dashboard consumption and filter-scoped metric reads.
- `contracts/response-storage-strategy.md`
  Canonical separation between runtime configs, raw responses, and aggregation snapshots.
- `contracts/calculation-boundaries.md`
  Final authoritative ownership boundaries between frontend, backend, aggregation, and dashboard layers.
- `contracts/immutable-versioning-strategy.md`
  Immutable runtime version tuple rules covering scanner, attributes, calculation, branding, and runtime config snapshots.
- `contracts/database-preparation-scanner.md`
  Scanner-focused persistence boundaries, immutable versioning expectations, and submission storage guidance.
- `contracts/super-admin-scanner-sync.md`
  Required Super Admin scanner-builder changes for canonical runtime compatibility.
- `contracts/survey-submission-contracts.md`
  Current mounted runtime submit transport shape before the final DB/API layer is implemented.
- `contracts/response-pipeline-edge-cases.md`
  Response pipeline edge-case behavior, DB safeguards, and aggregation safeguards.
- `contracts/super-admin-response-sync.md`
  Super Admin requirements for immutable publishing, runtime snapshots, and future calculation versioning.
- `contracts/edge-cases.md`
  Current edge-case behavior, expected behavior, and required DB/API safeguards.
- `contracts/api/submit-response-api.md`
  Preparation contract for `POST /api/survey/submit`.
- `contracts/api/runtime-config-api.md`
  Preparation contract for `GET /api/runtime/:tenantSlug`.
- `contracts/api/dashboard-metrics-api.md`
  Preparation contract for `GET /api/dashboard/metrics`.
- `contracts/ai-implementation-context.md`
  Global implementation rules for future AI agents.
- `aggregation/dashboard-runtime-system.md`
  Current dashboard runtime data shapes, filter behavior, chart inputs, and branding integration.
- `aggregation/aggregation-preparation.md`
  Existing raw aggregation logic in `backend` and the gaps to the runtime dashboard contract.
- `database/database-preparation.md`
  Recommended collections, relationships, indexes, tenant isolation, and immutable version strategy.
- `database/response-collections.md`
  Recommended Mongo collections, relationships, indexes, and query expectations for the response pipeline.
- `database/aggregation-storage-strategy.md`
  Precomputed snapshot write strategy, dashboard optimization, and aggregation update behavior.
- `database/ai-schema-context.md`
  Schema-generation instructions for future DB/API work.
- `super-admin/current-surface-and-gaps.md`
  Current admin modules and the exact CRUD/publishing gaps relative to the runtime app.
- `super-admin/ai-super-admin-context.md`
  Super admin implementation rules for future AI agents.
- `testing/branding-tests.md`
  Branding verification matrix for mock tenants and fallback behavior.
- `testing/scanner-tests.md`
  Scanner validation and follow-up test report.
- `testing/scanner-runtime-tests.md`
  Canonical scanner runtime verification matrix for multi-tenant rendering, follow-up behavior, flexible answer counts, and payload shape.
- `testing/scanner-edge-cases.md`
  Scanner-specific invalid-config and partial-config handling behavior.
- `testing/scanner-risk-analysis.md`
  Removed legacy OQEP risks plus remaining implementation risks before DB/API work.
- `testing/runtime-tests.md`
  Runtime tenant switching and rendering test report.
- `testing/attribute-template-tests.md`
  Attribute-template hierarchy, validation, empty-state, and payload verification report.
- `testing/dashboard-tests.md`
  Dashboard rendering, filtering, chart, and empty-state test report.

## Next Phases

1. Replace placeholder aggregation logic with the final calculation engine and privacy roll-up rules.
2. Connect dashboard filter option sources to the canonical tenant attribute template instead of the legacy hardcoded filter hierarchy.
3. Implement publish/write orchestration for scanner versions, attribute templates, branding versions, and runtime config snapshots.
4. Add authenticated tenant resolution for dashboard scope and complete wildcard subdomain routing.
5. Extend testing around Mongo-backed runtime loading, submission persistence, and snapshot reads.
