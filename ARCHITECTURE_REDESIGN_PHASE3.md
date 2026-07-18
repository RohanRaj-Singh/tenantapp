# RemedyGCC v2 Architecture Redesign — Phase 3

> **Date:** 2026-07-18
> **Based on:** Phase 1 Audit, Phase 2 Business Rules, Existing Codebase
> **Constraint:** Incremental evolution, not rewrite

---

## 1. Executive Summary

The target architecture evolves the current platform from a **tenant-managed employee claims system** to a **multi-tenant platform with Remedy-owned identity, anonymous claims, clinic integration, and super-admin financial oversight**.

### What stays
- Tenant Dashboard (refactored for new permissions)
- Claims data model (extended)
- Repository pattern
- Session/cookie auth (for tenant dashboard)
- API route structure
- All survey/scanner functionality (unchanged)

### What changes
- Employee PIN auth → Password auth (new identity service)
- Employee identity tenant-scoped → Platform-wide User entity
- Named claims → Anonymous claims (visibility layer)
- Tenant-managed payouts → Super Admin payout oversight
- Clinic data field → Clinic entity with portal

### What's new
- Authorized Employee List (invitation gateway)
- Budget entity
- Vendor Invoice workflow
- Clinic Portal
- Super Admin Portal
- Event notification system

---

## 2. Target Domain Model

### Entity Map

```
User (platform-wide, replaces TenantUser + Employee)
  ├── type: "employee" | "org_admin" | "clinic_staff" | "super_admin"
  ├── email (unique, primary identifier)
  ├── passwordHash (bcrypt)
  ├── emailVerifiedAt
  └── status: "invited" | "pending" | "active" | "disabled"

Organization (unchanged from Tenant)
  ├── name, slug, status
  └── branding, config

OrganizationMembership (NEW — replaces tenantId on Employee)
  ├── userId → User
  ├── organizationId → Organization
  ├── employeeCode (org-scoped identifier)
  ├── status: "authorized" | "registered" | "active" | "inactive"
  └── authorizedById → User (who added them)

AuthorizedEmployeeEntry (NEW — invitation list)
  ├── organizationId → Organization
  ├── email
  ├── employeeCode
  ├── name (for invitation only, not stored on claims)
  ├── status: "pending" | "registered" | "expired"
  ├── invitedAt
  └── invitedBy

Clinic (NEW — first-class entity)
  ├── clinicId
  ├── name, address, license
  ├── status: "pending" | "active" | "suspended"
  └── approvedBy (Super Admin)

ClinicOrganization (NEW — many-to-many)
  ├── clinicId → Clinic
  ├── organizationId → Organization
  └── status: "active" | "inactive"

Claim (REFACTORED from ReimbursementDocument)
  ├── claimId
  ├── claimNumber (platform-wide unique)
  ├── organizationId → Organization
  ├── employeeId → User (NOT exposed to org)
  ├── clinicId → Clinic (optional, when submitted)
  ├── type, amount, description
  ├── receiptUrl, receiptHash, serviceDate
  ├── status: "draft" | "submitted" | "pending_review" | "approved" | "invoiced" | "paid" | "rejected" | "frozen"
  ├── anonymousReference (public-facing ID, e.g. "Claim #42")
  ├── reviewerNotes[]
  ├── history[]
  └── visibility: "identified" | "anonymous" (per-claim flag)

Budget (NEW)
  ├── organizationId → Organization
  ├── period (e.g. "2026-Q3")
  ├── totalAmount
  ├── usedAmount
  ├── committedAmount
  └── status: "active" | "closed"

VendorInvoice (NEW)
  ├── invoiceId
  ├── claimId → Claim
  ├── clinicId → Clinic (payee)
  ├── organizationId → Organization (responsible)
  ├── amount
  ├── status: "draft" | "submitted" | "approved" | "paid" | "disputed"
  ├── invoiceDate
  ├── paidAt
  └── paidBy → User (Super Admin)

Conversation (NEW — claims-level messaging)
  ├── claimId → Claim
  ├── messages[]
  └── participants: [employee, reviewer, clinic]

Notification (NEW)
  ├── userId → User
  ├── type: "claim_approved" | "claim_rejected" | "invoice_ready" | "registration_invite" | etc.
  ├── read
  └── createdAt
```

### Entity Relationship Diagram (Text)

