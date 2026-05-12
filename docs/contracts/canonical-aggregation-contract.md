# Canonical Aggregation Contract

## Source Files

- `tenantapp/runtime/contracts/aggregation.ts`
- `tenantapp/runtime/contracts/scannerCalculations.ts`
- `docs/contracts/canonical-response-contract.md`
- `docs/contracts/calculation-boundaries.md`

## Purpose

This document defines the final aggregation snapshot shape consumed by dashboards and administrative reporting.

`aggregationSnapshots` is a derived read model.
It is never the source of truth for survey answers.

## Snapshot Scope

- One snapshot summarizes many completed raw submissions.
- One snapshot is bound to one immutable version tuple.
- One snapshot may be filtered by period and demographic dimensions.
- A dashboard must read snapshots only, never `rawResponses` directly.

## Canonical Snapshot

```json
{
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
  "filters": {
    "stream": "clinical_services",
    "location": "",
    "function": "",
    "department": "",
    "gender": "",
    "age": "",
    "seniority": ""
  },
  "filterHash": "7db3b1fd8fd9b929b8dfad8f7e9a6f1f",
  "source": {
    "completedSubmissionCount": 148,
    "includedSubmissionCount": 148,
    "excludedSubmissionCount": 0
  },
  "categoryMetrics": [
    {
      "categoryId": "category_clinical_risk",
      "categoryLabel": "Clinical Risk Index",
      "participantCount": 148,
      "averageScore": 61.2,
      "riskScore": 38.8,
      "satisfactionScore": 61.2,
      "riskStatus": "medium-risk"
    }
  ],
  "subdomainMetrics": [
    {
      "subdomainId": "subdomain_burnout",
      "subdomainLabel": "Burnout",
      "categoryId": "category_clinical_risk",
      "participantCount": 148,
      "averageScore": 58.4,
      "riskDistribution": {
        "noRisk": 18,
        "lowRisk": 42,
        "mediumRisk": 55,
        "highRisk": 33
      }
    }
  ],
  "overallMetrics": {
    "totalResponses": 148,
    "uniqueRespondents": 148,
    "completionRate": 0.94,
    "highRiskResponders": 33,
    "mediumRiskResponders": 55,
    "lowRiskResponders": 42
  },
  "demographicMetrics": {
    "byAge": [],
    "byGender": [],
    "byDepartment": [],
    "byStream": [],
    "byFunction": [],
    "byLocation": []
  },
  "anonymity": {
    "minimumThreshold": 4,
    "thresholdMet": true,
    "rollUpApplied": false,
    "removedFilters": []
  }
}
```

## Metric Shape Notes

- Field names are stable even if formulas change later.
- Numeric values are calculation-engine outputs, not dashboard-derived transforms.
- Empty demographic arrays are valid when a slice is unavailable or suppressed for privacy.
- `aggregationSnapshots` are not keyed by a single `submissionId`; they summarize a submission set.

## Snapshot Behavior

- Snapshots are generated only from accepted raw response records.
- Snapshots default to completed submissions only.
- Snapshots are scoped by tenant, version tuple, period, and filter set.
- Snapshots may exist in parallel for different `calculationVersionId` values.

## Dashboard Expectations

- Dashboard reads one ready snapshot at a time.
- Dashboard renders labels and metrics exactly as supplied.
- Dashboard does not rebuild category totals, subdomain totals, or risk distributions from raw rows.
- Dashboard honors `anonymity` flags and must surface roll-up state when present.

## Aggregation Boundaries

- The aggregation engine owns metric computation.
- The aggregation engine owns privacy threshold application.
- The aggregation engine owns filter normalization and `filterHash` generation.
- The aggregation engine may map raw response rows into dashboard-facing metric sections, but it must not mutate the underlying `rawResponses`.

## Immutability Expectations

- Each stored snapshot row is immutable after write.
- One logical scope may have multiple snapshot generations over time.
- Recomputing with a different formula version writes a new snapshot with a new `snapshotId`.
- Recomputing because of new completed submissions writes a new snapshot version rather than mutating historical rows in place.
- Previously generated snapshots remain queryable for audit and rollback purposes.
