# RemedyGCC v2 Architecture Audit — Phase 1

> **Date:** 2026-07-18
> **Scope:** Current implementation vs. client's latest product specification
> **Constraint:** No code was modified during this audit

---

## 1. Current Architecture Overview

### Authentication Architecture

The system has **two separate authentication systems**:

#### A. Tenant Dashboard Auth (password-based)
- **Users:** `TenantUser` records in `tenantDashboardUsers` collection
- **Authentication:** bcrypt password hashing (salt rounds: 12)
- **Session:** Cookie-based (`tenant_dashboard_session`) with server-side session records in `tenantDashboardSessions` collection
- **Flow:** Tenant admin logs in with email/username + password → server creates session → cookie set for 7-day expiry
- **Password management:** `changeTenantPassword()` requires current password + new password validation
- **Rate limiting:** In-memory `Map<string, LoginAttemptEntry>` keyed by `identifier::ip`
- **Lockout:** 5 failed attempts → 15-minute lockout
- **Session validation:** Middleware validates session token on every protected route request
- **Local dev bypass:** `local-auth-bypass.ts` allows session-free auth in development

#### B. Employee Portal Auth (PIN-based)
- **Users:** `EmployeeDocument` records in `employees` collection
- **Authentication:** scrypt PIN hashing with random salt (`salt:hash` format)
- **Session:** Stateless — each request requires `x-admin-api-key` header (shared secret)
- **Flow:** Employee sends employeeCode + PIN → server validates → returns employee profile (no session created)
- **PIN management:** Tenant admin sets/updates PIN via `createEmployee()` or `updateEmployeePin()` / `resetEmployeePin()`
- **Lockout:** 5 failed attempts → 15-minute lockout (tracked on document)
- **No session:** Employee auth is a simple request-response; no cookies, no tokens

### Employee Lifecycle

```
Tenant creates employee (name, email, employeeCode, PIN)
  ↓
Employee receives credentials (out of band — no system notification)
  ↓
Employee logs in via marketing site → API call to tenantapp
  ↓
Employee submits claims → API call proxied through marketing site
```

- **Statuses:** `"active" | "inactive"` (binary, tenant-controlled)
- **No registration states:** No `pending`, `invited`, `verified` statuses
- **No self-service:** All employee account management is tenant-admin-only
- **Identity:** Tenant owns employee identities — `tenantId` is on every employee record

### Claims & Reimbursement Architecture

**Data model:** `ReimbursementDocument` in `reimbursements` collection

```
Fields:
  reimbursementId, claimNumber (RMB-YYYY-NNNNNN), tenantId, employeeId,
  employeeName, type, amount, description, receiptUrl, receiptHash,
  serviceDate, clinicId, clinicName, status, reviewedBy, reviewedAt,
  notes, history[]
```

**Status lifecycle:** `pending → approved → paid`
Alternative path: `pending → rejected`
Freeze path: `pending → frozen` (any status can be frozen)
Constraint: `Only approved claims can be marked as paid`

**Ownership model:**
- Employee creates claim (via marketing site proxy, `actorRole: "employee"`)
- Tenant admin approves/rejects/freezes/pays (via dashboard, `actorRole: "tenantAdmin"`)
- All actions recorded in `history[]` append-only audit trail

**Who controls what (current):**
| Action | Who |
|---|---|
| Create claim | Employee (proxied) |
| Approve/reject | Tenant admin |
| Freeze | Tenant admin |
| Mark as paid | Tenant admin |
| Set budgets | No budgets exist |
| Process vendor invoices | No vendor workflow exists |

### Database Collections

| Collection | Purpose |
|---|---|
| `tenants` | Tenant organizations |
| `tenantDashboardUsers` | Tenant dashboard login accounts |
| `tenantDashboardSessions` | Server-side session records |
| `employees` | Employee records (with PIN hashes) |
| `reimbursements` | Claims with full history |
| `auditEvents` | PIN reset/unlock audit log |
| `runtimeConfigs` | Scanner/survey configuration |
| `rawResponses` | Survey responses |
| `aggregationSnapshots` | Dashboard metric snapshots |
| `counters` | Atomic claim-number sequence |

### Portals