```
User ──< OrganizationMembership >── Organization
User ──< AuthorizedEmployeeEntry >── Organization
User ──< Claim (as employee)
User ──< Claim (as reviewer)
User ──< Conversation

Organization ──< Budget
Organization ──< Claim
Organization ──< VendorInvoice (responsible)
Organization ──< ClinicOrganization >── Clinic

Clinic ──< Claim
Clinic ──< VendorInvoice (payee)
Clinic ──< ClinicOrganization

Claim ──< VendorInvoice
Claim ──< Conversation
```

### Design Decisions

| Decision | Reasoning |
|---|---|
| **User is platform-wide, not tenant-scoped** | Supports employee multi-org, clinic staff, and Super Admin from one identity system |
| **OrganizationMembership replaces `tenantId` on Employee** | Clean separation of identity from organization affiliation |
| **Claim stores `employeeId` internally but exposes `anonymousReference`** | Enables anonymity without destroying the data model; visibility is a permission layer |
| **AuthorizedEmployeeEntry is separate from User** | Allows pre-authorization before an account exists; supports the invitation flow |
| **Clinic-Organization is many-to-many** | Most flexible; a clinic can serve multiple orgs, an org can use multiple clinics |
| **VendorInvoice is separate from Claim** | One claim → one invoice; keeps financial lifecycle independent of claim lifecycle |
| **Budget is period-based per organization** | Simple model that supports annual/quarterly/monthly without over-engineering |

---

## 3. Authentication Architecture

### 3.1 Identity Ownership

**Remedy owns identity.** The `User` entity is platform-wide. Organizations do not own users — they authorize them.

| Who | Owns/Manages |
|---|---|
| **User** (employee/clinic/super admin) | Their own identity (password, email, profile) |
| **Organization** | Authorized employee list, NOT employee accounts |
| **Remedy (Super Admin)** | Platform-wide identity verification, account recovery |

### 3.2 Authentication Flow

```
Primary Identifier: email + password
Secondary: email + magic link (forgot password)

Session: JWT-based, 7-day expiry
  - Access token (short-lived, 15 min)
  - Refresh token (7 days, rotate on use)
```

**Why JWT instead of server-side sessions?**
- The current cookie session pattern stays for Organization Dashboard
- Employee/Clinic portals need stateless auth (no cookie dependency for cross-origin requests)
- JWT enables the marketing site to validate tokens without calling back to tenantapp

### 3.3 Registration Flows

#### Employee Registration (Authorized List)
```
1. Org uploads authorized list → AuthorizedEmployeeEntry created (status: "pending")
2. Employee receives email with signup link
3. Employee clicks link → creates password
4. Email verified (link or code)
5. User + OrganizationMembership created (status: "active")
6. AuthorizedEmployeeEntry updated to "registered"
```

#### Clinic Registration
```
1. Clinic submits registration (name, license, contact)
2. Super Admin reviews and approves
3. Clinic user receives invitation email
4. Creates password → User created with type "clinic_staff"
5. Clinic entity set to "active"
```

#### Organization Admin (existing migration)
```
1. Current TenantUser accounts become User (type: "org_admin")
2. Existing password hashes migrate directly (both bcrypt)
3. OrganizationMembership created linking to their organization
```

### 3.4 What Changes from Current Implementation

| Current | Future | Migration |
|---|---|---|
| `EmployeeDocument` with PIN hash | `User` with bcrypt password | New accounts use passwords; existing PIN accounts forced to reset on first login |
| `TenantUser` separate | Merged into `User` | Migrate existing TenantUser records to User with same password hashes |
| No email verification | Email verification on registration | New flow; no migration needed for existing users |
| Tenant-managed PIN reset | Self-service password reset (email) | New flow; org can still trigger reset |
| In-memory rate limiting | Persistent rate limiting (MongoDB/Redis) | Gradual migration; in-memory works for MVP |

---

## 4. Authorization Architecture

### 4.1 Role Definitions

| Role | Responsibilities |
|---|---|
| **Super Admin** | Platform-wide: manage orgs, clinics, process payouts, view all claims (identified), access audit logs |
| **Organization Admin** | Manage authorized employee list, review claims (anonymous), manage budgets, view org reports |
| **Organization Finance** | Budget management, invoice approval (subset of Org Admin) |
| **Claims Reviewer** | Review and approve/reject claims within scope — no budget or employee list access |
| **Employee** | Submit claims, view own claim history, update profile, participate in conversations |
| **Clinic Staff** | View claims referencing their clinic, submit invoices, participate in conversations |
| **Unregistered User** | Registration only |

