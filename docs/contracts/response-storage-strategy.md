# Response Storage Strategy

## Source Files

- `docs/contracts/canonical-response-contract.md`
- `docs/contracts/canonical-aggregation-contract.md`
- `docs/contracts/immutable-versioning-strategy.md`
- `docs/database/response-collections.md`

## Core Separation

The response pipeline is split into three storage layers:

```text
runtimeConfigs
-> rawResponses
-> aggregationSnapshots
```

## Canonical Storage Roles

| Layer | Purpose | Write Pattern | Primary Consumers |
| --- | --- | --- | --- |
| `runtimeConfigs` | Published runtime composition snapshot | Written only on publish | Public runtime API, submit validation, audit tooling |
| `rawResponses` | Immutable respondent truth records | Written only when a submission is accepted | Aggregation engine, audit tooling, support review |
| `aggregationSnapshots` | Precomputed dashboard-ready metrics | Written only by the aggregation engine | Dashboard, super admin analytics, exports |

## Why Separation Exists

- `runtimeConfigs` freezes what the respondent actually saw.
- `rawResponses` freezes what the respondent actually answered.
- `aggregationSnapshots` freezes what the backend calculated for a specific version tuple and filter scope.

Keeping these concerns separate prevents:

- frontend-led recomputation
- accidental mutation of historical truth
- dashboard coupling to raw submission structure
- formula changes from corrupting prior outputs

## `runtimeConfigs`

`runtimeConfigs` should store the published composition pointer for:

- `scannerVersionId`
- `attributeTemplateVersionId`
- `calculationVersionId`
- `brandingVersionId`
- runtime settings and tenant metadata

This collection exists so the platform can validate a submission against one immutable published configuration instead of piecing together live mutable dependencies at submit time.

## `rawResponses`

`rawResponses` should store:

- version references
- normalized attributes
- flat response rows
- submission metadata
- completion state

This layer is the only durable truth source for respondent answers.
Nothing in `aggregationSnapshots` may replace it.

## `aggregationSnapshots`

`aggregationSnapshots` should store:

- metric outputs
- scope metadata
- filter metadata
- privacy state
- version references
- generation timestamps

This layer is optimized for reads, not for preserving respondent truth.

## Scalability Expectations

- `rawResponses` is append-heavy and audit-heavy.
- `aggregationSnapshots` is read-heavy and dashboard-heavy.
- `runtimeConfigs` is publish-heavy but low-volume.

Separating the collections allows:

- independent indexes
- different retention and archival policies
- background aggregation without locking submission writes
- targeted performance tuning by workload

## Analytics Safety

- Analysts can always rerun calculations from `rawResponses` without trusting old dashboard projections.
- Dashboard bugs do not corrupt respondent truth because snapshots are derived only.
- Privacy roll-ups can be regenerated without altering the accepted raw records.

## Formula Evolution Safety

- New formulas create new `calculationVersionId` values.
- Old `rawResponses` remain unchanged.
- New `aggregationSnapshots` are written beside old ones instead of overwriting them.
- Historical comparisons remain auditable because the version tuple is preserved on both response and snapshot layers.
