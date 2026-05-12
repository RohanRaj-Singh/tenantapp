# Dashboard Runtime System

## Source Files

- `tenantapp/lib/dashboardMockData.ts`
- `tenantapp/components/dashboard/ExecutiveSummaryPage.tsx`
- `tenantapp/components/dashboard/DomainDashboardPage.tsx`
- `tenantapp/components/dashboard/EmailInvitationsPage.tsx`
- `tenantapp/components/dashboard/ExecutiveSummaryComponent.tsx`
- `tenantapp/components/dashboard/DashboardPrimitives.tsx`
- `tenantapp/components/dashboard/adminDashboard/surveys/AgeGroupAnalysis.tsx`
- `tenantapp/components/dashboard/adminDashboard/surveys/DepartmentAnalysis.tsx`
- `tenantapp/components/dashboard/adminDashboard/surveys/ExecutiveMentalHealthMetrics.tsx`
- `tenantapp/components/dashboard/useDashboardFilters.ts`
- `tenantapp/components/dashboard/filter/DashboardFilters.tsx`
- `tenantapp/runtime/contracts/aggregation.ts`
- `tenantapp/runtime/mocks/mockAggregation.ts`
- `tenantapp/runtime/mocks/mockAggregatedMetrics.ts`

## Active Dashboard Data Source

The active dashboard does not consume `AggregationOutput`.

Current data source:

```ts
const data = getDashboardMockData(theme.tenantName);
```

This is used by:

- executive summary page
- all domain pages
- email invitations page

`AggregationOutput`, `mockAggregation`, `mockAggregatedMetrics`, and `DashboardContainer.tsx` exist but are not used by any mounted dashboard route.

## Active Data Shape

`DashboardMockData` currently contains:

- `mentalHealthMetrics`
- `ageStats`
- `genderStats`
- `streamStats`
- `functionStats`
- `departmentStats`
- `locationStats`
- `organization.name`
- `totalParticipants`
- `invitationOverview`
- `invitationCampaigns`

These fields are dashboard-specific view models, not a direct projection of `AggregationOutput`.

## Dashboard Sections

### Executive Summary

Rendered by `ExecutiveSummaryPage.tsx` and `ExecutiveSummaryComponent.tsx`.

Includes:

- KPI cards
- dashboard filters
- domain performance overview
- risk distribution
- age, gender, stream, function, department, and location breakdowns
- privacy/anonymity card

### Domain Pages

Rendered by `DomainDashboardPage.tsx`.

Mounted pages:

- clinical risk index
- psychological safety
- workload & efficiency
- leadership & alignment
- satisfaction & engagement

Each domain page uses:

- one `MentalHealthMetric`
- dashboard-level summary cards
- domain-specific meter lists or comparison cards
- shared status legend

### Email Invitations

Rendered by `EmailInvitationsPage.tsx`.

Uses:

- local username/password gate
- tabbed mock UI for upload, send, and monitor states
- static invitation overview and campaigns from `getDashboardMockData`

## Chart Data Structures

Current chart inputs are assembled inside components.

Examples:

- domain overview charts
  `{ name, riskPercent, satisfactionScore, highRiskCount, avgRisk }`
- age charts
  `{ name, participants, riskScore, satisfaction }`
- gender charts
  `{ name, participants, riskScore, satisfaction, percentage }`
- department and stream charts
  `{ name, satisfaction, risk, responses, highRiskCount }`
- pie distributions
  `{ name, value, color, percentage? }`

## Branding Integration

Dashboard theming is fully runtime-driven.

Used theme fields include:

- `primaryColor`
- `linkColor`
- `surfaceAccent`
- `surfaceAccentStrong`
- `borderAccent`
- `cardGradient`
- `chartColors.*`
- `chartGridColor`
- `chartAxisColor`
- `chartTooltipStyle`

Branding is applied in:

- `DashboardShell.tsx`
- `OrganizationSidebar.tsx`
- `DashboardPrimitives.tsx`
- executive summary charts and cards
- domain pages
- age, department, and mental-health analysis components

## Filtering Behavior

`useDashboardFilters()` stores:

- `filters`
- `appliedFilters`
- `filterKey`

Implemented:

- staged filter state
- applied-filter state
- reset behavior
- dependent field clearing
- responsive desktop/mobile filter UI

Not implemented:

- no dashboard page transforms its data based on `appliedFilters`
- active pages still render the same `getDashboardMockData()` result after Apply
- dashboard filter hierarchy is hardcoded and not connected to runtime attribute templates

## Empty-State Behavior

Safe component-level empty states:

- `AgeGroupAnalysis`
- `DepartmentAnalysis`

Unsafe page-level assumptions:

- `DomainDashboardPage.tsx` dereferences the top location and highest-risk department without guarding empty arrays

## Status Thresholds

`getStatusTone()` currently maps satisfaction score to UI tone:

- `>= 75`: `Thriving`
- `>= 65`: `Stable`
- `>= 55`: `Watchlist`
- `< 55`: `At Risk`

This thresholding is a UI helper, not a persisted aggregation contract.
