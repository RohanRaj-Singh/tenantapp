# Dashboard Score Dependencies

For active `tenantapp` scanner implementation work, use:

- `docs/contracts/scoring-boundary-contract.md`
- `docs/contracts/database-preparation-scanner.md`

This file remains a legacy audit snapshot for older dashboard/service dependencies.

## Scope

This document maps the current dashboard runtime to the implemented survey and scoring contracts in:

- `backend/src/app/modules/survey/survey.routes.ts`
- `backend/src/app/modules/survey/survey.service.ts`
- `frontend/src/redux/api/apis/surveyApi.ts`
- `frontend/src/typesAndIntefaces/statsResponse.ts`
- `frontend/src/components/dashboard/filter/DashboardFilters.tsx`
- `frontend/src/components/dashboard/filter/HierarchicalFilter.tsx`
- `frontend/src/components/dashboard/organizationDashboard/BarChart.tsx`
- `frontend/src/components/dashboard/organizationDashboard/ScoreCard.tsx`
- `frontend/src/components/dashboard/organizationDashboard/SubDomainCard.tsx`
- `frontend/src/components/organization/ExecutiveSummaryComponent.tsx`
- `frontend/src/app/(OrganizationDashboard)/organizationDashboard/clinical-risk-index/page.tsx`
- `frontend/src/app/(OrganizationDashboard)/organizationDashboard/satisfaction-engagement/page.tsx`
- `frontend/src/app/(OrganizationDashboard)/organizationDashboard/surveys/page.tsx`
- `frontend/src/app/(OrganizationDashboard)/organizationDashboard/surveys/[id]/page.tsx`

## Backend Endpoints Used by Dashboard Runtime

Current dashboard-relevant survey routes:

| Route | Current use |
| --- | --- |
| `GET /survey/organization/stats` | Organization dashboard summary metrics |
| `POST /survey/subdomain-seats` | Domain dashboard breakdowns |
| `GET /survey/:surveyId/result` | Individual survey result page |
| `GET /survey/admin/get-all-survey-stats` | Admin summary path |
| `GET /survey/super-admin/get-subdomain-seats` | Super-admin subdomain metrics |
| `GET /survey/super-admin/get-all-survey-result` | Super-admin aggregate results |

## Primary Dashboard Data Shapes

### Organization Summary Dependency

Organization dashboard expects `getOrganizationSurveyStats2`-style output containing:

```ts
{
  totalParticipants: number;
  totalDepartments: number;
  completionRate: number;
  averageRiskScore: number;
  organizationMetrics: {
    overallRiskLevel: string;
    averageRiskScore: number;
    totalResponses: number;
  };
  mentalHealthMetrics: Array<{
    dashboardDomain: string;
    participants: number;
    riskScore: number;
    satisfactionScore: number;
    riskLevel: string;
    dashboardDomainAverage?: {
      averageRiskScore: number;
      averageSatisfactionScore: number;
      totalParticipants: number;
    };
  }>;
  ageGroupStats: Array<...>;
  genderStats: Array<...>;
  departmentStats: Array<...>;
  locationStats: Array<...>;
  streamStats: Array<...>;
  functionStats: Array<...>;
  rollUp?: boolean;
}
```

Frontend assumptions:

- `riskScore` is already a percentage-like number
- `satisfactionScore` is `100 - riskScore`
- each dashboard domain metric can be rendered without recalculation

### Domain Dashboard Dependency

Domain pages expect `subdomain-seats` output containing:

```ts
{
  dashboardDomainAverage: {
    averageRiskScore: number;
    averageSatisfactionScore: number;
    totalParticipants: number;
  };
  domainSummary: Array<{
    domain: string;
    participants: number;
    riskScore: number;
    satisfiedScore: number;
    riskStatus: string;
    satisfactionStatus: string;
  }>;
  departmentSummary: Array<...>;
  locationSummary: Array<...>;
  ageSummary: Array<...>;
  genderSummary: Array<...>;
  senioritySummary: Array<...>;
  streamSummary: Array<...>;
  functionSummary: Array<...>;
  rollUp?: boolean;
  totalParticipants: number;
}
```

Current backend meaning:

- `riskScore` is weighted risk percentage
- `satisfiedScore` is `100 - riskScore`
- `domain` is the question-level `domain` field, not a separate table

### Individual Survey Result Dependency

Survey detail page expects `GET /survey/:surveyId/result` output containing:

