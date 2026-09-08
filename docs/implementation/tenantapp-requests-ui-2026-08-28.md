# TenantApp Requests UI — Visibility Fix (2026-08-28)

## 1. Problem

TenantApp already had a fully working claim-scoped "Request" implementation —
`components/reimbursements/ClaimRequests.tsx` (350 lines) plus the underlying
`claimRequestService` and repository. The Requests UI was mounted on every
claim detail page. However, the **organization (tenant admin) had no way to
discover which claims had outstanding Requests**: there was no sidebar entry
and no global inbox page. This violated the product rule that Requests must
be answerable before they ever become claims.

The directive was explicit: do not rebuild Request functionality. Diagnose
why it was invisible and fix the smallest integration issue.

## 2. Diagnosis (before any code)

| Surface | State before |
| --- | --- |
| `components/reimbursements/ClaimRequests.tsx` | ✅ Implemented, mounted on `ReimbursementDetailPage`. |
| `/api/reimbursements/[id]/requests` (GET, POST) | ✅ Implemented. |
| `/api/reimbursements/[id]/requests/[requestId]/decide` (POST) | ✅ Implemented. |
| `claimRequestService.createClaimRequest / decideClaimRequest` | ✅ Implemented. |
| `claimRequests` collection + repository contract | ✅ Implemented. |
| `dashboardNavigation` (sidebar data source) | ❌ No `requests` entry. |
| `TenantSurfacePageId` union | ❌ No `"requests"` member. |
| `iconMap` in `OrganizationSidebar.tsx` | ❌ No entry. |
| `runtime/language/modules/dashboard.ts` (en + ar) | ❌ No `requests` translation. |
| `/requests` page | ❌ Missing. |
| `/api/requests` (org-wide tenant inbox) | ❌ Missing. |
| `listByTenantId` on the request repository | ❌ Missing. |

Root cause: the **only** missing pieces were navigation + a tenant-scoped
listing entry point. No domain duplication, no rewrite, no flag.

## 3. Scope (what this phase changed)

Hard scope was *visibility + usability of the existing Request domain*. No
state machine changes. No new collections. No cross-claim aggregation that
wasn't already there. No changes to claim/invoice/payment status machines.

