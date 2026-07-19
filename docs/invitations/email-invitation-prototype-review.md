# Email Invitation Prototype — Architectural Review

> **Date:** 2026-07-18
> **Scope:** `tenantapp` only
> **Type:** Analysis only — no code changes

---

## 1. Entry Points

| Aspect | Detail |
|--------|--------|
| **Where it starts** | Tenant Dashboard → Sidebar → "Invitations" nav item (Mail icon) |
| **Navigation flow** | Sidebar `id: "email-invitations"` → `/dashboard/email-invitations` |
| **Modal vs Page** | Full page, not a modal |
| **UX journey** | Page loads → Login gate (mock username + password) → Unlock → Stats dashboard with 3 tabs (Upload, Send, Monitor) |

---

## 2. Screens

| Screen | File | Lines | Purpose |
|--------|------|-------|---------|
| **Login Gate** | `components/dashboard/EmailInvitationsPage.tsx` | 32-78 | Mock login form — any non-empty credentials unlock; purely cosmetic, no real auth |
| **Stats Overview** | `components/dashboard/EmailInvitationsPage.tsx` | 91-120 | 4 StatCards: Employees Uploaded, Invitations Sent, Completed Responses, Secured Users |
| **Upload Tab** | `components/dashboard/EmailInvitationsPage.tsx` | 152-178 | Upload zone (dashed border placeholder) + Recent Campaigns list (name, date, status chip) |
| **Send Tab** | `components/dashboard/EmailInvitationsPage.tsx` | 180-198 | Placeholder text + Delivery Readiness side panel (Queued count, Completed count) |
| **Monitor Tab** | `components/dashboard/EmailInvitationsPage.tsx` | 200-238 | Campaign completion bars (name, recipients, status chip, progress bar) + Status Notes placeholder |

---

## 3. Components

| Component | File | Responsibility | Props | State | Reusability |
|-----------|------|---------------|-------|-------|-------------|
| `EmailInvitationsPage` | `components/dashboard/EmailInvitationsPage.tsx` | Entire invitation dashboard | None | `tab`, `userName`, `password`, `isUnlocked` | Low — tightly coupled to mock data pattern |
| `SectionCard` | `components/dashboard/DashboardPrimitives.tsx` | Card wrapper with title + description | `title`, `description`, `children` | None | High — used across all dashboard pages |
| `StatCard` | `components/dashboard/DashboardPrimitives.tsx` | Metric display with icon, value, caption | `title`, `value`, `caption`, `icon`, `accentColor` | None | High |
| `OrganizationSidebar` | `components/layout/OrganizationSidebar.tsx` | Sidebar nav — maps `"email-invitations"` to `Mail` icon | `user` | `sidebarOpen`, `executiveExpanded` | Dashboard-wide |

---

## 4. UI Flow

```
Tenant Dashboard
  ↓  (sidebar click — Mail icon)
/dashboard/email-invitations
  ↓
Login Gate (mock — any username + password)
  ↓  (Unlock button)
Stats Overview (4 StatCards)
  ↓
Tab Bar: [Upload] [Send] [Monitor]
  │
  ├── Upload Tab
  │     ├── Upload Zone (dashed placeholder)
  │     └── Recent Campaigns list (mock)
  │
  ├── Send Tab
  │     ├── Placeholder description
  │     └── Delivery Readiness (Queued / Completed counts)
  │
  └── Monitor Tab
        ├── Campaign progress bars (mock percentages)
        └── Status Notes placeholder
```

---

## 5. Mock Data