| Portal | Exists? | Auth | Responsibilities |
|---|---|---|---|
| **Tenant Dashboard** | Yes | Password + session | Full CRUD: employees, claims, dashboard, settings |
| **Employee Portal** | Not in this repo | PIN (proxied) | External marketing site calls `app/api/employee/*` with shared API key |
| **Super Admin** | No | — | — |
| **Clinic Portal** | No | — | — |

---

## 2. Client Vision (Inferred from Specification)

Based on the client's requirements document, the intended architecture includes:

1. **Password-based auth** replacing PINs
2. **Employee self-registration** using authorized employee lists
3. **Email verification** as part of registration
4. **Remedy owning identity management** (not tenant)
5. **Anonymous claims** — organizations should not see employee names
6. **Vendor invoice workflow** replacing tenant-managed claim payments
7. **Clinic portal** — clinics become first-class platform users with dashboards
8. **Super Admin payout management** — centralized financial control
9. **Role-based permissions** separating identity, claims, budgets, clinics

---

## 3. Architecture Comparison

### 3.1 Identity & Authentication

| Aspect | Current | Client Vision | Verdict |
|---|---|---|---|
| Auth method | PIN (scrypt) | Password (bcrypt) | Partial match — tenant dashboard already uses passwords |
| Who creates accounts | Tenant admin | Employee self-registration | **Conflict** |
| Account states | active/inactive | pending signup, verified, active | **Missing** |
| Identity owner | Tenant (employeeId scoped to tenantId) | Remedy/Platform | **Conflict** |
| Email verification | None | Required | **Missing** |
| Password creation | Tenant sets PIN | Employee creates password | **Conflict** |
| Rate limiting | In-memory Map (lost on restart) | Needs persistent rate limiting | Partial |
| Session management | Present (tenant dashboard) | Unknown | Unclear |

### 3.2 Employee Lifecycle

| Aspect | Current | Client Vision | Verdict |
|---|---|---|---|
| Creation | Tenant creates employee with PIN | Employee signs up from authorized list | **Conflict** |
| Statuses | active, inactive | invited, pending, verified, active, disabled | **Missing** |
| Self-registration | No | Yes | **Missing** |
| Authorized list | No explicit concept | Organization uploads authorized list | **Missing** |
| Email verification | No | Yes | **Missing** |

### 3.3 Permissions

| Entity Owner | Current | Client Vision | Verdict |
|---|---|---|---|
| Employee identity | Tenant | Remedy/Platform | **Conflict** |
| Passwords/PINs | Tenant (can reset via dashboard) | Employee (self-managed) | **Conflict** |
| Claims | Tenant (owns lifecycle) | Mixed — employee submits, vendor invoices, Super Admin pays | **Conflict** |
| Budgets | Does not exist | Tenant or platform? | **Missing entirely** |
| Clinics | Data field on claim | First-class entity with own portal | **Missing entirely** |
| Organization data | Tenant | Tenant | Match |
| Administrative actions | Tenant admin | Split: tenant admin + super admin | **Missing** |

### 3.4 Employee Visibility

| Where | Current | Client Vision | Verdict |
|---|---|---|---|
| Claim records | `employeeName` stored on claim | Anonymous — org should not see names | **Conflict** |
| Employee list | Full name, email, code displayed | Should not be visible to org | **Conflict** |
| Search | By name, email, code | Should not expose names | **Conflict** |
| Claims API | Returns `employeeName`, `employeeId` | Should return anonymized references | **Conflict** |
| History | `actorId` with employee ID | Should not reveal identity | **Conflict** |

### 3.5 Claims Workflow

| Aspect | Current | Client Vision | Verdict |
|---|---|---|---|
| Submission | Employee submits via marketing site | Employee submits (similar) | Match |
| Approval | Tenant admin approves | Tenant admin approves | Match |
| Payment | Tenant admin marks as paid | Vendor invoice flow + Super Admin pays | **Conflict** |
| Reference ID | `RMB-YYYY-NNNNNN` | Unknown | Unclear |
| Attachments | Receipt upload per claim | Similar | Partial match |
| Visibility | Employee name visible | Anonymous | **Conflict** |

### 3.6 Financial Workflow

| Aspect | Current | Client Vision | Verdict |
|---|---|---|---|
| Who approves | Tenant admin | Tenant admin | Match |
| Who owns budgets | No budgets | Unknown (tenant or super admin?) | **Missing** |
| Who processes payments | Tenant admin | Vendor invoice system | **Conflict** |
| Who marks as paid | Tenant admin | Super Admin? | **Conflict** |
| Payment lifecycle | manual status change | Invoice-based workflow | **Missing** |