### 4.2 Visibility Matrix

| Data | Super Admin | Org Admin | Org Finance | Claims Reviewer | Employee | Clinic Staff |
|---|---|---|---|---|---|---|
| Employee identity (name, email) | Full | **None** | None | None | Own only | None |
| Claim details (anonymous ref) | Full | Full | Full | Full | Own only | Their clinic's |
| Claim details (employee name) | Full | **Cannot see** | Cannot see | Cannot see | Own only | Cannot see |
| Claim history with reviewer names | Full | Own org only | Own org only | Own actions only | Own claims only | Their clinic's |
| Budget data | All orgs | Own org | Own org | **Cannot see** | Cannot see | Cannot see |
| Vendor invoices | All | Own org | Own org | Cannot see | Cannot see | Their clinic's |
| Employee list | Full | **Cannot see names** | Cannot see | Cannot see | Cannot see | Cannot see |
| Organization settings | Full | Own org | Cannot edit | Cannot edit | Cannot edit | Cannot edit |
| Clinic data | Full | Their clinics only | N/A | N/A | Can see assigned clinics | Their own |

**Key principle:** Employee identity is visible to Super Admin only. Organizations see anonymous claims.

### 4.3 Authorization Enforcement

- **API gateway middleware** checks role on every request
- **Current pattern** (`requireTenantApiAuth()`) extends to `requireRole("org_admin")` / `requireRole("super_admin")`
- **Data-level filtering** in service layer (e.g., `listClaims(orgId)` strips `employeeId` and `employeeName` for non-super-admin roles)
- **Claim ownership** is implicit — employees always see their own claims

---

## 5. Employee Lifecycle

### 5.1 State Machine

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    v                                             │
            ┌──────────────┐                                      │
  Org adds  │  AUTHORIZED   │  (AuthorizedEmployeeEntry)          │
  ─────────>│  (invited)    │                                      │
            └──────┬───────┘                                      │
                   │                                              │
            Email sent with signup link                            │
                   │                                              │
                   v                                              │
            ┌──────────────┐                                      │
            │  INVITED     │  (link sent, awaiting action)         │
            └──────┬───────┘                                      │
                   │                                              │
           User clicks link                                        │
                   │                                              │
                   v                                              │
            ┌──────────────┐                                      │
            │  PENDING     │  (email not yet verified)            │
            └──────┬───────┘                                      │
                   │                                              │
           Email verified                                          │
                   │                                              │
                   v                                              │
            ┌──────────────┐      Org deactivates                  │
            │  ACTIVE      │ ──────────────────> ┌──────────────┐  │
            └──────┬───────┘                     │  INACTIVE    │  │
                   │                             └──────┬───────┘  │
              Reactivate                                │          │
              (by org)          Org deactivates         │          │
              <─────────────────────────────────────────┘          │
                                                                   │
            Org removes from authorized list                       │
            OR employee requests account deletion                  │
                   │                                              │
                   v                                              │
            ┌──────────────┐                                      │
            │  REMOVED     │  (claims preserved, identity hidden) │
            └──────────────┘                                      │
```

### 5.2 Entity State Transitions

| State | User record | OrganizationMembership | AuthorizedEmployeeEntry |
|---|---|---|---|
| Pre-authorization | — | — | `pending` |
| Invited | — | — | `invited` |
| Pending | `status: pending`, `emailVerifiedAt: null` | `status: pending` | `registered` |
| Active | `status: active`, `emailVerifiedAt: set` | `status: active` | `registered` |
| Inactive | `status: active` | `status: inactive` | — (can be re-added) |
| Removed | `status: disabled` | — | — (archived) |

### 5.3 What Changes

| Aspect | Current | Future |
|---|---|---|
| States | `active`, `inactive` | `authorized`, `invited`, `pending`, `active`, `inactive`, `removed` |
| Who creates | Org admin directly | Org pre-authorizes → user self-registers |
| Email | Optional on creation | Required for registration |
| Employee code | Always assigned on creation | Assigned on authorization; visible to user only |
| Identity hidden on deactivation | No — stays visible | Yes — org sees "Deactivated Employee" |

---

## 6. Claims Architecture

### 6.1 Status Lifecycle

```
                     ┌──────────┐
                     │  DRAFT   │  (employee still editing)
                     └────┬─────┘
                          │
                     Employee submits
                          │
                          v
                     ┌──────────┐
               ┌────>│ SUBMITTED│ ────> Org approves ───> go to APPROVED
               │     └────┬─────┘
               │          │
               │     Employee edits    Org rejects
               │          │                 │
               │          v                 v
               │     ┌──────────┐    ┌──────────┐
               └─────│  DRAFT   │    │ REJECTED │  (terminal, or appeal → resubmit)
                     └──────────┘    └──────────┘

  APPROVED ──> Org freezes ──> FROZEN ──> Org unfreezes ──> APPROVED
       │
       │  (vendor invoice submitted)
       v
  ┌──────────┐
  │ INVOICED │ ──> Super Admin pays ──> PAID
  └──────────┘
       │
       │  Dispute
       v
  ┌──────────┐
  │ DISPUTED │ ──> Resolved ──> back to INVOICED or REJECTED
  └──────────┘
