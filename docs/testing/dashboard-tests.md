# Dashboard Tests

## Scope

- `tenantapp/lib/dashboardMockData.ts`
- `tenantapp/components/dashboard/ExecutiveSummaryPage.tsx`
- `tenantapp/components/dashboard/DomainDashboardPage.tsx`
- `tenantapp/components/dashboard/EmailInvitationsPage.tsx`
- `tenantapp/components/dashboard/useDashboardFilters.ts`
- `tenantapp/components/dashboard/filter/DashboardFilters.tsx`
- `tenantapp/components/dashboard/adminDashboard/surveys/*`
- `tenantapp/runtime/contracts/aggregation.ts`

## Automation Status

No automated dashboard tests exist in the repo.

## Verification Matrix

| Scenario | Observed current behavior | Status |
|---|---|---|
| Dashboard shell branding | Header, sidebar, shell, cards, charts, and badges pick up runtime theme colors. | Pass |
| Executive summary rendering | KPI cards, charts, and lists render from `DashboardMockData`. | Pass |
| Domain page rendering | All domain pages render from dashboard mock data and themed chart colors. | Pass |
| Email invitations page | Local gated mock flow renders upload, send, and monitor states. | Pass |
| Filter UI rendering | Desktop and mobile filter controls render and maintain staged/applied state. | Pass |
| Filter impact on dashboard data | Applying filters does not alter the displayed mock data. | Fail |
| AggregationOutput contract usage | Active routes do not consume `AggregationOutput`. | Fail |
| Chart rendering with theme colors | Recharts components use `chartColors`, `chartGridColor`, `chartAxisColor`, and `chartTooltipStyle`. | Pass |
| Age/department empty states | `AgeGroupAnalysis` and `DepartmentAnalysis` render empty-state cards safely. | Pass |
| Empty top-location or top-department arrays on domain pages | `DomainDashboardPage` can break because it dereferences sorted `[0]` values without guards. | Fail |

## Highest-Risk Findings

- The active dashboard is runtime-branded but still mock-data-driven.
- Filter state is currently presentational only.
- Page-level empty-state guards are incomplete in `DomainDashboardPage.tsx`.
