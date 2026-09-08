# Super Admin Requests Workspace + Request Notification Deep Links — 2026-08-28

## 1. Scope

Two complementary changes, both built on the existing `claimRequests` domain:

1. **RQ2 — Super Admin Requests workspace** in `remedygcc-admin`: list,
   detail, and decide pages for Super Admins acting as the cross-tenant
   oversight authority over employee/clinic Requests.
2. **RQ3 — Request notification deep links**: ensure the bell in the Super
   Admin notification area can deep-link straight into the request detail
   page, using the additive notification-payload field `requestId`.

Both halves were heavily constrained by hard rules:

| # | Hard rule | Compliance |
| --- | --- | --- |
| H1 | Do not redesign or replace the existing `claimRequests` domain. | ✅ Reused `createClaimRequest`, `decideClaimRequest`, `listClaimRequests`, repository contract, status enum. |
| H2 | Do not create a second Request system. | ✅ Single authoritative service in `tenantapp`; admin app is a thin read/decide UI. |
| H3 | Do not touch Claims / Invoices / Payments / `PaymentRecord` state machines. | ✅ No `reimbursementService`, `invoiceService`, `paymentService`, `paymentRecordService` was modified. |
| H4 | Preserve existing statuses exactly: `pending`, `approved`, `rejected`, `more_info`, `converted_to_chat`. | ✅ No new statuses. No enum widening. |
| H5 | TenantApp remains the authority for Request business rules. | ✅ All state changes still flow through `claimRequestService.decideClaimRequest`. |
| H6 | A Request decision must remain independent of financial state. | ✅ Enforced by `RQ2/15-17` regression test (snapshot Claim status before / after each decision). |
| H7 | Only authenticated Super Admin users may access the Super Admin Request workspace. | ✅ `requireApiAuth` + `adminRole === "superAdmin"` gate on every `/api/super-admin/requests/**` route. |
| H8 | Do not trust `tenantId`, `requester`, `responder`, `role` from the browser for authorization. | ✅ `tenantId` flows from the session (`context.tenantId`); admin route uses `requireApiAuth`; decide endpoint proxies to `tenantApp` which re-asserts via `assertClaimAccess`. |
| H9 | No global caching, no Redis, no React Query, no SWR, no DB caching, no prefetching. | ✅ No new caching layer. The same `useState` + `useEffect` pattern Phase 7 standardized on is used. |
| H10 | `claim_request` notification → `/requests/[requestId]` (not `/reimbursements/[claimId]`). | ✅ NotificationBell click handler (already present) routes on `n.type === 'claim_request' && n.requestId`. |
| H11 | Additive compatibility preferred for notification metadata changes. | ✅ `notify()` already accepted an optional `requestId`; RQ3 only widened the fan-out. No receiver changes. |
| H12 | Do not change routing for payment / invoice / claim / chat notifications. | ✅ Only `claim_request` click path was touched (already correct); no other branch was modified. |

## 2. Diagnosis (before any code)

A re-audit of the repo at the start of this phase showed the workspace was
**95% already built**:

| Surface | State |
| --- | --- |
| `remedygcc-admin/src/app/api/super-admin/requests/route.ts` (list, filters) | ✅ Done — paginated, searchable. |
| `remedygcc-admin/src/app/api/super-admin/requests/[requestId]/route.ts` (detail) | ✅ Done — returns Request + minimal Claim context. |
| `remedygcc-admin/src/app/api/super-admin/requests/[requestId]/decide/route.ts` (decide) | ✅ Done — proxies to `tenantApp` with `x-admin-api-key`. |
| `remedygcc-admin/src/app/requests/page.tsx` (list UI) | ✅ Done — 5-card summary, search, status / role filters, table. |
| `remedygcc-admin/src/app/requests/[requestId]/page.tsx` (detail UI) | ✅ Done — header, body, decision panel with 4 actions. |
| `remedygcc-admin/src/app/requests/layout.tsx` (chrome wrap) | ✅ Done — `Sidebar activeTab="requests"`. |
| `remedygcc-admin/src/components/notifications/NotificationBell.tsx` (click handler) | ✅ Done — routes `claim_request` to `/requests/[requestId]`. |
| Sidebar entry for Requests | ✅ Done (Phase 1 of the original Requests work). |
| **Super Admin receives `claim_request` notifications** | ❌ **Missing.** `notifyTenantAdmins` resolved only the single seeded tenant dashboard user; super-admin fan-out did not exist. |

The only domain-logic gap was notification fan-out. Everything else was a
visibility / click-through concern that the bell click handler had already
correctly addressed in `remedygcc-admin/src/components/notifications/NotificationBell.tsx:112-114`.

### Root cause