| Aspect | Detail |
|--------|--------|
| **Location** | `lib/dashboardMockData.ts` — `getDashboardMockData(tenantName)` |
| **Type — Overview** | `EmailInvitationOverview`: `{ uploadedEmployees, invitationsQueued, invitationsSent, completedResponses, securedUsers, lastPasswordRotation }` |
| **Type — Campaign** | `EmailInvitationCampaign`: `{ name, status: "Draft"\|"Scheduled"\|"Sent"\|"In Progress", scheduledFor, recipients, opened, completed }` |
| **Sample values** | 168 uploaded, 145 queued, 132 sent, 91 completed, 4 secured users |
| **Sample campaigns** | "Q2 Workforce Pulse" (In Progress), "Leadership Follow-Up" (Scheduled), "Clinical Teams Refresh" (Draft) |
| **Null variant** | One mock data set has both `invitationOverview: null` and `invitationCampaigns: null` |
| **Login gate** | No actual auth — any non-empty `userName` + `password` unlocks |

---

## 6. State Management

| Tool | Usage |
|------|-------|
| `useState` | `tab` (`"upload"\|"send"\|"monitor"`), `userName`, `password`, `isUnlocked` |
| `useMemo` | `getDashboardMockData(tenantName)` — memoized on tenant name |
| `useLanguage()` | Locale strings (English + Arabic in `runtime/language/modules/dashboard.ts`) |
| `useTheme()` | Colors, border styles, tenant name |

No context, Zustand, TanStack Query, or server state. Everything is local `useState` + mock data.

---

## 7. Routing

| Route | File | Type |
|-------|------|------|
| `/dashboard/email-invitations` | `app/dashboard/email-invitations/page.tsx` | Next.js App Router page (5-line wrapper) |

Single route only. No sub-routes, no API routes, no dynamic segments.

---

## 8. Design Review

### Strengths
- Consistent with dashboard design system (`SectionCard`, `StatCard`, `tenant-field`, `tenant-button`)
- Proper i18n — English and Arabic locale strings exist
- Tab bar active state matches dashboard patterns
- Responsive grid (`md:grid-cols-2 xl:grid-cols-4`, `lg:grid-cols-[1fr_0.9fr]`)

### Weaknesses
- Login gate is purely cosmetic — any credentials work, zero security
- Upload zone is a visual placeholder with no file upload
- Campaign list is static mock — no CRUD actions
- No empty state when campaigns are null (renders empty invisible list)
- No loading states
- No error states
- No accessibility labels on tab buttons or unlock button
- "Secured Users" stat + `lastPasswordRotation` belong to security domain, not invitations

---

## 9. Current Limitations

| Limitation | Detail |
|-----------|--------|
| **No backend** | Every data point is hardcoded mock |
| **No API routes** | Zero API endpoints exist |
| **No email sending** | UI only — no SMTP or email service |
| **No persistence** | Nothing stored — refresh loses all state |
| **No file upload** | Upload zone is a dashed-border visual only |
| **No campaign CRUD** | Campaigns are hardcoded — no create, edit, delete |
| **No real auth** | Login gate accepts any non-empty values |
| **No employee list** | "Employees Uploaded" stat has no linked list |
| **No real-time tracking** | Campaign bars use static mock percentages |
| **No error handling** | No network, validation, or server error states |
| **No loading states** | Data appears instantly from local mock |
| **No invitation token** | Unlike survey submission (which has `inviteToken`), the invitation dashboard has no token model |

---

## 10. Backend Readiness

| UI Action | Future API Endpoint |
|-----------|-------------------|
| Unlock login gate | *Remove entirely* — use existing Tenant Dashboard session |
| Upload employee list (CSV) | `POST /api/invitations/upload` — parse CSV, validate employees |
| View recent campaigns | `GET /api/invitations/campaigns` — list campaigns for tenant |
| Create campaign | `POST /api/invitations/campaigns` — create campaign |
| Send invitations | `POST /api/invitations/campaigns/:id/send` — trigger email dispatch |
| View campaign detail | `GET /api/invitations/campaigns/:id` — get campaign stats |
| Resend invitation | `POST /api/invitations/:id/resend` — retry failed/skipped |
| View invitation history | `GET /api/invitations` — list individual invitations |

---

## 11. Data Model Proposal

Prototype implies the following entities:

