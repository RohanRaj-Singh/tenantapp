# Response Collections

## Source Files

- `docs/contracts/canonical-response-contract.md`
- `docs/contracts/canonical-aggregation-contract.md`
- `docs/contracts/immutable-versioning-strategy.md`
- `docs/runtime/runtime-flow.md`

## Recommended Collections

| Collection | Purpose | Core References |
| --- | --- | --- |
| `rawResponses` | Immutable accepted response records | `runtimeConfigId`, `scannerVersionId`, `attributeTemplateVersionId`, `calculationVersionId` |
| `aggregationSnapshots` | Immutable dashboard-ready derived metrics | `runtimeConfigId`, `scannerVersionId`, `attributeTemplateVersionId`, `calculationVersionId` |
| `runtimeConfigs` | Immutable published runtime compositions | `scannerVersionId`, `attributeTemplateVersionId`, `calculationVersionId`, `brandingVersionId` |
| `scannerVersions` | Immutable published scanner trees | `tenantId`, `version` |
| `attributeTemplateVersions` | Immutable published attribute templates | `tenantId`, `version` |

`calculationVersionId` and `brandingVersionId` are required references even if their dedicated collections are introduced in a later phase.

## Relationship Expectations

```text
runtimeConfigs
-> scannerVersions
-> attributeTemplateVersions

rawResponses
-> runtimeConfigs
-> scannerVersions
-> attributeTemplateVersions

aggregationSnapshots
-> rawResponses
-> runtimeConfigs
-> scannerVersions
-> attributeTemplateVersions
```

Operationally:

- one tenant has many `runtimeConfigs`
- one tenant has many `scannerVersions`
- one tenant has many `attributeTemplateVersions`
- one `runtimeConfigId` points to one published version tuple
- many `rawResponses` may reference the same `runtimeConfigId`
- many `aggregationSnapshots` may summarize the same version tuple across different periods and filters

## Query Expectations

### `runtimeConfigs`

Primary queries:

- resolve active runtime config by `tenantSlug`
- resolve historical runtime config by `runtimeConfigId`
- list published runtime configs for tenant audit

Recommended indexes:

- unique `{ runtimeConfigId: 1 }`
- partial unique `{ tenantSlug: 1 }` where `{ isActive: true }`
- `{ tenantId: 1, publishedAt: -1 }`
- `{ tenantId: 1, scannerVersionId: 1, attributeTemplateVersionId: 1 }`

### `rawResponses`

Primary queries:

- write accepted submission by `submissionId`
- fetch responses by tenant and date range
- fetch responses by tenant and version tuple for aggregation
- investigate one submission by `submissionId`

Recommended indexes:

- unique `{ submissionId: 1 }`
- `{ tenantId: 1, submittedAt: -1 }`
- `{ tenantId: 1, runtimeConfigId: 1, submittedAt: -1 }`
- `{ tenantId: 1, scannerVersionId: 1, calculationVersionId: 1, submittedAt: -1 }`
- `{ tenantId: 1, "completionState.status": 1, submittedAt: -1 }`
- optional `{ tenantId: 1, "attributes.stream": 1, submittedAt: -1 }`
- optional `{ tenantId: 1, "attributes.department": 1, submittedAt: -1 }`

### `aggregationSnapshots`

Primary queries:

- fetch latest ready dashboard snapshot for a tenant/filter scope
- fetch historical snapshot by `snapshotId`
- compare snapshot generations across calculation versions

Recommended indexes:

- unique `{ snapshotId: 1 }`
- `{ tenantId: 1, runtimeConfigId: 1, calculationVersionId: 1, "period.from": 1, "period.to": 1, filterHash: 1, generatedAt: -1 }`
- `{ tenantId: 1, generatedAt: -1 }`
- `{ tenantId: 1, scannerVersionId: 1, calculationVersionId: 1, generatedAt: -1 }`
- `{ tenantId: 1, filterHash: 1, generatedAt: -1 }`

### `scannerVersions`

Primary queries:

- load scanner by `scannerVersionId`
- list historical published versions for one tenant
- resolve version used by a submission or runtime config

Recommended indexes:

- unique `{ scannerVersionId: 1 }`
- unique `{ tenantId: 1, version: 1 }`
- `{ tenantId: 1, publishedAt: -1 }`

### `attributeTemplateVersions`

Primary queries:

- load attribute template by `attributeTemplateVersionId`
- list historical published versions for one tenant
- resolve template used by a submission or runtime config

Recommended indexes:

- unique `{ attributeTemplateVersionId: 1 }`
- unique `{ tenantId: 1, version: 1 }`
- `{ tenantId: 1, publishedAt: -1 }`

## Modeling Notes

- `runtimeConfigs` should repeat key labels needed for fast runtime delivery instead of forcing multi-collection reads on every public request.
- `rawResponses` should remain submission-centric and append-oriented.
- `aggregationSnapshots` should remain filter-scope-centric and read-oriented.
- No collection should depend on mutable frontend-only IDs or answer positions.