```

### 6.2 What Changes from Current

| Aspect | Current | Future |
|---|---|---|
| Statuses | pending, approved, rejected, frozen, paid | draft, submitted, pending_review, approved, invoiced, paid, rejected, frozen, disputed |
| Claim owner | Tenant-scoped | Organization-scoped (employee identified internally) |
| Employee visibility | `employeeName` stored on doc | Anonymous ref shown to org; `employeeId` kept internally |
| Who creates | Employee or Org Admin | Employee only |
| Approval | Single step | Single (configurable for multi-step later) |
| Payment | Tenant marks as paid | Super Admin pays via vendor invoice workflow |
| Receipt | Optional, single file | Optional, single file (can extend later) |

### 6.3 Anonymous Reference Strategy

Claims have two face values:
- **Internal:** `claimNumber = "RMB-YYYY-NNNNNN"` (visible to Super Admin, employee)
- **External:** `anonymousReference = "Claim #42"` (visible to org, clinic)

The mapping is stored on the claim document. Orgs see the anonymous reference in all contexts.

---

## 7. Financial Architecture

### 7.1 End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  BUDGET PHASE                                                       │
│                                                                     │
│  Organization sets Q3 budget: $50,000                               │
│  Budget entity created: total=$50,000, used=$0, committed=$0        │
│                                                                     │
│  Employee submits $500 claim                                         │
│  → $500 reserved (budget.committed += $500)                         │
│                                                                     │
│  Org approves $500 claim                                             │
│  → $500 committed stays committed                                   │
└─────────────────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────────┐
│  INVOICE PHASE                                                      │
│                                                                     │
│  Clinic submits invoice for $500 (linked to approved claim)         │
│  Invoice status: "submitted"                                        │
│                                                                     │
│  Super Admin reviews invoice                                         │
│  → Approves → status: "approved"                                    │
│  → Disputes → status: "disputed"                                    │
└─────────────────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────────┐
│  PAYMENT PHASE                                                      │
│                                                                     │
│  Super Admin processes payout                                       │
│  → Invoice status: "paid"                                           │
│  → Claim status: "paid"                                             │
│  → Budget usage: budget.used += $500, budget.committed -= $500     │
│                                                                     │
│  OR Remedy invoices organization (if pass-through model)            │
│  → Organization pays Remedy                                         │
│  → Remedy pays clinic                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Budget Entity Behavior

```
Budget {
  organizationId, period, totalAmount
  usedAmount:    claims that reached PAID
  committedAmount:  approved claims awaiting invoice/payment
  remaining(): totalAmount - usedAmount - committedAmount
}

Rules:
- A claim cannot be approved if it exceeds remaining budget
- When a claim is rejected, committed amount is released
- When a claim is paid, committed → used
- Budget is NOT consumed at submission — only at approval
```

### 7.3 What Changes

| Aspect | Current | Future |
|---|---|---|
| Budget | Does not exist | Per-org, per-period budget entity |
| Payment | Org admin sets status to "paid" | Super Admin processes payout |
| Invoicing | None | Clinic submits invoice → Super Admin pays |
| Org billing | None | Remedy may invoice organizations (TBD — requires client clarification Q5.4) |
| Financial audit | Claim history only | Separate Invoice + Payment entities with full audit trail |

---

## 8. Clinic Architecture

### 8.1 Relationships

```
Clinic
  ├── Many-to-Many: Organization (via ClinicOrganization)
  ├── One-to-Many: Claim (optional — claims referencing this clinic)
  ├── One-to-Many: VendorInvoice (payee)
  └── One-to-Many: User (clinic staff accounts)

ClinicOrganization
  ├── status: "active" | "inactive"
  └── Enables clinic to serve an organization

