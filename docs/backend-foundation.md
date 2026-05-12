# Backend Foundation

## Implemented Server Structure

```text
src/server/
├── aggregation/
├── api/
├── db/
├── repositories/
├── runtime/
├── seed/
└── services/
```

## Implemented Collections

| Collection | Role | Key Stored References |
| --- | --- | --- |
| `tenants` | Tenant identity, slug, branding snapshot, active runtime config pointer | `tenantId`, `slug`, `brandingVersionId`, `activeRuntimeConfigId` |
| `runtimeConfigs` | Published immutable runtime snapshot consumed by the survey runtime | `runtimeConfigId`, `tenantId`, `tenantSlug`, `scannerVersionId`, `attributeTemplateVersionId`, `calculationVersionId`, `brandingVersionId` |
| `scannerVersions` | Canonical immutable scanner hierarchy | `scannerVersionId`, `tenantId`, `version` |
| `attributeTemplateVersions` | Canonical immutable attribute hierarchy | `attributeTemplateVersionId`, `tenantId`, `version` |
| `rawResponses` | Immutable accepted survey submissions | `submissionId`, `tenantId`, `runtimeConfigId`, immutable version tuple |
| `aggregationSnapshots` | Immutable dashboard-ready read model | `snapshotId`, `tenantId`, `runtimeConfigId`, immutable version tuple, `filterHash` |

## Repository / Service Split

### Repositories

- `TenantsRepository`
  Resolves tenants by slug or stable tenant id and owns tenant indexes.
- `RuntimeConfigsRepository`
  Resolves active or historical runtime config snapshots and owns runtime config indexes.
- `ScannerVersionsRepository`
  Resolves canonical scanner versions and owns scanner version indexes.
- `AttributeTemplateVersionsRepository`
  Resolves canonical attribute template versions and owns template indexes.
- `ResponsesRepository`
  Persists immutable raw submissions and serves aggregation query reads.
- `SnapshotsRepository`
  Persists immutable aggregation snapshots and serves latest-snapshot lookups.

### Services

- `runtimeConfigService`
  Resolves the published runtime payload returned to the tenant app.
- `responseSubmissionService`
  Validates the submission payload, enforces runtime/version drift checks, stores the raw record, and triggers aggregation.
- `aggregationService`
  Loads source submissions for a scope and persists a new aggregation snapshot.
- `dashboardMetricsService`
  Resolves snapshot scope, returns the latest matching snapshot, or generates one on demand.
- `runtimeContextService`
  Centralized tenant + active runtime config resolution shared by runtime, submission, and dashboard APIs.
- `devSeedService`
  Seeds local demo/runtime documents into Mongo in non-production environments when `MONGODB_URI` is available.
- `memoryRepositoryContext`
  Provides a non-production in-memory fallback repository context so runtime loading, submission, and snapshot generation stay safe during local work even when Mongo is unavailable.

## Implemented APIs

### `GET /api/runtime/:tenantSlug`

- resolves the tenant by slug
- loads the active published runtime config from Mongo
- returns the canonical runtime payload with `runtimeConfigId`, `publishedAt`, and immutable `versionRefs`
- supports local dev tenant flow through `localhost:3000?tenant=demo`
- preserves client fallback behavior when Mongo or the runtime API is unavailable

### `POST /api/survey/submit`

- validates required payload shape and timestamps
- validates tenant/runtime/version tuple alignment
- validates attribute selections against the published attribute template
- validates question visibility, answer membership, and answer score drift against the published scanner version
- writes an immutable `rawResponses` document
- generates and stores an initial unfiltered aggregation snapshot

### `GET /api/dashboard/metrics`

- resolves tenant scope from `tenant` query param for local dev or hostname/subdomain for future production routing
- reads `aggregationSnapshots` only for dashboard responses
- normalizes demographic filters and snapshot scope
- returns the latest matching snapshot or generates and stores one if the scope is missing

## Aggregation Flow

```text
runtime config load
-> survey render
-> raw submission validation
-> rawResponses insert
-> aggregation snapshot generation
-> aggregationSnapshots insert
-> dashboard metrics read from snapshot
```

Implemented placeholder calculation boundaries:

- `calculateCategoryMetrics()`
- `calculateSubdomainMetrics()`
- `calculateOverallMetrics()`
- `calculateDemographicMetrics()`
- `generateAggregationSnapshot()`

Current aggregation behavior is intentionally skeleton-safe:

- primary question answer scores are normalized server-side
- follow-up questions are validated and stored, but not treated as final formula inputs
- category, subdomain, overall, and demographic sections are produced with stable contracts
- anonymity metadata is present with a placeholder threshold rule

## Runtime Integration

- `RuntimeConfigProvider` now fetches `/api/runtime/:tenantSlug`
- survey setup persists runtime/session version references
- survey submission now sends the runtime config reference and attribute template version reference
- executive summary and domain dashboard pages now fetch `/api/dashboard/metrics`
- mock runtime and mock dashboard data remain as client fallbacks only

## Environment

- `MONGODB_URI` is now required for the real Mongo-backed flow
- `.env.example` documents the expected local variable
- local development auto-seeds demo runtime documents into Mongo when running outside production
- non-production requests fall back to an in-memory repository context if Mongo is missing or unavailable, so local runtime and submission flows degrade safely

## Known TODOs

- replace placeholder aggregation formulas with the final calculation engine
- enforce dashboard anonymity roll-up behavior beyond the initial threshold metadata
- connect dashboard filter option sources to canonical runtime attribute data
- replace local-dev tenant query fallback with authenticated tenant resolution and wildcard subdomain routing
- add dedicated write orchestration for runtime publishing and historical version browsing
