# Database Preparation

## Source Files

- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/contracts/scannerVersion.ts`
- `tenantapp/runtime/contracts/surveySubmission.ts`
- `tenantapp/runtime/contracts/aggregation.ts`
- `backend/src/app/modules/organization/organization.model.ts`
- `backend/src/app/modules/question/question.model.ts`
- `backend/src/app/modules/survey/survey.model.ts`
- `backend/src/app/modules/survey/employeeInvite.model.ts`
- `backend/src/app/modules/survey/surveyReference.model.ts`

## Current Persisted Models

The repo already persists:

- `organization`
- `questions`
- `SurveyResponse`
- `employee_invites`
- `survey_references`

These models support the legacy survey system only.

## Why the Current Models Are Not Enough

- `organization` lacks runtime tenant fields such as `slug`, `status`, `plan`, and active scanner pointers.
- branding is not stored as a first-class runtime document.
- attribute templates are split across code, enums, and reference tables, not one runtime contract.
- scanner data is flat in `questions`, not versioned.
- published scanner immutability does not exist.
- survey submissions are not bound to a versioned runtime scanner contract.
- dashboard snapshots are not stored as `AggregationOutput`.

## Recommended Collections

| Collection | Purpose | Notes |
|---|---|---|
| `tenants` | Runtime tenant registry | Can be introduced by migrating or extending the current `organization` concept. |
| `tenant_branding_configs` | Branding payload for runtime config composition | One active document per tenant or embedded in a tenant config draft. |
| `tenant_attribute_templates` | Streams, locations, functions, departments, demographics | One published template per tenant version. |
| `scanner_versions` | Immutable scanner definitions | Store the full tree: categories, subdomains, questions, follow-up rules, scoring. |
| `scanner_publications` | Publish metadata and active pointers | Optional separate collection if draft/publish history must be tracked independently. |
| `survey_sessions` | Started survey metadata before completion | Needed if the public runtime keeps multi-step progress. |
| `survey_submissions` | Completed or in-progress answers from the runtime app | Store `tenantId`, `scannerVersionId`, attributes, answers, and metadata. |
| `dashboard_aggregations` | Materialized aggregation snapshots | Store a tenant-scoped, version-scoped snapshot aligned to dashboard reads. |
| `employee_invites` | Invitation and token flow | Existing model can evolve, but must become tenant/scanner aware. |

## Recommended Relationships

- `tenants 1 -> many scanner_versions`
- `tenants 1 -> many survey_submissions`
- `tenants 1 -> many dashboard_aggregations`
- `tenants 1 -> one active branding config`
- `tenants 1 -> one active attribute template`
- `survey_submissions many -> one scanner_version`
- `dashboard_aggregations many -> one scanner_version`

## Recommended Indexes

### `tenants`

- unique `{ slug: 1 }`
- `{ status: 1 }`

### `tenant_branding_configs`

- unique `{ tenantId: 1, isActive: 1 }` or unique `{ tenantId: 1, version: 1 }`

### `tenant_attribute_templates`

- unique `{ tenantId: 1, version: 1 }`
- `{ tenantId: 1, publishedAt: -1 }`

### `scanner_versions`

- unique `{ tenantId: 1, version: 1 }`
- `{ tenantId: 1, publishedAt: -1 }`
- `{ tenantId: 1, isActive: 1 }` if active state lives on this collection

### `survey_submissions`

- `{ tenantId: 1, scannerVersionId: 1, createdAt: -1 }`
- `{ tenantId: 1, status: 1, createdAt: -1 }`
- `{ tenantId: 1, "attributes.streamId": 1 }`
- `{ tenantId: 1, "attributes.locationId": 1 }`
- `{ tenantId: 1, "attributes.functionId": 1 }`
- `{ tenantId: 1, "attributes.departmentId": 1 }`

### `dashboard_aggregations`

- `{ tenantId: 1, scannerVersionId: 1, computedAt: -1 }`
- unique `{ tenantId: 1, scannerVersionId: 1, periodFrom: 1, periodTo: 1, filterHash: 1 }`

## Immutable Version Strategy

- Draft versions may be edited.
- Published scanner versions must never be mutated.
- A new publish creates a full new scanner version document.
- Every survey submission stores the exact `scannerVersionId` used to render the UI.
- Every aggregation snapshot stores the exact `scannerVersionId` it summarizes.

## Tenant Isolation Strategy

- Every runtime-facing collection must contain `tenantId`.
- Runtime APIs must resolve tenant by slug before reading config or submissions.
- Aggregation jobs must always filter by `tenantId`.
- Super-admin queries may span tenants, but organization dashboard queries must not.
- Legacy `organizationId` must not remain the only partition key if the new runtime is introduced.

## Aggregation Storage Strategy

Store materialized dashboard snapshots instead of recomputing on every page load.

Recommended snapshot metadata:

- `tenantId`
- `scannerVersionId`
- `computedAt`
- `period`
- `filterHash`
- `anonymityCompliance`
- `payload`

`payload` should either:

- be stored as `AggregationOutput`, then mapped at read time
- or be stored in a dashboard-ready shape with a strict mapper from the runtime aggregation contract

## Existing Models That Can Be Reused Carefully

- `employee_invites`
  Useful for token flow, but currently stores legacy demographic enums and `organizationId`.
- `survey_references`
  Useful as a migration aid, but it is not the final runtime attribute-template model.

## Existing Models That Should Not Become the Final Runtime Contract

- `questions`
  Flat, non-versioned, 4-option-biased.
- `organization`
  Login-focused and missing runtime config fields.
- `SurveyResponse`
  Bound to legacy enums and legacy question IDs rather than published runtime scanner versions.