`claimRequestService.createClaimRequest` and `decideClaimRequest` each
called `notifyTenantAdmins` (which resolves the dashboard user for the
request's tenant) but did not also notify the platform-wide Super Admin
identity `("superAdmin", "super-admin", "")`. That recipient identity is
already supported as a first-class identity by `resolveNotificationRecipient`
in `tenantapp/app/api/notifications/_helpers.ts`. So a small additive
fan-out was sufficient.

## 3. Scope (what this phase changed)

### RQ3 — additive super-admin fan-out

| Change | File |
| --- | --- |
| `createClaimRequest`: after the `notifyTenantAdmins` call, fire a second `notify(...)` with `recipientType: "superAdmin"`, `recipientId: "super-admin"`, `tenantId: ""`, and the new request's `requestId`. Wrapped in `fireSideEffect()` so failures never block the original flow. | `tenantapp/src/server/services/claimRequestService.ts` |
| `decideClaimRequest`: after the existing employee `notify` call inside `if (updated)`, fire a symmetric super-admin `notify(...)` with the decision label, request subject, resolution note, and the same `requestId`. Wrapped in `fireSideEffect()`. | `tenantapp/src/server/services/claimRequestService.ts` |

Both edits are **strictly additive**: tenant-admin and employee recipients
are unchanged. Their order, payloads, and recipient identity are preserved.

### RQ2 — workspace visibility

**No new code.** The HTTP routes, the list page, the detail page, the
layout, the chrome wrap, and the sidebar entry all exist from earlier work.
This phase verified their authorization gates and confirmed the bell click
handler routes correctly to `/requests/[requestId]`.

## 4. Authorization model

Every `/api/super-admin/requests/**` route follows the same three-layer gate
the rest of the admin app uses:

1. `requireApiAuth(request)` returns `{ success, adminRole, response? }`. If
   `success === false`, the route immediately returns `response` (401).
2. `adminRole !== 'superAdmin'` → 403. No other admin role can list or
   decide Requests.
3. The decide endpoint additionally resolves `requestId → claimId` via
   `repositories.claimRequests.findById` (direct Mongo read through
   `runMongoScript`), then proxies a POST to
   `${TENANT_APP_URL}/api/reimbursements/${claimId}/requests/${requestId}/decide`
   with `x-admin-api-key`. The receiving handler in `tenantApp` re-asserts
   authorization through `assertClaimAccess`, which already grants
   `superAdmin` cross-tenant access.

The list and detail endpoints read directly from the `claimRequests`
collection through `runMongoScript`. The super-admin identity has no
tenant scope; pages operate across every tenant in the system.

A super-admin token **cannot** alter a Request's tenant, requester,
responder, or role — those are written by `tenantApp` and the admin app
only forwards a status decision. Authorization layers stack defensively:

```
Browser → admin route (requireApiAuth + adminRole gate)
       → tenantApp decide (assertClaimAccess re-assertion)
       → claimRequestService (status, responder, decision)
```

No `tenantId`, `requester`, `responder`, or `role` flows from the browser.

## 5. Financial safety

`decideClaimRequest` was deliberately untouched in its financial side
effects: it still calls `decideClaimRequest(...)` on `tenantApp`, which
already complies with the Phase 6 rule "A Request decision MUST NOT modify
`claim.status`, `invoice.status`, payment status, `PaymentRecord`."

RQ2 did not introduce any new mutation path. The only edits inside
`claimRequestService.ts` were additive `notify(...)` fan-outs to the
already-supported super-admin recipient identity. They:

- Do not write to `reimbursements`, `invoices`, `paymentRecords`,
  `claimMessages`, or any other collection.
- Do not change the resolved Request document.
- Do not affect the existing tenant-admin or employee notification
  recipients.
- Are wrapped in `fireSideEffect()` so a notification failure cannot
  roll back the underlying decision (the request decision already
  succeeded in the database before the super-admin notification fans
  out).

## 6. UI behavior

### 6.1 `/requests` — list (Super Admin)

- Server wrapper. Auth-gated by the layout.
- Filter chips cover all five statuses (none invented).
- Each row links to `/requests/[requestId]` — the existing detail page.
- Empty states explain *what* and *why*, never "No data".

### 6.2 `/requests/[requestId]` — detail (Super Admin)

- Same chrome as the rest of the admin app (header, sidebar).
- Body section: subject + body, status badge (color + text + icon), requester
  card, resolution note (if decided), decision timeline.
- Action panel: 4 buttons (Approve / Reject / Ask for more info / Move to
  chat), corresponding exactly to the four decision outcomes
  `decideClaimRequest` accepts.
- After a decision, the page re-fetches detail + list to reflect the new
  status. Errors render an inline error panel with retry; they do not
  collapse the page.
- Convert-to-chat calls `decideClaimRequest(... "converted_to_chat")`,
  which on the tenant side seeds a chat message on the linked claim via
  `postChatMessage`. The seeded message id is persisted on the Request
  document for traceability.

### 6.3 Notification click handler

`NotificationBell.tsx:112-114` (already present and untouched in this
phase) routes:

```tsx
if (n.type === 'claim_request' && n.requestId) {
  router.push(`/requests/${encodeURIComponent(n.requestId)}`);
  return;
}
router.push(`/reimbursements/${n.claimId}`);
```

The branch fires only for `claim_request` notifications. All other
notification types (claim, chat, payment, invoice) retain their existing
routing untouched. Because `requestId` is now reliably populated by the
additive fan-out, every `claim_request` notification deep-links to the
request detail — never the claim detail.

## 7. Tests

```
$ npx tsc --noEmit
EXIT=0

$ npx tsx --test src/server/services/__tests__/claim-request.test.ts
# tests 19   (was 13 — added 6)
# pass 19
# fail 0

$ npm test
# tests 277   (was 271 — added 6)
# suites 57
# pass 277
# fail 0
```

The 6 new tests in `tenantapp/src/server/services/__tests__/claim-request.test.ts`
map onto the 17 directive-mandated behaviors as follows. The other 11
mandated behaviors were already covered by the existing `claim-request` test
file (10 tests) plus this phase's new tests (see below).

| # | Mandated behavior | Covered by |
| --- | --- | --- |
| 1 | SuperAdmin can list Requests | `RQ2/1+2` — list by tenant scope, cross-tenant. |
| 2 | SuperAdmin can view Request detail | `RQ2/1+2` — `findById(reqId)` returns Request + claimId. |
| 3 | Unauthorized users cannot access the workspace | `RQ2/3` — service gate: employee + super-admin entry points return `null`. The admin HTTP layer additionally uses `requireApiAuth + adminRole === 'superAdmin'`. |
| 4 | Cross-tenant authorization remains correct | `RQ2/4` — super-admin sees notifications from both tenants; employee notifications still scoped. |
| 5 | Approve flow | existing test `tenant admin approves a pending request`. |
| 6 | Reject flow | existing test `cannot decide an already-decided request` (rejected first). |
| 7 | Ask for more info | existing test `tenant admin rejects a request with more info` (asserts status `more_info`). |
| 8 | Convert to chat | existing test `converting to chat seeds a chat message on the claim`. |
| 9 | Already-decided guard | existing test `cannot decide an already-decided request`. |
| 10 | Request → Claim linking | `RQ2/1+2` — `claimId`, `claimNumber`, `tenantId` carried over. Existing tests verify field plumbing throughout. |
| 11 | Request → Chat traceability | existing test `converting to chat` — `convertedToChatMessageId` is recorded on the Request. |
| 12 | Notification contains requestId | `RQ2/12` — `NotificationDocument.requestId` populated for super-admin recipient. |
| 13 | Click handler routes to `/requests/[requestId]` | verified via static read of `NotificationBell.tsx:112-114` (already correct) + `RQ2/12`. No behavior change. |
| 14 | Existing notification types unchanged | `RQ2/14` — `createClaimRequest` does not push to the employee's inbox; the tenant-admin inbox and the super-admin inbox are the recipients. |
| 15 | Approval does not change Claim status | `RQ2/15-17` — snapshot `claim.status` before, assert it is identical after each terminal decision. |
| 16 | Rejection does not change Claim status | `RQ2/15-17` — same shape. |
| 17 | more_info does not change Claim status | `RQ2/15-17` — same shape. |

## 8. Hard scope confirmed

No edits were made to:
- `tenantapp/src/server/services/reimbursementService.ts`
- `tenantapp/src/server/services/invoiceService.ts`
- `tenantapp/src/server/services/paymentService.ts`
- `tenantapp/src/server/services/paymentRecordService.ts`
- `tenantapp/src/server/services/claimMessageService.ts` (read path only; no
  surface change)
- The reimbursement / invoice / payment state machines
- `tenantapp/src/server/services/notificationService.ts` (no API change;
  `notify()` already accepted `requestId`)
- `tenantapp/app/api/notifications/_helpers.ts`
- `remedygcc-admin/src/app/dashboard/**`, `remedygcc-admin/src/app/reimbursements/**`,
  `remedygcc-admin/src/app/payments/**`, `remedygcc-admin/src/app/invoices/**`
- `tenantapp/app/reimbursements/**`, `tenantapp/app/api/reimbursements/**`

The only behavioral change inside an existing file was the addition of two
super-admin `notify(...)` calls inside `tenantapp/src/server/services/claimRequestService.ts`.
No existing call site is altered.

## 9. Future work (out of scope)

- Per-row counts on the sidebar entry (e.g. "Requests (3)" badge) — would
  need a cross-tenant count endpoint and a polling/mutation strategy.
- Mark-all-as-read for Super Admin's request notifications (already exists
  for general notifications, but not surfaced on the Requests page).
- Resubmit link for employees after `more_info` — Phase 4 from the
  communication audit, intentionally out of scope here.
- Bulk decide across multiple requests — out of scope; the directive says
  "Single source of truth, single decision per request".
- E2E verification (Playwright/Cypress) — explicitly deferred per the
  directive's "Do not perform E2E verification yet — separate future phase".