### 3.7 Clinic Architecture

| Aspect | Current | Client Vision | Verdict |
|---|---|---|---|
| Existence | Data field only (`clinicId`, `clinicName`) | First-class entity | **Missing entirely** |
| Portal | None | Own dashboard | **Missing** |
| Auth | None | Platform users | **Missing** |
| Permissions | None | Manage claims? Provide invoices? | **Missing** |

### 3.8 Domain Model

| Entity | Current | Client Vision | Verdict |
|---|---|---|---|
| `Employee` | Owned by tenant, PIN-based | Platform identity, password-based | Redefine |
| `Claim` (Reimbursement) | Tenant-scoped, employee-named | Anonymous, cross-tenant? | Redefine |
| `Tenant` | Organization | Organization | Match |
| `Clinic` | String field on claim | First-class entity with portal | Split |
| `Budget` | Does not exist | Likely needed | Create |
| `Vendor` | Does not exist | Invoice workflow | Create |
| `User` | Two separate models (TenantUser + Employee) | Unified platform identity? | Merge? |
| `Invoice` | Does not exist | Vendor invoice workflow | Create |

### 3.9 Portals

| Portal | Current | Client Vision | Verdict |
|---|---|---|---|
| Tenant Dashboard | Full CRUD | Similar? | Partial match |
| Employee Portal | Proxy via API key | Self-service portal | Strengthen |
| Super Admin | None | Payout management, oversight | Create |
| Clinic Portal | None | First-class dashboard | Create |

---

## 4. Architectural Gaps

### 4.1 Identity & Authentication (HIGH impact)

**Current:** Two separate auth systems — Tenant Dashboard (bcrypt password + session) and Employee Portal (scrypt PIN, stateless).

**Client expects:** Single identity system where Remedy owns identity, employees self-register with passwords, and email verification confirms accounts.

**Gap:** The employee auth system is fundamentally incompatible. PINs must be replaced with passwords. Identity ownership must shift from tenant to platform. Self-registration flow with email verification is completely missing.

**Impact:** High — touches every auth-related file, data model, and the marketing site integration.

### 4.2 Employee Lifecycle (HIGH impact)

**Current:** Tenant creates employee → employee logs in. Two states: active/inactive.

**Client expects:** Authorized list → invitation → self-registration → email verification → active.

**Gap:** No state machine exists for progressive registration. No authorized list concept. No invitation flow.

**Impact:** High — requires new data model, new states, new API endpoints, new email service.

### 4.3 Anonymous Claims (HIGH impact)

**Current:** `employeeName` stored on every claim record. Employee list shows names. Search indexes names.

**Client expects:** Organizations should not see employee names.

**Gap:** The entire claims module was built on named identity. Removing employee visibility requires changes at every layer — database, services, APIs, UI.

**Impact:** High — cross-cutting change affecting `ReimbursementDocument`, all APIs, list/detail pages, search, history.

### 4.4 Super Admin (HIGH impact — missing entirely)

**Current:** No super admin concept exists. `app/api/admin/reimbursements` provides basic cross-tenant claim visibility but no management.

**Client expects:** Super Admin manages payouts, clinics, vendors, and has cross-tenant oversight.

**Gap:** Entirely new portal, auth system, and permission model needed.

**Impact:** High — new codebase entirely (or new module).

### 4.5 Financial Workflow (MEDIUM impact)

**Current:** Tenant admin approves and marks as paid. Manual status transition.

**Client expects:** Vendor invoice workflow with Super Admin payout management.

**Gap:** No vendor entity, no invoice entity, no budget entity, no payment processing lifecycle.

**Impact:** Medium-High — new entities, new workflow, but existing claim model can be adapted.

### 4.6 Clinic Portal (MEDIUM impact)

**Current:** `clinicId` and `clinicName` are free-text fields on claims.

**Client expects:** Clinics are registered platform entities with their own dashboard, authentication, and responsibilities.

**Gap:** No clinic module at all. No clinic user accounts, no clinic-facing API, no clinic dashboard.

**Impact:** Medium — new module, but loosely coupled to existing architecture.

### 4.7 Budget Management (MEDIUM impact)

**Current:** No budget concept exists. No budget tracking, no budget enforcement.