Clinic Portal capabilities:
  1. View claims assigned to their clinic (anonymous reference only — no employee names)
  2. Submit invoices for approved claims
  3. View invoice history and payment status
  4. Participate in conversations on claims
  5. Update clinic profile (address, contact)
  6. View aggregated reports (claim volume, payment totals)
```

### 8.2 Registration

```
1. Clinic fills registration form → creates Clinic (status: "pending")
2. Super Admin reviews license/documentation
3. Super Admin approves → Clinic status: "active"
4. Clinic staff invited (email → password setup)
5. Super Admin or Org Admin links clinic to organizations via ClinicOrganization
```

### 8.3 What's New

| Aspect | Current | Future |
|---|---|---|
| Clinic existence | String field on claim | Full entity with repositories, services, API routes |
| Clinic portal | None | Dedicated dashboard with auth |
| Clinic claims view | None | Can see claims referencing their clinic |
| Invoicing | None | Can submit invoices against approved claims |
| Multi-org | N/A | Many-to-many via ClinicOrganization |

---

## 9. Portal Responsibilities

### 9.1 Portal Map

| Portal | Users | Primary URL |
|---|---|---|
| **Super Admin** | Super Admin | `/admin` (new) |
| **Organization Dashboard** | Org Admin, Finance, Claims Reviewer | `/dashboard` (refactored) |
| **Employee Portal** | Employees | External marketing site (unchanged) or new `/portal` |
| **Clinic Portal** | Clinic staff | `/clinic` (new) |

### 9.2 Organization Dashboard (Refactored Current)

**Keep:** Navigation, filters, survey/scanner analytics, executive summary
**Refactor:** Employee management → authorized list management
**Add:** Budget management, claim queue (anonymous), org reporting

### 9.3 Super Admin (New)

**New features:**
- Tenant/clinic management (create, suspend, approve)
- Global claim queue (identified — can see employee names)
- Payout processing (approve invoices, mark as paid)
- Budget oversight (view all org budgets)
- Identity management (account recovery, dispute resolution)
- Global reporting and analytics

### 9.4 Employee Portal (Refactored)

**Keep:** Claim submission, claim history, receipt upload
**Add:** Self-registration, profile management, conversation view

### 9.5 Clinic Portal (New)

View claims, submit invoices, conversations, reporting.

---

## 10. Database Migration Strategy

### 10.1 Entity Classification

| Current Entity | Action | Reasoning |
|---|---|---|
| `TenantDocument` | **Keep** → rename to Organization | Core entity — add fields, preserve data |
| `TenantUser` | **Replace** → merged into User | Separate collection merged into single identity |
| `TenantSession` | **Replace** → JWT/refresh tokens | Current sessions keep working for dashboard; new portals use JWT |
| `EmployeeDocument` | **Split** → User + OrganizationMembership + AuthorizedEmployeeEntry | Identity (User) separated from org affiliation |
| `ReimbursementDocument` | **Refactor** → Claim | Extend statuses, add anonymous ref, add `visibility` flag |
| `AuditEventDocument` | **Keep** — extend action types | Core audit infrastructure stays |
| `RuntimeConfig` / `ScannerVersion` / `AttributeTemplate` | **Keep unchanged** | Survey/scanner system is independent |
| `RawResponse` / `AggregationSnapshot` | **Keep unchanged** | Dashboard analytics pipeline unaffected |
| — | **New:** Budget | Missing entity — create |
| — | **New:** VendorInvoice | Missing entity — create |
| — | **New:** Clinic | Missing entity — create |
| — | **New:** ClinicOrganization | Missing entity — create |
| — | **New:** Conversation | Missing entity — create |
| — | **New:** Notification | Missing entity — create |
| — | **New:** AuthorizedEmployeeEntry | Missing entity — create |

### 10.2 Data Migration (Non-Destructive)

| Migration | Strategy |
|---|---|
| `TenantUser` → `User` | Copy all TenantUser records to User collection with `type: "org_admin"`. Keep TenantUser collection as-is for rollback. |
| `EmployeeDocument` → `User` + `OrganizationMembership` | For each Employee, create User (with placeholder password requiring reset), create OrganizationMembership. Keep Employee collection for rollback. |
| `Employee.pinHash` | Do NOT migrate. Existing employees must set a password on first login. Set `mustChangePassword: true`. |
| `ReimbursementDocument` | Add `anonymousReference` field (populate as "Claim #N"). Add `visibility: "identified"` flag. Existing claims remain identified (can be toggled). |
| Remove `employeeName` from claims | Optional — can be kept in DB but filtered at API layer. Recommend keeping for Super Admin visibility. |

---

## 11. API Evolution Plan

### 11.1 Current Endpoints

| Method | Path | Action | Future |
|---|---|---|---|
| GET | `/api/employees` | List employees (tenant-scoped) | **Refactor** → list authorized entries, not identities |
| POST | `/api/employees` | Create employee | **Deprecate** → replaced by authorized list upload |
| GET | `/api/employees/:id` | Employee detail | **Refactor** → org sees anonymous, Super Admin sees identified |
| POST | `/api/employee/login` | Employee PIN login | **Replace** → password-based login via `/api/auth/login` |
| GET | `/api/employee/me` | Employee profile | **Refactor** → use JWT token instead of tenantSlug + employeeCode |
| GET | `/api/employee/tenants` | List active tenants | **Keep** (exists for marketing site) |
| POST | `/api/employee/reimbursements` | Create claim | **Refactor** → create with JWT identity instead of API key |
| GET | `/api/employee/reimbursements` | List employee claims | **Refactor** → use JWT identity |
| POST | `/api/employee/receipts` | Upload receipt | **Keep** — auth changes to JWT |
| GET | `/api/reimbursements` | List claims (tenant) | **Refactor** → list anonymous claims for org; add visibility flag |
| POST | `/api/reimbursements` | Create claim (by org admin) | **Deprecate** — only employees should create claims |
| GET | `/api/reimbursements/:id` | Claim detail | **Refactor** → visibility-based filtering |
| POST | `/api/reimbursements/:id/approve` | Approve claim | **Keep** — org admin approves |
| POST | `/api/reimbursements/:id/reject` | Reject claim | **Keep** |
| POST | `/api/reimbursements/:id/freeze` | Freeze claim | **Keep** |
| POST | `/api/reimbursements/:id/pay` | Mark as paid | **Deprecate** → replaced by Super Admin invoice payment |
| GET | `/api/admin/reimbursements` | Cross-tenant claims (admin) | **Refactor** → part of Super Admin portal |
| POST | `/api/admin/receipts` | Receipt admin endpoint | **Keep** |
| GET | `/api/dashboard/metrics` | Dashboard metrics | **Keep unchanged** |

### 11.2 New Endpoints Required

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Employee self-registration (with invite token) |
| POST | `/api/auth/login` | Password-based login → JWT tokens |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/verify-email` | Verify email with code |
| POST | `/api/organizations/:id/authorized-list` | Upload/bulk-add authorized employees |
| GET | `/api/organizations/:id/authorized-list` | List authorized entries |
| GET | `/api/organizations/:id/budgets` | List org budgets |
| POST | `/api/organizations/:id/budgets` | Set org budget |
| GET | `/api/clinics` | List clinics (Super Admin) |
| POST | `/api/clinics` | Register clinic (public) or create (Super Admin) |
| GET | `/api/clinics/:id` | Clinic detail |
| POST | `/api/clinics/:id/approve` | Super Admin approves clinic |
| POST | `/api/invoices` | Clinic submits invoice |
| GET | `/api/invoices` | List invoices (filtered by role) |
| POST | `/api/invoices/:id/approve` | Super Admin approves invoice |
| POST | `/api/invoices/:id/pay` | Super Admin marks invoice as paid |
| POST | `/api/conversations` | Create message on claim |
| GET | `/api/conversations/:claimId` | List conversation on claim |
| GET | `/api/notifications` | List user notifications |
| GET | `/api/admin/claims` | Super Admin: all claims (identified) |
| GET | `/api/admin/organizations` | Super Admin: manage organizations |