```typescript
interface InvitationCampaign {
  id: string;
  tenantId: string;
  name: string;               // displayed in campaign list
  status: "Draft" | "Scheduled" | "Sent" | "In Progress" | "Completed" | "Cancelled";
  scheduledFor: string;        // ISO date
  recipients: number;          // total intended
  opened: number;              // opened email
  completed: number;           // completed survey
  createdAt: string;
  updatedAt: string;
}

interface Invitation {
  id: string;
  campaignId: string;
  tenantId: string;
  employeeId: string;          // FK to EmployeeDocument
  email: string;               // denormalized at creation
  token: string;               // "invite_XXXX" — already exists in survey submission contract
  status: "pending" | "sent" | "opened" | "completed" | "bounced" | "cancelled";
  sentAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface InvitationDashboardOverview {
  uploadedEmployees: number;
  invitationsQueued: number;
  invitationsSent: number;
  completedResponses: number;
}
```

---

## 12. Architecture Assessment

### Compatibility with the New Identity System

| Aspect | Compatible? | Notes |
|--------|:-----------:|-------|
| Employee model | ✅ Yes | New `EmployeeDocument` (code + email, status lifecycle) maps directly to `employeeId` + `email` on invitations |
| Tenant scoping | ✅ Yes | All data is tenant-scoped — matches identity model |
| Login gate | ❌ No | Mock gate must be removed — Tenant Dashboard session IS the auth |
| Employee names | ✅ Yes | Prototype shows "Employees Uploaded" count but never lists names — compatible with anonymity rules |
| `inviteToken` | ✅ Yes | Already exists in `SurveySubmission` contract — invitation system generates and consumes these |

### What Must Change
1. Remove the login gate — Tenant Dashboard session handles auth
2. Replace all mock data with real API calls
3. Add CSV upload logic (parse, validate, bulk create employee records)
4. Implement campaign CRUD with MongoDB persistence
5. Connect campaign progress to real survey submission data via `inviteToken`

### What Can Stay As-Is
- `SectionCard` and `StatCard` — reusable, zero invitation logic
- Tab bar layout pattern
- Campaign progress bar UI pattern
- Locale string structure (English + Arabic)
- Responsive grid layout

### Components Reusable Without Modification
- `SectionCard` — generic wrapper
- `StatCard` — generic metric display
- `OrganizationSidebar` — only the nav item mapping changes (feature flag)

### Screens to Redesign
- **Login gate** → Remove entirely
- **Upload tab** → Real CSV upload, employee validation, preview step
- **Send tab** → Campaign creation form, recipient selection, schedule picker
- **Monitor tab** → Real-time data from invitation + survey services
- **Stats overview** → Real aggregated data from MongoDB queries

### Backend Services Needed Later
1. **Campaign service** — create, update, schedule, send
2. **Invitation service** — generate tokens, send emails, track status
3. **CSV parser service** — validate employee codes/emails, bulk create
4. **Email delivery service** — SMTP integration, template rendering, bounce handling
5. **Dashboard aggregation service** — campaign stats, completion rates

---

## 13. Recommendations Before Implementation

1. **Delete the login gate.** The Tenant Dashboard requires `requireTenantApiAuth()`. The mock gate adds zero security and creates confusing UX. The page should render immediately for authenticated tenant sessions.

2. **Keep the route + component structure.** `/dashboard/email-invitations` and `EmailInvitationsPage.tsx` are well-located. Build on top of them rather than restructuring.

3. **Replace `getDashboardMockData` with real server components or data hooks.** When APIs exist, use async server components or TanStack Query. The mock data pattern should be a temporary scaffold.

4. **Add `invitations` and `campaigns` collections to the data model.** Follow the schema in Section 11. The `token` field already has a home in the survey submission contract — this is your link between invitations and completed surveys.

5. **The `inviteToken` is your completion signal.** When an invitation is "completed," the survey submission with matching `inviteToken` confirms it. No webhook infrastructure needed for Phase 1 tracking.

6. **Do NOT build email sending yet.** Phase 1 of the identity refactor intentionally defers email infrastructure. Keep the UI scaffold ready for campaign management, but wait until email sending is officially scoped.
