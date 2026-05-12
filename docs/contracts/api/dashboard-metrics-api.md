# Dashboard Metrics API

## Endpoint

```text
GET /api/dashboard/metrics
```

## Purpose

Return a ready aggregation snapshot for dashboard consumption.

The dashboard is a snapshot consumer only.
It is not allowed to aggregate raw response data in the browser.

## Query Parameters

| Parameter | Type | Purpose |
| --- | --- | --- |
| `periodFrom` | `string` | Inclusive ISO timestamp for snapshot scope |
| `periodTo` | `string` | Inclusive ISO timestamp for snapshot scope |
| `scannerVersionId` | `string` | Optional explicit version scope override |
| `calculationVersionId` | `string` | Optional explicit formula scope override |
| `stream` | `string` | Optional demographic filter |
| `location` | `string` | Optional demographic filter |
| `function` | `string` | Optional demographic filter |
| `department` | `string` | Optional demographic filter |
| `gender` | `string` | Optional demographic filter |
| `age` | `string` | Optional demographic filter |
| `seniority` | `string` | Optional demographic filter |

Tenant scope should come from authenticated dashboard context or the resolved tenant session, not from an arbitrary client-provided tenant override.

## Success Response

```json
{
  "status": "ready",
  "snapshot": {
    "snapshotId": "agg_01JTZG1A34X7QCCF6WZ5GNWQ5S",
    "tenantId": "tenant_acme_health",
    "runtimeConfigId": "runtimecfg_2026_05_10_001",
    "scannerVersionId": "scanner_v7",
    "attributeTemplateVersionId": "attr_v3",
    "calculationVersionId": "calc_v1",
    "generatedAt": "2026-05-10T10:00:00.000Z",
    "period": {
      "from": "2026-05-01T00:00:00.000Z",
      "to": "2026-05-10T23:59:59.999Z"
    },
    "filters": {},
    "filterHash": "7db3b1fd8fd9b929b8dfad8f7e9a6f1f",
    "source": {
      "completedSubmissionCount": 148,
      "includedSubmissionCount": 148,
      "excludedSubmissionCount": 0
    },
    "categoryMetrics": [],
    "subdomainMetrics": [],
    "overallMetrics": {},
    "demographicMetrics": {},
    "anonymity": {
      "minimumThreshold": 4,
      "thresholdMet": true,
      "rollUpApplied": false,
      "removedFilters": []
    }
  }
}
```

## Pending Response

```json
{
  "status": "pending_snapshot",
  "requestedAt": "2026-05-10T10:00:00.000Z"
}
```

## Backend Responsibilities

- normalize the request filter scope
- resolve the intended tenant and version tuple
- return the latest ready snapshot for that scope
- queue snapshot generation if the scope is valid but not yet materialized
- enforce anonymity and roll-up rules before a snapshot becomes readable

## Frontend Responsibilities

- request metrics by scope only
- render whatever snapshot is returned
- display pending, empty, and privacy states without recomputation
- treat snapshot values as authoritative

## Forbidden Frontend Behaviors

- querying raw responses directly
- recomputing category or subdomain metrics locally
- bypassing anonymity roll-ups with client-side filtering
- blending multiple snapshot responses into a new authoritative metric set in the browser