| Change | File |
| --- | --- |
| Added `"requests"` to `TenantSurfacePageId` union | `lib/dashboardMockData.ts` |
| Added Requests nav item (positioned right after Claims) | `lib/dashboardMockData.ts` |
| Registered `HelpCircle` icon in the sidebar `iconMap` | `components/layout/OrganizationSidebar.tsx` |
| Added EN + AR translation entries | `runtime/language/modules/dashboard.ts` |
| Added `listByTenantId` to repository contract | `src/server/repositories/contracts.ts` |
| Implemented `listByTenantId` on MongoDB repo + supporting index `claim_request_tenant_status_created` | `src/server/repositories/claimRequestsRepository.ts` |
| Implemented `listByTenantId` on in-memory repo (test fixtures) | `src/server/repositories/memoryRepositoryContext.ts` |
| Added tenant-scoped read service `listClaimRequestsForTenant` | `src/server/services/claimRequestService.ts` |
| Added `GET /api/requests` (tenant admin only, scoped to caller's tenant) | `app/api/requests/route.ts` |
| Added `/requests` page + client view `RequestsInbox.tsx` | `app/requests/page.tsx`, `components/reimbursements/RequestsInbox.tsx` |
| Added 3 focused tests for tenant isolation / role gate / status filter | `src/server/services/__tests__/claim-request.test.ts` |

## 4. Authorization model

The `/api/requests` endpoint follows the same gating as the rest of the
tenant-app auth surfaces:

1. The session is resolved through `resolveChatParticipant`, which honors
   the three tenant-app auth silos (tenant dashboard session, clinic
   session, super-admin API key). For this endpoint the call must come from
   a tenant dashboard session — i.e. `participant.role === "tenantAdmin"`.
2. Employee + clinic + super-admin contexts return **403** at the route
   handler. Super admins continue to use the existing claim-scoped
   `/api/reimbursements/[id]/requests` endpoint for cross-tenant oversight.
3. The service re-asserts the role and a non-empty `context.tenantId`, and
   passes the `tenantId` into `repositories.claimRequests.listByTenantId`.
   There is no `tenantId` query parameter on this endpoint — the
   `tenantId` flows from the session, so a user cannot switch tenants by
   editing the URL.
4. Cross-tenant leakage is impossible because the filter is built from
   `context.tenantId` before the request even reaches the data layer.

The directive's hard rule — *"Do not allow users to access another
tenant's Requests by changing tenantId, claimId, requestId in the
browser. The server must enforce authorization."* — is met.

## 5. Financial safety

`listClaimRequestsForTenant` is **read-only**. It returns existing
`ClaimRequestDocument` instances. It does not call `decideClaimRequest`,
does not call `update`, does not touch `ReimbursementDocument`,
`InvoiceDocument`, or `PaymentRecordDocument`. The only mutation paths
remain the existing `decideClaimRequest` flow, which already honors the
rule "A Request decision MUST NOT modify claim.status, invoice.status,
payment status, PaymentRecord." — this phase did not relax any of those
checks.

## 6. UI behavior

- `/requests` is a thin server wrapper that mounts a client view.
- Default filter is `pending`, matching the most common operator intent.
- Filter chips cover all five existing statuses: `pending`, `approved`,
  `rejected`, `more_info`, `converted_to_chat`. There is no status
  fabrication — every chip corresponds to a real status.
- Each row links to `/reimbursements/[claimId]#claim-requests` so the
  click-through lands on the existing `ClaimRequests` component that is
  already mounted on the claim detail page. No duplicate UI.
- Rows show the requester (employee/clinic) name and role, the subject,
  a body preview, the status badge (color + text + icon — not color
  alone), and a relative timestamp.
- Empty states explain *what* and *why* (e.g. "The organization inbox is
  clear." for the default `pending` filter), never just "No data".
- Per-section skeletons reserve layout (no CLS).
- Refresh button re-fetches with no polling. Errors render an inline
  error panel with a "Try again" action — they do not collapse the
  page.

## 7. Tests

```
$ npx tsc --noEmit
EXIT=0

$ npx tsx --test src/server/services/__tests__/claim-request.test.ts
# tests 13   (was 10 — added 3)
# pass 13
# fail 0

$ npm test
# tests 271   (was 268 — added 3)
# suites 57
# pass 271
# fail 0
```

New tests cover:

- **Tenant isolation** — the org-wide inbox returns only the caller's
  tenant's requests; a request created under a different tenant does not
  leak.
- **Role gate** — employees and super admins (without a tenantId) are
  rejected with `null`, i.e. the service refuses to list.
- **Status filter** — filtering by status narrows the result without
  mutating any document.

## 8. Hard scope confirmed

No edits were made to:

- `app/reimbursements/page.tsx`
- `components/reimbursements/ReimbursementDetailPage.tsx`
- `components/reimbursements/ClaimRequests.tsx`
- `app/api/reimbursements/[id]/requests/**`
- `src/server/services/claimRequestService.ts` decision paths
- The reimbursement / invoice / payment state machines
- `remedygcc-admin/**`
- `remedygcc-marketing/**`

The only behavioral change inside an existing file was the addition of
`listByTenantId` to the `claimRequests` repository contract and both
implementations (MongoDB + in-memory). No existing call site changed.

## 9. Future work (out of scope)

- Per-row counts on the sidebar entry (e.g. "Requests (3)" badge) — would
  need a tenant-scoped count endpoint and a polling/mutation strategy.
- "Mark all as read" — currently irrelevant; Requests don't have a read
  state.
- Resubmit link for employees after `more_info` — Phase 4 from the
  communication audit, intentionally out of scope here.