---

## 12. Migration Classification

### 12.1 Subsystem Classification

| Subsystem | Classification | Justification |
|---|---|---|
| **Survey/Scanner Engine** | **Reuse** | Unchanged — independent of identity/claims |
| **Dashboard Analytics** | **Reuse** | Unchanged — aggregates from survey data |
| **Runtime Config** | **Reuse** | Unchanged |
| **Language/i18n System** | **Reuse** | Unchanged |
| **Repository Pattern** | **Reuse** | Well-designed, can be extended |
| **Organization Dashboard Navigation** | **Refactor** | Add new nav items, remove employee list |
| **Tenant Auth (sessions, middleware)** | **Refactor** | Keep for dashboard; add JWT for other portals |
| **Claims API (tenant routes)** | **Refactor** | Add anonymous ref, visibility filtering |
| **ReimbursementService** | **Refactor** | Extend status machine, add anonymous ref logic |
| **Employee Auth (PIN)** | **Replace** | Entirely replaced by password + JWT |
| **Employee Service** | **Replace** | Split into User + OrganizationMembership services |
| **Employee Repository** | **Refactor** | Preserve for data migration; new User repo added |
| **Admin Routes** | **Refactor** | Extend into Super Admin module |
| **Seed Script** | **Refactor** | Update to create User records |
| **Employee Portal API** | **Refactor** | Replace API key with JWT; add registration endpoints |
| **Super Admin Module** | **New** | Does not exist |
| **Clinic Module** | **New** | Does not exist |
| **Budget Module** | **New** | Does not exist |
| **Vendor Invoice Module** | **New** | Does not exist |
| **Conversation/Messaging** | **New** | Does not exist |
| **Notification System** | **New** | Does not exist |
| **Authorized List Management** | **New** | Does not exist |