**Client expects:** Budget management (owner unclear — tenant or super admin).

**Gap:** Entirely new domain concept.

**Impact:** Medium — depends on who owns budgets (tenant vs platform).

### 4.8 Navigation & Portals (LOW impact)

**Current:** Tenant dashboard has navigation. Employee portal is external.

**Client expects:** Multiple portals (tenant, clinic, super admin) with role-based navigation.

**Gap:** Navigation needs to be portal-aware, but the existing sidebar architecture can be extended.

**Impact:** Low — existing navigation system can be adapted.

---

## 5. Risk Assessment

### Safe to Evolve
- **Tenant Dashboard** — core architecture (sessions, middleware, cookies) is well-structured and adaptable
- **Claims data model** — `ReimbursementDocument` can be extended with new statuses and fields without breaking changes
- **Repository pattern** — clean separation of concerns, easy to add new repositories
- **API route structure** — well-organized under `app/api/`, easy to add new routes
- **Language/i18n system** — will support multi-portal copy

### Requires Careful Migration
- **PIN → Password migration** — existing employees have PIN hashes. Migration strategy needed (force password reset on first login?)
- **Identity ownership transfer** — changing `tenantId` scoping to platform-wide identities is a fundamental data model change
- **Anonymous claims** — removing `employeeName` from claims while preserving audit trail requires careful design
- **Employee email** — currently optional/missing for some employees; becomes critical for self-registration
- **Marketing site integration** — the shared API key pattern needs to be replaced with proper auth

### Do Not Assume
- **Who owns budgets** — client spec does not clarify whether tenants or Super Admin controls budgets
- **Vendor invoice flow** — exact workflow between claim approval → vendor invoice → payment is unclear
- **Clinic responsibilities** — whether clinics submit invoices, verify claims, or just receive referrals is unspecified
- **Super Admin scope** — whether Super Admin manages all tenants, only payouts, or has limited oversight is unclear
- **Employee anonymity model** — whether anonymity is claim-level, department-level, or tenant-level is unspecified

---

## 6. Open Questions

These must be discussed with the client before any implementation begins.

### Identity & Auth
1. Should existing employee PIN accounts be migrated to passwords, or should all employees re-register?
2. Does "Remedy owning identity" mean employees have platform-wide accounts (not scoped to a tenant)?
3. Is email the primary identifier for employee accounts?
4. Should the Tenant Dashboard admin accounts merge with the employee identity system?
5. Who handles email verification — Remedy's system or a third-party service?

### Employee Lifecycle
6. What constitutes an "authorized employee list" — CSV upload, HR system integration, manual entry?
7. What is the "pending signup" flow — employee receives email → clicks link → creates password?
8. Should the existing tenant-managed employee creation coexist with self-registration?
9. Are there time limits on invitations?

### Employee Visibility & Anonymity
10. If organizations cannot see employee names, what identifier do they see on claims? (Claim number only? Department-level aggregation?)
11. Can tenant admins still see demographics (age, gender, department) linked to claims anonymously?
12. Who CAN see employee identities — Super Admin only?
13. Does anonymity apply retroactively to existing claims?

### Financial Workflow
14. Who sets and manages budgets — tenant or Super Admin?
15. Is the vendor invoice workflow: claim approved → vendor submits invoice → Super Admin pays?
16. Or: employee submits → clinic verifies → vendor invoices → tenant approves → Super Admin pays?
17. Are there budget caps per employee, per department, per tenant, or per period?
18. What happens when a claim exceeds available budget?

### Clinics
19. What can a clinic do in their portal — view claims, submit invoices, communicate with tenants?
20. Do clinics authenticate via the same identity system as employees?
21. Are clinics tenant-specific or cross-tenant entities?
22. Does the clinic portal need its own dashboard with analytics?

### Super Admin
23. What is the full scope of Super Admin responsibilities?
24. Can Super Admin manage all claims, or only financial/payout aspects?
25. Does Super Admin have tenant creation/deletion capabilities?
26. Should Super Admin have a separate auth system, or use the existing tenant auth model?

### Technical
27. Should the marketing site (employee portal) be integrated into this codebase, or remain separate?
28. Is MongoDB the right database for the new identity and financial entities?
29. Should rate limiting move from in-memory to a persistent store (Redis/Mongo)?
30. What is the expected timeline for the migration from old to new architecture?