```ts
{
  results: Array<{
    dashboardDomain: string;
    riskCount: number;
    totalWRS: number;
    domainScore: string;
    healthyScore: number;
    responses: Array<{
      question: {
        id: string;
        question: string;
        domain: string;
        dashboardDomain: string;
        weight: number;
        options: string[];
        isFollowUp: boolean;
      };
      answerIndex: number;
      score: number;
    }>;
  }>
}
```

Current backend meaning:

- `domainScore` is risk percent as string
- `healthyScore` is fraction `0..1`
- `responses` excludes follow-ups from result scoring groups

## Hidden Coupling in Current Dashboard Runtime

### Coupling 1: Frontend Hierarchy Is Duplicated

`frontend/src/components/dashboard/filter/DashboardFilters.tsx` contains its own default attribute hierarchy for:

- stream
- location
- function
- department

This is independent from survey scoring data and duplicates runtime hierarchy assumptions.

### Coupling 2: Dashboard Depends on Backend-Derived Labels

The dashboards assume these stable labels exist:

- `Clinical Risk Index`
- `Psychological Safety Index`
- `Workload & Efficiency`
- `Leadership & Alignment`
- `Satisfaction & Engagement`

Renaming these strings without a compatibility layer will break metric routing and display.

### Coupling 3: Domain Means Subdomain

Dashboard cards and charts treat question `domain` as a subdomain bucket. There is no separate `subdomainId` or `subdomainSlug`.

### Coupling 4: Frontend and Backend Seed Drift

`frontend/src/data/question.json` does not match backend question seed/domain mappings for multiple question ids.

Any dashboard logic that later consumes frontend seed data instead of backend API data will be inconsistent.

### Coupling 5: Multiple Threshold Systems Exist

Current codebase contains different threshold systems:

- backend `buildStatus` logic for weighted percentages
- frontend page-specific risk labeling in `clinical-risk-index/page.tsx`
- generic color/status helpers in frontend utilities
- admin stats path using raw count thresholds

This means the same metric can receive different labels depending on which page or helper renders it.

### Coupling 6: Survey Detail Page Uses Different WRS Display Math

`frontend/src/app/(OrganizationDashboard)/organizationDashboard/surveys/[id]/page.tsx` computes a displayed per-question `WRS` value from `response.score`, `weight`, and option count.

That display formula is not equivalent to the backend risk-fraction formula used for actual scoring.

### Coupling 7: Follow-Ups Are Stored but Not Reflected in Domain Scores

Dashboards depend on main-question scoring only.

If future aggregation includes follow-ups without versioning the contract, current dashboard outputs will drift.

## Dashboard Assumptions by Module

### `surveys/page.tsx`

Assumes:

- `mentalHealthMetrics[].riskScore` is the key cross-domain risk indicator
- `mentalHealthMetrics[].dashboardDomainAverage` may exist
- risk/satisfaction numbers are directly renderable as percentages

### `SubDomainCard.tsx` and related charts

Assume:

- every summary item includes `participants`
- scores are already aggregated server-side
- domain labels are display-ready strings

### `ExecutiveSummaryComponent.tsx`

Assumes:

- `dashboardDomainAverage.averageRiskScore` is available
- different dashboard domains can reuse similar metric cards even when semantics differ

This component currently mixes score semantics across domains.

## Current Aggregation Semantics

The most consistent implemented dashboard formula is:

```ts
riskFraction = (2 - score) / 4
weightedRisk = weight * riskFraction
percentRisk = sum(weightedRisk) / sum(weight) * 100
satisfaction = 100 - percentRisk
```

But not all endpoints use this same contract.

`getAdminSurveyStats` still uses raw `riskCount` averaging and separate thresholds.

## Architectural Risks for DB/API Work

- Scoring logic is not centralized to one immutable formula contract.
- Dashboard pages assume server-prepared percentages instead of versioned metric definitions.
- `domain` is overloaded as subdomain label with no stable id boundary.
- Frontend still contains local question seed data that can diverge from backend.
- Status thresholds are duplicated across backend and frontend.
- `dashboardDomainMaxPossibleScore` and `dashboardDomainWeight` are persisted but not driving the active dashboard formulas.

## DB Boundary Notes

Database and API implementation should preserve these boundaries from the current runtime:

- scanner version owns ordered questions
- question owns `dashboardDomain`, `domain`, `weight`, `isFollowUp`, and option order
- survey response owns only `questionId`, `answerIndex`, and derived score
- dashboard aggregation should read from persisted responses and versioned question metadata
- dashboard metric formulas must be defined in one canonical server-side layer
- frontend must consume API aggregates, not recompute from local seeds