### 12.2 Migration Complexity

| Complexity | Subsystems |
|---|---|
| **Low** (weeks) | Survey/Scanner reuse, Dashboard reuse, Language system reuse, Budget module, Conversation module |
| **Medium** (months) | Refactor claims API, refactor org dashboard, new clinic module, new notification system, authorized list |
| **High** (months, careful) | Identity system replacement (Employee → User), PIN → password migration, anonymous claim visibility layer |
| **Very High** (foundational) | Super Admin portal, vendor invoice workflow, financial integration |

---

## 13. Implementation Roadmap

### Milestone 1: Identity Foundation
**Dependencies:** None
**Risk:** Low — new code, no migration needed yet
**Deliverables:**
- User entity + repository
- OrganizationMembership entity + repository
- Password-based auth service (login, register, forgot/reset password)
- JWT token service (access + refresh)
- Email verification service (stub — can use console in MVP)
- `/api/auth/*` endpoints

### Milestone 2: Authorized Employee List
**Dependencies:** Milestone 1
**Risk:** Medium — introduces new invitation flow alongside existing employee creation
**Deliverables:**
- AuthorizedEmployeeEntry entity + repository
- Bulk upload endpoint + CSV parsing
- Invitation email flow (stub)
- Self-registration endpoint (validates invite token)
- Organization admin UI for managing list

### Milestone 3: Claims Refactor — Anonymous & Extended Statuses
**Dependencies:** Milestone 1
**Risk:** Medium — requires careful data migration for existing claims
**Deliverables:**
- Add `anonymousReference`, `visibility` to Claim document
- Extend status machine (draft, submitted, pending_review, invoiced, disputed)
- Visibility filtering in Claims service (strip employee name for non-super-admin)
- Migrate existing claims to new schema
- Remove `employeeName` from list/detail APIs for org roles

### Milestone 4: Budget Engine
**Dependencies:** Milestone 3
**Risk:** Low — new entity, no existing data migration
**Deliverables:**
- Budget entity + repository
- Budget service (reserve, commit, release, consume)
- Claim approval gate (check remaining budget)
- Org admin budget management UI

### Milestone 5: Vendor Invoice & Payout
**Dependencies:** Milestones 3, 4
**Risk:** High — requires client clarification on payment model (Q5.3, Q5.4)
**Deliverables:**
- VendorInvoice entity + repository
- Invoice submission by clinic
- Invoice approval workflow (Super Admin)
- Payout processing
- Claim → Invoice → Payment state machine wiring

### Milestone 6: Clinic Portal
**Dependencies:** Milestones 1, 5
**Risk:** Medium — new portal, reusable patterns from org dashboard
**Deliverables:**
- Clinic entity + repository
- ClinicOrganization many-to-many entity
- Clinic registration flow
- Clinic staff auth (reuses Milestone 1 identity)
- Clinic dashboard (claim view, invoice submission, basic reporting)

### Milestone 7: Super Admin Portal
**Dependencies:** Milestones 1, 5, 6
**Risk:** Medium — aggregates data from all subsystems
**Deliverables:**
- Super Admin role + auth guard
- Global claim queue (identified view)
- Organization management UI
- Clinic approval workflow
- Payout dashboard
- Cross-tenant reporting

