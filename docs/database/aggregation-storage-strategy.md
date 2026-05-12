# Aggregation Storage Strategy

## Source Files

- `docs/contracts/canonical-aggregation-contract.md`
- `docs/contracts/calculation-boundaries.md`
- `docs/database/response-collections.md`
- `docs/aggregation/dashboard-runtime-system.md`

## Precomputed Snapshot Strategy

Dashboards should read precomputed snapshots from `aggregationSnapshots`.
They should not aggregate `rawResponses` inline during page requests.

Recommended generation flow:

```text
accepted raw response
-> aggregation job queued
-> calculation engine reads rawResponses for affected scope
-> snapshot written to aggregationSnapshots
-> dashboard reads latest ready snapshot
```

## Why Precompute

- dashboard latency stays predictable
- formulas stay centralized
- privacy roll-up is applied once in one place
- repeated dashboard traffic does not hammer raw response scans
- recalculation can be versioned and audited

## Dashboard Optimization Strategy

Snapshots should be written in a shape that maps directly to:

- executive summary cards
- category/domain pages
- demographic charts
- anonymity banners

The API may still apply a thin response mapper, but the heavy aggregation work must already be complete before dashboard read time.

## Update Behavior

Create a new snapshot when:

- a new completed raw response is accepted
- the selected period changes
- the selected filter scope changes
- the calculation version changes
- an aggregation bugfix requires a controlled backfill

Do not update historical snapshot rows in place.
Write a new snapshot with a new `snapshotId` and `generatedAt`.

## Partial Submission Behavior

- partial or in-progress responses are excluded from canonical dashboard snapshots by default
- if future operational reporting needs partial-state analytics, store them in separate snapshots or separate metrics sections
- never let partial rows silently dilute completed dashboard metrics

## Snapshot Selection Strategy

The dashboard should request the latest ready snapshot for:

- tenant scope
- version tuple
- requested period
- requested filter set

If no ready snapshot exists:

- queue generation
- return a pending response state
- never fall back to client-side aggregation from `rawResponses`

## Formula Evolution Strategy

- each formula release gets a new `calculationVersionId`
- snapshots for the new formula are written beside old snapshots
- dashboard readers explicitly request or are routed to the intended calculation version
- cross-version comparison must be intentional, never silent

## Privacy Strategy

- anonymity rules are enforced during snapshot generation
- roll-up metadata is stored on the snapshot
- the dashboard reads and displays the returned privacy state
- privacy suppression must not require frontend interpretation of raw response counts