### Milestone 8: Conversations & Notifications
**Dependencies:** Milestone 3
**Risk:** Low — new features, adds UX value
**Deliverables:**
- Conversation entity + message sub-entity
- Claim-scoped conversation API
- Notification entity + service
- WebSocket/SSE for real-time updates (optional)

### Milestone 9: Legacy Deprecation
**Dependencies:** All prior milestones
**Risk:** Medium — requires cutover planning
**Deliverables:**
- Deprecate `/api/employee/login` (PIN) — redirect to `/api/auth/login`
- Deprecate `/api/employees` POST (admin creates employee)
- Deprecate `/api/reimbursements/:id/pay` (org marks as paid)
- Remove x-admin-api-key pattern
- Archival of `EmployeeDocument` collection (read-only)
- Archival of `TenantUser` / `TenantSession` collections (after migration verified)

---

## 14. Risk Assessment

### 14.1 High-Risk Migrations

| Risk | Subsystem | Mitigation |
|---|---|---|
| **Data loss during identity migration** | Employee → User | Keep old collections intact during migration; dual-write where possible |
| **Existing employee lockout** | Auth migration | Force password reset on first login; communicate the change |
| **Claim visibility regressions** | Claims anonymity layer | Feature-flag anonymous mode; roll back to "identified" instantly if issues arise |
| **Budget overcommitment** | Financial | Budget enforcement is soft (warn) during MVP, hard (block) after validation |
| **Payment double-processing** | Vendor invoices | Idempotency keys on invoice payment; claim status gate prevents double-pay |

### 14.2 Areas Requiring Client Confirmation Before Implementation

From Phase 2 critical questions:
1. **Q2.1** — Identity ownership model (platform-wide vs. org-scoped) affects Milestone 1
2. **Q4.1** — Claim status semantics (what "approved" means) affects Milestones 3, 5
3. **Q5.3** — Vendor invoice flow (who pays whom) affects Milestones 5, 6
4. **Q5.4** — Payment responsibility (Remedy vs. org pays) affects Milestones 5, 7
5. **Q7.1** — Anonymity scope (claim-level vs. portal-wide) affects Milestone 3
6. **Q5.1** — Budget model (per-org, per-dept, per-employee) affects Milestone 4

### 14.3 Maximum Reuse Opportunities

| Current Code | How It's Preserved |
|---|---|
| `ReimbursementDocument` | Extended to Claim; no data loss |
| `ReimbursementService` | Refactored — add new statuses, keep existing logic |
| `ReimbursementRepository` | Extended — add new indexes, same collection |
| `EmployeesRepository` | Preserved during migration, then read-only |
| `TenantRepository` | Renamed → OrganizationRepository (same data) |
| `requireTenantApiAuth()` | Extended to `requireRole()` — same pattern |
| Dashboard components | Refactored navigation, kept analytics |
| Survey/scanner pipeline | Entirely unchanged |
| Language/i18n system | Unchanged |
| Repository context pattern | Unchanged |

### 14.4 Technical Debt from Delaying Changes

| Deferred Change | Impact |
|---|---|
| **Real-time notifications** (Milestone 8) | Users must refresh to see claim status updates — acceptable for MVP |
| **Conversations** (Milestone 8) | Communication happens via email/phone — no data loss |
| **Clinic portal full features** (Milestone 6) | Clinics continue using existing workflows temporarily |
| **Legacy employee doc removal** (Milestone 9) | Dual collections during migration — adds operational complexity |

---

## 15. Summary of Architecture Decisions

| Decision | Recommendation | Basis |
|---|---|---|
| Identity model | Platform-wide User, not tenant-scoped | Phase 2 Q2.1 resolution required, but most scalable |
| Auth protocol | JWT for portals, sessions for dashboard | Existing dashboard auth unchanged; JWT for cross-origin employee/clinic |
| Claims anonymity | DB stores ID, API filters visibility | Backward compatible, reversible, no data migration risk |
| Budget model | Per-org, per-period | Simple, covers most common case; can extend later |
| Clinic relationship | Many-to-many with Organization | Most flexible, no rework if client requirements change |
| Vendor invoice | Separate entity from Claim | Keeps financial lifecycle independent |
| Portal separation | Auth gateway routes by role | Single codebase, multiple portals; no separate deployments |
| Migration | Collections preserved, new entities alongside | Zero risk; old data stays until verified migrated |
| Implementation order | Identity first, then claims, then financial, then portals | Identity is foundational; financial requires client clarity |

---

This document is a recommendation. All critical decisions require client confirmation per Phase 2 before implementation begins.
