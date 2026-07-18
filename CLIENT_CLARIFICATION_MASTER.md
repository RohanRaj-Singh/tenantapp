# RemedyGCC v2 — Master Client Clarification Document

> **Derived from:**
> - Phase 1 — Architecture Audit (current system vs. client vision)
> - Phase 2 — Business Rules & Requirements Validation
> - Phase 3 — Target Architecture & Migration Strategy
>
> **Purpose:** This document consolidates every unresolved business rule, ambiguity, and open question across all three phases. Every question here must be answered by the client before or during implementation. No assumptions have been made.

---

## How to Use This Document

Questions are grouped by domain and numbered sequentially (Q1–Q82). Each includes:
- **The question** (with specific options where applicable)
- **Why it matters** — the architectural subsystem affected
- **Priority** — Critical (blocks architecture) / Important (shapes future) / Future (nice to clarify)

---

## 1. Identity & Authentication

### Q1 — Identity Ownership Model

When the client says "Remedy owns identity management," which of these best describes the intent?

| Option | Meaning |
|---|---|
| (a) Platform-wide accounts | Employees have platform-level User accounts not scoped to any organization. Organization membership is a separate relationship. |
| (b) Remedy holds the registry | Remedy maintains the authoritative employee list. Organizations reference platform identities. Employee records stay tenant-scoped but Remedy manages the source of truth. |
| (c) Auth infrastructure only | Remedy provides login/logout infrastructure. Organizations still create and manage their own employee records. The change is primarily PIN-to-password. |

**Why it matters:** This is the root decision. (a) requires a new `User` entity detached from `Tenant`. (b) adds a platform identity layer on top of the existing Employee model. (c) is minimal — mostly switching PIN to password.

**Priority: CRITICAL** — every downstream design decision flows from this.

---

### Q2 — Primary Login Identifier

What does an employee enter to log in?

| Option | Example |
|---|---|
| Email + password | `ahmed@company.com` + `********` |
| Employee code + password | `OMT-001` + `********` |
| Email OR employee code + password | Either works |
| Phone number + password | `+968-XXXX-XXXX` + `********` |

**Why it matters:** The login API, database uniqueness constraints, and session model all depend on the identifier. Currently the system uses `tenantSlug + employeeCode` as the composite key.

**Priority: CRITICAL**

---

### Q3 — Relationship Between Tenant Dashboard Admin and Employee Identity

Currently there are two separate user types:
- **TenantUser** (dashboard admin) — bcrypt password, session-based, manages the organization
- **EmployeeDocument** — scrypt PIN, stateless, submits claims

Should the v2 system:
- (a) Merge both into a single `User` entity with role-based permissions (org_admin vs employee)?
- (b) Keep them as separate entities but both use the password auth system?
- (c) Keep them separate — dashboard stays on sessions, employees move to JWT?

**Why it matters:** A single User entity simplifies the identity system but requires migrating two separate collections. Keeping them separate allows independent evolution.

**Priority: IMPORTANT**

---

### Q4 — Authorized Employee List

When an organization uploads an "authorized employee list":

**Q4a — What fields are on the list?**
- Name, email, employee code?
- Department, role, manager?
- Is email required or optional?

**Q4b — Automatic or pre-authorization?**
- Does uploading the list automatically create platform accounts (status: invited)?
- Or does it only pre-authorize — accounts are created only when the employee completes registration?

**Q4c — Can the same email appear on multiple organizations' lists?**

**Q4d — One-time upload or living document?**
- Is the list uploaded once and then forgotten?
- Or does it sync — new additions send invitations, removals trigger deactivation?

**Why it matters:** Defines the boundary between org-managed identity and platform-managed identity. Determines whether the import creates records immediately or creates a separate authorization entity.

**Priority: IMPORTANT**

---

### Q5 — Self-Registration Flow

What is the exact flow from "authorized" to "active"?

| Option | Flow |
|---|---|
| (a) Invitation link | Org uploads list → employee receives email → clicks link → creates password → account activated |
| (b) Auto-create | Org uploads list → accounts created automatically → employee receives credentials → forced to set password on first login |
| (c) Open signup with gate | Employee signs up directly → system checks authorized list → if matched, allows registration to proceed |

**Why it matters:** Defines the account state machine (invited → pending → verified → active), email notification requirements, and whether registration is invitation-only or public.

**Priority: IMPORTANT**

---

### Q6 — Email Verification

**Q6a — Is email verification required before an employee can access the system?**
- If yes, what actions are available before verification? (Log in? View profile? Submit claims?)
- Can the employee submit claims before their email is verified?

**Q6b — Who sends verification emails?**
- Remedy's own system?
- A third-party provider (SendGrid, AWS SES, etc.)?

**Q6c — Verification expiry and retry**
- Does the verification link expire? After how long?
- Can the organization resend verification emails?
- Can the employee request a new verification email?

**Why it matters:** Email verification adds state machine complexity, async notification infrastructure, and affects the minimum viable employee lifecycle.

**Priority: IMPORTANT**

---

### Q7 — Password Ownership & Management

**Q7a — Who resets forgotten passwords?**
- Self-service (employee clicks "Forgot password" → email → reset)?
- Organization admin (admin triggers reset → employee receives temporary password)?
- Both?

**Q7b — Is there a "forgot password" flow?**
- If yes, does it require email to be verified first?

**Q7c — Password policies**
- Minimum length? Complexity requirements (uppercase, numbers, symbols)?
- Password expiry (90 days? Never?)
- Can organizations enforce custom password policies for their employees?

**Why it matters:** Self-service reset requires email verification. Org-managed reset keeps the current admin-driven model. Password policies affect the auth service.

**Priority: IMPORTANT**

---

### Q8 — Account Deactivation

**Q8a — Who can deactivate an employee?**
- Organization admin only?
- Super Admin?
- The employee themselves?

**Q8b — What happens to pending claims when an employee is deactivated?**
- Claims continue processing (anonymously)?
- Claims are frozen?
- Claims are rejected?

**Q8c — Is deactivation reversible?**
- Can a deactivated employee be reactivated with their data intact?
- Or is deactivation permanent?

**Why it matters:** Deactivation policy affects claim lifecycle, data retention, and audit trail requirements.

**Priority: IMPORTANT**

---

### Q9 — Multi-Organization Identity

If Remedy owns identity, can a single employee account belong to multiple organizations?

- If yes, does the employee have a separate claim history per organization?
- Do they log in once and switch between organizations?
- Or do they need separate accounts per organization?

**Why it matters:** Multi-org identity changes the User → Organization relationship from a tree (one org, many employees) to a graph (many users, many orgs).

**Priority: IMPORTANT**

---

### Q10 — Public User Registration

Are there any public users who do not belong to an organization?
- For example, independent users who purchase wellness services directly from clinics?
- Or is every user always affiliated with an organization?

**Why it matters:** If public (non-org) users exist, the identity system needs an "unaffiliated" user type.

**Priority: FUTURE**

---

## 2. Authorization & Roles

### Q11 — Complete Role List

What roles does the platform need?

| Role | Responsibilities (suggested) | Exists today? |
|---|---|---|
| Super Admin | Platform oversight, payouts, manage orgs and clinics | No |
| Organization Admin | Manage authorized list, review claims, manage budgets | Partial (TenantUser) |
| Organization Finance | Budget management only | No |
| Claims Reviewer | Review and approve/reject claims only | No |
| Employee | Submit claims, view own history | Partial (Employee) |
| Clinic Staff | View clinic-linked claims, submit invoices | No |
| Clinic Manager | Same as staff + manage clinic profile and users | No |

**Q11a — Is this list complete? Are any roles missing?**

**Q11b — Should "Organization Finance" be a separate role, or is it a permission within Org Admin?**

**Q11c — Should "Claims Reviewer" be a separate role, or does any Org Admin automatically have review permissions?**

**Why it matters:** The role hierarchy determines the entire permission model. Missing roles discovered mid-implementation cause rework.

**Priority: CRITICAL**

---

### Q12 — Role Overlap

Can one person hold multiple roles?

| Scenario | Allowed? |
|---|---|
| Person is Organization Admin AND Employee at the same org | ? |
| Person is Clinic Staff AND Organization Admin | ? |
| Person is Clinic Manager AND Super Admin | ? |
| Person is Organization Admin for multiple organizations | ? |

**Why it matters:** Multi-role support changes User → Role from a single assignment to many-to-many.

**Priority: IMPORTANT**

---

### Q13 — Role Hierarchy & Delegation

If an organization has multiple admins:

**Q13a — Do all admins have identical permissions?**
- Or can the primary admin delegate specific scopes (claims-only, finance-only)?

**Q13b — Is there a hierarchy?**
- Super Admin > Org Admin > Reviewer?
- Or are roles flat with distinct permission sets?

**Why it matters:** Granular sub-roles add significant complexity. Start simple.

**Priority: IMPORTANT**

---

### Q14 — Super Admin Scope

What exactly can Super Admin do?

| Capability | Yes/No |
|---|---|
| View all claims (with employee names visible) | ? |
| View all claims (anonymous only) | ? |
| Process payouts | ? |
| Approve/reject any claim | ? |
| Override organization claim decisions | ? |
| Create, suspend, or delete organizations | ? |
| Approve or suspend clinics | ? |
| Access employee identities (names, emails) | ? |
| View financial data across all orgs | ? |
| Create Super Admin accounts | ? |

**Why it matters:** Super Admin scope cannot be designed without explicit boundaries. Currently no Super Admin exists.

**Priority: CRITICAL**

---

### Q15 — Organization Admin Scope

What can an Organization Admin do in the new system?

| Capability | Current | Future (yes/no) |
|---|---|---|
| Create/view claims | Yes | ? |
| Approve/reject claims | Yes | ? |
| View employee names on claims | Yes | ? (anonymity question) |
| View employee list with names | Yes | ? (anonymity question) |
| Add/remove employees from authorized list | Yes (create) | ? |
| Manage budgets | No | ? |
| Manage clinic relationships | No | ? |
| View financial data (payouts, invoices) | No | ? |
| View org-level analytics | Yes | ? |

**Why it matters:** The org admin role needs explicit boundaries. Currently org admins have full CRUD on everything.

**Priority: CRITICAL**

---

### Q16 — Employee Self-Service Scope

What can an employee do in the system?

| Capability | Yes/No |
|---|---|
| Submit claims | ? |
| View own claim history | ? |
| Edit/delete own pending claims | ? |
| Update profile (name, email, password) | ? |
| Upload receipts | ? |
| View clinic information | ? |
| Communicate with reviewers (conversations) | ? |
| View organization information | ? |
| Register for a new organization | ? |

**Why it matters:** Defines the employee-facing API surface and whether the existing marketing site proxy pattern continues.

**Priority: IMPORTANT**

---

## 3. Claims Workflow

### Q17 — Claim Status Semantics

Current statuses: `pending → approved → paid` or `pending → rejected`.

Does "approved" mean:

| Interpretation | Meaning |
|---|---|
| (a) Budget validated | Claim passes budget check and is validated as legitimate |
| (b) Payment authorized | The vendor can now invoice for this claim |
| (c) Both | Budget check + payment authorization happen in one step |

**What is "frozen" intended for?**
- (a) Fraud hold?
- (b) Dispute?
- (c) Budget exhaustion?
- (d) Something else?

**Why it matters:** The entire financial workflow depends on what "approved" means. If it's budget approval, a separate "payment-approved" status may be needed. The frozen state behavior depends on its purpose.

**Priority: CRITICAL**

---

### Q18 — Claim Status Lifecycle

What should the complete status lifecycle look like?

Suggested: `draft → submitted → pending_review → approved → invoiced → paid`

Alternative paths: `→ rejected`, `→ frozen` (from multiple states)

**Q18a — Is `draft` needed?** (Employee saves before submitting)

**Q18b — Is `invoiced` needed?** (Between org approval and financial payment)

**Q18c — Is `disputed` needed?** (Clinic or employee disputes a decision)

**Why it matters:** The state machine determines the entire claims service design.

**Priority: CRITICAL**

---

### Q19 — Rejected Claims

**Q19a — Can an employee edit and resubmit a rejected claim?**
- If yes, is there a limit on resubmissions?
- Does the resubmitted claim get a new claim number or keep the original?

**Q19b — Is a rejection reason/note required?**

**Q19c — Can an employee appeal a rejection?**

**Why it matters:** Current rejection is terminal with no resubmission path. New status transitions may be needed.

**Priority: IMPORTANT**

---

### Q20 — Claim Editing

**Q20a — Can an employee edit a pending claim?**
- Change amount, description, receipt, clinic?

**Q20b — After editing, what happens?**
- Does the claim stay under review?
- Or go back to draft?

**Q20c — Is there a time cutoff after which editing is locked?**

**Why it matters:** Affects whether claim versioning is needed and whether `updateReimbursement` can be reused.

**Priority: IMPORTANT**

---

### Q21 — Multi-Stage Approval

Do claims require:

| Model | Description |
|---|---|
| Single approval | One person approves and claim moves forward |
| Sequential | Manager → Finance → Super Admin, each must approve |
| Parallel | Any of several reviewers can approve |
| Amount-thresholded | Small claims need one approver, large claims need multiple |

**Why it matters:** Multi-stage approval requires a new state machine, reviewer assignment, and notification system.

**Priority: IMPORTANT**

---

### Q22 — Claim Reference Numbers

**Q22a — Is the current `RMB-YYYY-NNNNNN` format acceptable?**

**Q22b — Should claim numbers be:**
- Platform-wide unique (current)?
- Organization-scoped (e.g., `ORG-RMB-YYYY-NNNNNN`)?

**Why it matters:** The counter service needs to know whether to scope sequences per organization.

**Priority: LOW** — can be decided later, existing format works.

---

### Q23 — Claim Attachments

**Q23a — Are receipts mandatory or optional for claim submission?**

**Q23b — Maximum file size and allowed formats?**
- Current: 10 MB, PDF/JPG/PNG. Is this acceptable?

**Q23c — Are multiple attachments per claim allowed?**

**Q23d — Are attachments visible to the organization?** (Anonymity concern — a receipt image may contain the employee's name.)

**Why it matters:** Storage, bandwidth, and anonymity filtering requirements depend on the answer.

**Priority: IMPORTANT**

---

### Q24 — Claim History & Audit

**Q24a — Who can view the full claim history?**
- Status changes, reviewer notes, timestamps.

**Q24b — Is history anonymous?**
- Does it show "Reviewed by [name]" or "Reviewed by [role]"?

**Q24c — Once written, is the history immutable?**
- Current implementation is append-only. Is this acceptable?

**Why it matters:** The current `history[]` array is already append-only. The question is visibility and whether actor identities are exposed.

**Priority: IMPORTANT**

---

## 4. Financial Workflow

### Q25 — Budget Model

What does an organization's budget look like?

| Model | Description |
|---|---|
| Single annual budget | One total per year |
| Per-department budgets | Separate budgets for Clinical, Administrative, etc. |
| Per-employee limits | Each employee has a max claim amount or annual cap |
| Per-category limits | Different limits for mental health vs. medical vs. wellness |
| Hybrid | Some combination of the above |

**Why it matters:** Budget enforcement logic cannot be designed without knowing the model. Currently no budget infrastructure exists.

**Priority: CRITICAL**

---

### Q26 — Budget Commitment Timing

When does a claim consume budget?

| Trigger | Effect |
|---|---|
| On submission | Budget reserved immediately, reduces available budget |
| On approval | Budget committed at approval time |
| On payment | Budget consumed only when claim is actually paid |

**What happens if a pending claim's budget reservation expires or is released?**

**Why it matters:** Determines whether budgets can be oversubscribed and whether pending claims count against available budget.

**Priority: IMPORTANT**

---

### Q27 — Budget Overrun Behavior

What happens when a claim exceeds the available budget?

- (a) Claim is rejected automatically?
- (b) Claim is placed in a "waiting for budget" queue?
- (c) Warning is shown but claim can still be approved (soft cap)?
- (d) Org admin can override the budget cap?

**Why it matters:** Budget enforcement can be soft (warn) or hard (block). Each requires different logic.

**Priority: IMPORTANT**

---

### Q28 — Vendor Invoice Flow

What is the complete vendor invoice workflow?

| Option | Flow |
|---|---|
| (a) Clinic invoices Remedy | Employee submits claim → Org approves → Clinic sends invoice to Remedy → Remedy pays clinic |
| (b) Remedy invoices Org | Employee pays clinic → submits receipt → Org approves → Remedy invoices Org → Org pays Remedy → Remedy reimburses employee |
| (c) Direct org payment | Employee submits claim → Org approves → Org pays clinic directly → reports payment to platform |
| (d) Hybrid | Different flow for different claim types |

**Why it matters:** The invoice flow determines whether Claims, Invoices, and Payments are separate entities or the same thing. It affects whether the existing `ReimbursementDocument` can be extended or must be replaced.

**Priority: CRITICAL**

---

### Q29 — Who Transfers Money?

Who actually moves money?

| Option | Description |
|---|---|
| Remedy pays vendor directly | Remedy has payment gateway, pays clinics |
| Remedy reimburses employee | Employee paid upfront, Remedy reimburses |
| Remedy invoices org → org pays → Remedy releases funds | Remedy is pass-through |
| Super Admin manually triggers each payout | No automation, manual approval per payout |

**Why it matters:** Determines whether payment gateway integration is needed, whether invoicing is platform-to-org or platform-to-vendor, and whether "paid" is automated or manual.

**Priority: IMPORTANT**

---

### Q30 — Organization Invoicing

**Q30a — If Remedy pays clinics upfront, how does Remedy recover the cost?**
- Invoice organizations monthly/quarterly?
- Invoice per-claim?
- Organizations pre-fund accounts?

**Q30b — What happens if an organization does not pay Remedy?**
- Future claims blocked?
- Interest/fees?
- Claims already paid by Remedy stay covered?

**Why it matters:** Accounts receivable is a completely new domain. The answer determines whether an invoicing/billing module is needed.

**Priority: IMPORTANT**

---

### Q31 — Claim Amount Limits

**Q31a — Is there a maximum claim amount?**
- Current: effectively unlimited (`MAX_CLAIM_AMOUNT = 999,999,999`)

**Q31b — Should limits vary by:**
- Category (e.g., mental health max $5,000, dental max $2,000)?
- Organization (org sets its own limits)?
- Employee (per-employee annual cap)?

**Why it matters:** The current single constant is a placeholder. Real limits need a configuration system.

**Priority: IMPORTANT**

---

### Q32 — Financial Audit Trail

**Q32a — Who can see payout records?**
- Organization? Employee? Super Admin only?

**Q32b — Are payouts linked to specific claims or aggregated?**
- Each payout shows which claim it pays?
- Or a single payout covers multiple claims?

**Q32c — Is a separate ledger entity needed?**
- Or is claim status (`invoiced → paid`) sufficient audit trail?

**Why it matters:** Financial audit requirements affect whether a separate Ledger/Transaction entity is needed.

**Priority: IMPORTANT**

---

## 5. Clinics

### Q33 — Clinic Registration

How does a clinic get onto the platform?

| Option | Description |
|---|---|
| Self-service signup | Clinic fills a form → pending approval → Super Admin approves |
| Invitation only | Super Admin creates clinic accounts manually |
| Organization onboards | Organization adds clinics they work with |

**Q33a — What information is required for registration?**
- Business name, address, license number, contact person?

**Q33b — Who approves clinic registration?**
- Super Admin? Automated (license verification)? Organization?

**Why it matters:** Determines whether clinic registration is a public flow with verification gates, or an admin-only creation flow.

**Priority: IMPORTANT**

---

### Q34 — Clinic-Organization Relationship

**Q34a — Can a clinic serve multiple organizations?**
- Or is a clinic exclusive to one organization?

**Q34b — Who decides which clinics an organization uses?**
- Organization admin selects approved clinics?
- Super Admin assigns clinics to organizations?
- Any clinic can submit claims for any organization?

**Q34c — Can employees submit claims from any clinic?**
- Or only from clinics their organization has approved?

**Why it matters:** Affects whether Clinic has a `tenantId` or is a platform-wide entity with many-to-many relationships.

**Priority: CRITICAL**

---

### Q35 — Clinic Portal Scope

What can a clinic user do in the portal?

| Capability | Yes/No |
|---|---|
| View claims that reference their clinic | ? |
| View employee names on claims | ? (anonymity question) |
| Submit invoices for approved claims | ? |
| View invoice history and payment status | ? |
| Communicate with employees or org admins | ? |
| Update clinic profile (address, contact, license) | ? |
| View aggregated reports (claim volume, payment totals) | ? |
| Manage multiple staff accounts for the clinic | ? |

**Why it matters:** Defines the clinic API surface, permission boundaries, and whether clinics need read access to claim data.

**Priority: IMPORTANT**

---

### Q36 — Clinic Claim Initiation

Can a clinic submit a claim on behalf of an employee?

| Option | Description |
|---|---|
| Employee only | Only employees can create claims. Clinic receives claims for services rendered. |
| Clinic only | Clinic submits the claim (direct billing). Employee must approve before it proceeds. |
| Both | Either employee or clinic can initiate. |

**Why it matters:** Changes who can create claims — currently only employees can.

**Priority: IMPORTANT**

---

### Q37 — Clinic Authentication

**Q37a — Do clinic staff authenticate via the same identity system as employees?**
- Or does the clinic have a separate login?

**Q37b — Can a clinic have multiple user accounts?**
- E.g., Clinic Manager, Clinic Staff, Billing Clerk.

**Why it matters:** Affects whether the identity system needs role-based accounts within a clinic or separate user types.

**Priority: IMPORTANT**

---

### Q38 — Clinic Visibility of Employee Identity

Can clinic staff see employee names on claims?

- (a) No — clinics see anonymous claim references only
- (b) Yes — clinics need to know who the patient is for service delivery
- (c) Depends on the claim type

**Why it matters:** If clinics can see employee identities but organizations cannot, the permission model must handle this distinction.

**Priority: CRITICAL**

---

## 6. Anonymity

### Q39 — Anonymity Scope

"Organizations should not see employee names" — which of these best describes the intent?

| Option | Meaning |
|---|---|
| (a) Claim-level only | Claims display without employee names. Org sees "Claim #42" instead of "Ahmed's claim". Employee sees their own name. |
| (b) No employee browsing | The entire employee list / management page is hidden. Org cannot browse employees at all. |
| (c) Fully aggregated | Org only sees totals and trends on dashboards, never individual claims. |

**Why it matters:** (a) preserves the existing claim workflow with minor UI changes. (b) removes the employee management page. (c) fundamentally changes the dashboard and analytics.

**Priority: CRITICAL**

---

### Q40 — Who CAN See Identities

Who is allowed to see employee identities?

| Person | Can see identities? |
|---|---|
| Super Admin | ? |
| Remedy support staff | ? |
| The employee themselves (their own identity) | ? |
| Organization (during an audit / with consent) | ? |
| Clinic staff (for service delivery) | ? |

**Why it matters:** Defines which parts of the system need role-based filtering on employee data.

**Priority: CRITICAL**

---

### Q41 — Specific Identity Exposure Points

Every current API point exposes employee identity. Which should remain visible to the organization?

| Exposure point | Keep visible? |
|---|---|
| Employee name on claim detail page | ? |
| Employee name in claim list | ? |
| Employee name in search results | ? |
| Employee email for notifications | ? |
| Employee name on dashboard aggregates | ? |
| Employee name on receipt images (watermark) | ? |
| Employee code in claim reference | ? |
| Department/team name linked to employee | ? |

**Why it matters:** Each exposure point is a code change. We need to know which to keep and which to anonymize.

**Priority: CRITICAL**

---

### Q42 — Anonymity Model

Is anonymity:

| Option | Description |
|---|---|
| Always enforced | System-wide. Every organization gets anonymous claims. |
| Configurable per organization | Each org can opt in or out. |
| Configurable per claim type | Some claim types show identity, others don't. |

**Why it matters:** Configurable anonymity adds significant complexity. System-wide is simpler.

**Priority: IMPORTANT**

---

### Q43 — Retroactive Anonymity

Do existing claims (with `employeeName` stored on the document) need to be anonymized?

- (a) Yes — backfill all existing claims to remove employee names
- (b) No — only new claims are anonymous. Existing claims stay as-is with a cutover date
- (c) Keep data but filter at the API layer

**If (a):** Is overwriting the stored name sufficient? Or does the audit trail need to be preserved with original names?

**Why it matters:** Retroactive data migration is high-effort. Option (b) avoids migration but creates a split view.

**Priority: IMPORTANT**

---

### Q44 — Department-Level / Aggregated Visibility

Can the organization see:

| Data point | Visible? |
|---|---|
| How many employees per department submitted claims | ? |
| Total claim amount per department | ? |
| Department-level trends without individual names | ? |
| Status breakdown (pending/approved/paid) per department | ? |
| Nothing — everything is fully anonymous at all levels | ? |

**Why it matters:** Department-level rollups require aggregation logic but preserve analytical value for organizations.

**Priority: IMPORTANT**

---

### Q45 — Anonymous Reference Format

If claims are anonymous, what identifier does the organization see?

| Option | Example |
|---|---|
| Sequential number | "Claim #42" |
| Claim number only | "RMB-2026-000142" (same as internal) |
| Random code | "CLM-a7f3k2" |
| Nothing — no reference at all | Just status and amount |

**Why it matters:** The anonymous reference format affects the claims list UI, search, and conversation context.

**Priority: LOW**

---

## 7. Conversations & Notifications

### Q46 — Need for Conversations

Does the platform need a claim-level conversation/messaging system?

- (a) Yes — employee, org admin, and clinic can message each other on a claim
- (b) No — all communication happens via email/phone outside the platform
- (c) Maybe — simple notes field is sufficient for now

**Why it matters:** Conversations require new entities, WebSocket infrastructure, and permission management.

**Priority: FUTURE**

---

### Q47 — Notification Triggers

Should the system send notifications for these events?

| Event | Notify? | Who? |
|---|---|---|
| Claim approved | ? | Employee |
| Claim rejected | ? | Employee |
| Claim status changed to paid | ? | Employee, Clinic |
| Invoice submitted by clinic | ? | Org Admin, Super Admin |
| Invoice paid | ? | Clinic |
| Password reset requested | ? | Employee |
| Account deactivated | ? | Employee |
| Budget threshold warning (80% used) | ? | Org Admin, Finance |
| New registration (from authorized list) | ? | Org Admin |
| Pending claims awaiting review | ? | Org Admin |

**Why it matters:** Notifications affect whether an event system is needed and what infrastructure to invest in.

**Priority: FUTURE**

---

### Q48 — Notification Channels

What channels should notifications use?

| Channel | Yes/No |
|---|---|
| Email | ? |
| SMS | ? |
| In-app notification (bell icon) | ? |
| Push notification (mobile) | ? |

**Why it matters:** Different channels require different infrastructure. Email is simplest. In-app requires WebSocket. Push requires mobile app.

**Priority: FUTURE**

---

## 8. Data Migration & Coexistence

### Q49 — Migration Strategy for Existing Employees

When the new system goes live, what happens to existing employees?

| Option | Description |
|---|---|
| (a) Force re-registration | All existing employees must self-register with passwords. Old records archived. |
| (b) Auto-migrate with forced password reset | Accounts are migrated. PIN hashes cannot be converted. Employees set a new password on first login. |
| (c) Migrate with password carryover | PIN accounts are migrated and employees keep their existing PIN as a temporary password. |

**Why it matters:** Migration strategy determines whether old and new systems coexist and for how long.

**Priority: IMPORTANT**

---

### Q50 — Migration Strategy for Existing Tenant Dashboard Admins

Current `TenantUser` accounts use bcrypt passwords. Does the new system:

- (a) Migrate them directly to the new User entity (same password hash, zero friction)?
- (b) Require them to re-register?

**Why it matters:** TenantUser migration is straightforward (both use bcrypt). No reason to force re-registration.

**Priority: IMPORTANT**

---

### Q51 — Migration Strategy for Existing Claims

Current claims have `employeeName` stored on the document. When the anonymous claims system launches:

- (a) Existing claims continue with employee names visible
- (b) Existing claims are backfilled to remove employee names
- (c) Existing claims stay in the old system, new claims go through the new system

**Why it matters:** Backfill is risky at scale. Option (a) creates a split where old claims look different from new claims.

**Priority: IMPORTANT**

---

### Q52 — Coexistence Period

**Q52a — How long should old and new systems run simultaneously?**

**Q52b — Is there a rollback plan if the new system has issues?**

**Why it matters:** Coexistence doubles maintenance surface area. The duration affects the deployment plan.

**Priority: IMPORTANT**

---

### Q53 — Data Retention & Archival

**Q53a — After migration, are old employees and claims preserved in the new model?**
- Or is there an archival process that removes old data?

**Q53b — How long must audit history be retained?**
- Regulatory requirements (if any)?

**Q53c — Can old employee records be permanently deleted?**

**Why it matters:** Regulatory requirements (healthcare, financial) may impose minimum retention periods.

**Priority: IMPORTANT**

---

## 9. System Architecture & Technical

### Q54 — Employee Portal Location

The current employee portal (claim submission, login, history) runs on a separate marketing site that calls `app/api/employee/*` endpoints via a shared API key.

Should v2:

- (a) Keep the marketing site separate (it calls v2 APIs)
- (b) Merge the employee portal into this codebase as a Next.js route group
- (c) Keep it separate for now, plan to merge later

**Why it matters:** Keeping it separate means maintaining the API-key proxy pattern. Merging it means building the employee UI in this codebase.

**Priority: IMPORTANT**

---

### Q55 — Database Strategy

**Q55a — Is MongoDB the right database for the new financial entities (Budgets, Invoices, Payments)?**
- MongoDB works well for document stores. Financial transactions may benefit from ACID guarantees.

**Q55b — Should financial data be in a separate database?**
- For isolation and compliance.

**Q55c — Should the in-memory rate limiter be replaced with a persistent store?**

**Why it matters:** Financial data integrity may require different storage characteristics.

**Priority: IMPORTANT**

---

### Q56 — Session Strategy

**Q56a — Should employee and clinic portals use JWT tokens instead of cookies?**
- JWT enables cross-origin auth (marketing site → API)

**Q56b — Should the Organization Dashboard keep cookie-based sessions?**
- It's already cookie-based, works well, no need to change.

**Q56c — Should refresh tokens be used?**
- Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)?

**Priority: IMPORTANT**

---

### Q57 — Payment Gateway Integration

**Q57a — Will Remedy integrate with a payment gateway?**
- Stripe? Bank transfer? Other?

**Q57b — If yes, which gateway(s)?**

**Q57c — Does integration with the payment gateway need to be built in this sprint, or can it be added later?**

**Why it matters:** Payment gateway integration is a major effort. If it's not needed for MVP, it affects the milestone order.

**Priority: CRITICAL** (if payments are in MVP)

---

### Q58 — File Storage Strategy

Current receipt files are stored on `public/uploads/receipts/` on the server's local disk.

**Q58a — Should file storage move to cloud storage (S3, GCS, Azure Blob)?**

**Q58b — Or is local disk sufficient for current scale?**

**Why it matters:** Local disk does not scale horizontally. Multiple server instances would need shared storage.

**Priority: IMPORTANT**

---

### Q59 — Email Service

**Q59a — Should the platform send its own emails?**
- Transactional emails (password reset, claim status, verification)

**Q59b — If yes, which provider?**
- SendGrid? AWS SES? Resend? Custom SMTP?

**Q59c — Should email sending be synchronous or queued?**

**Why it matters:** Email sending is needed for registration, password reset, and notifications. The provider choice affects the integration approach.

**Priority: IMPORTANT**

---

### Q60 — Event / Webhook System

**Q60a — Should the platform expose webhooks?**
- So external systems (marketing site, HR systems) can subscribe to events

**Q60b — If yes, what events should be emitted?**
- Claim.created, Claim.approved, Claim.paid, User.registered, Employee.deactivated

**Why it matters:** Webhooks enable integration with external systems but add publishing infrastructure.

**Priority: FUTURE**

---

## 10. Super Admin & Organization Management

### Q61 — Super Admin Authentication

**Q61a — Should Super Admin log in through the same login page as everyone else?**
- Or should Super Admin have a separate login URL?

**Q61b — Does Super Admin use the same identity system (User entity with `type: "super_admin"`)?**

**Q61c — Or should Super Admin have a completely separate auth system?**

**Why it matters:** Unified vs. separate auth affects the login UI, middleware, and session handling.

**Priority: IMPORTANT**

---

### Q62 — Organization Creation

**Q62a — Who creates new organizations on the platform?**
- Super Admin only?
- Self-service signup with approval?

**Q62b — What information is needed to create an organization?**
- Name, slug, admin contact?

**Why it matters:** Currently organizations are seeded via script. A creation flow is needed for production.

**Priority: IMPORTANT**

---

### Q63 — Organization Lifecycle

**Q63a — Can an organization be suspended?**
- What triggers suspension? (Non-payment? Policy violation?)
- What happens to their claims during suspension?

**Q63b — Can an organization be permanently deleted?**
- Or is it preserved for audit purposes?

**Why it matters:** Organization lifecycle affects data retention and claim processing.

**Priority: IMPORTANT**

---

## 11. Marketing Site / Employee Portal Handover

### Q64 — Current Marketing Site Integration

The current employee portal is a separate codebase (marketing site) that:
- Serves the employee login page with tenant selection
- Validates employee PIN login via `POST /api/employee/login`
- Stores employee session in localStorage
- Calls claim APIs with shared API key header
- Handles receipt upload

**Q64a — Should we build the v2 employee portal UI into this codebase?**
- Or continue proxying through the marketing site?

**Q64b — If the marketing site continues, will it switch from API-key auth to JWT auth?**

**Why it matters:** If the marketing site stays separate, we need a JWT token exchange mechanism. If merged, we build the UI here.

**Priority: IMPORTANT**

---

## 12. Remaining Ambiguities from Existing Codebase

### Q65 — "Clinic" in Current Claims

The current `ReimbursementDocument` has optional `clinicId` and `clinicName` fields. However, there is:

- No clinic repository
- No clinic service
- No clinic API routes
- No clinic validation

**Q65a — Should existing claims with clinic data be migrated to the new Clinic entity?**

**Q65b — Or is clinic data on claims purely informational, and the new Clinic entity starts fresh?**

**Why it matters:** Legacy data migration approach for clinic references.

**Priority: IMPORTANT**

---

### Q66 — Claims Without Clinic Reference

Many current claims have no `clinicId` or `clinicName`. Will all future claims require a clinic reference?

- (a) Yes — every claim must be linked to a clinic
- (b) No — clinic is optional; some claims are direct to employee
- (c) Depends on claim type

**Why it matters:** Determines whether clinic is a required field or optional metadata.

**Priority: IMPORTANT**

---

### Q67 — Employee Code Uniqueness

Currently `tenantId + employeeCode` is unique. Under the new model:

- (a) Is employee code still unique per organization?
- (b) Or does it become platform-wide unique?
- (c) Or is it just an optional display field (email is the real identifier)?

**Why it matters:** Database index design and import validation logic depend on this.

**Priority: IMPORTANT**

---

### Q68 — "Type" Field on Claims

Claims currently have a `type` field (e.g., "reimbursement"). Should this become:

- A free-text field (as-is)?
- A controlled vocabulary with predefined types?
- Linked to budget categories?

**Why it matters:** Affects whether claim types should be validated against a known list and whether budgets can be per-type.

**Priority: LOW**

---

### Q69 — Service Date

Claims have an optional `serviceDate` field. Is this:

- The date the employee received the service?
- The date the invoice was issued?
- Required for all claims, or only certain types?

**Why it matters:** Affects claim validation and whether date-based budget periods are needed.

**Priority: LOW**

---

### Q70 — Receipt Hash

Claims currently store `receiptHash` (SHA-256 of the receipt file). Is this for:

- (a) Deduplication (same receipt used for multiple claims)?
- (b) Integrity verification?
- (c) Both?

**Why it matters:** Affects whether receipt hash checking should be enforced at the API level.

**Priority: LOW**

---

## 13. Question Priorities at a Glance

### Critical — Architecture cannot proceed without answer

| # | Summary |
|---|---|
| Q1 | Identity ownership model (platform-wide vs. org-scoped) |
| Q2 | Primary login identifier (email vs. code vs. both) |
| Q11 | Complete role list |
| Q14 | Super Admin scope |
| Q15 | Organization Admin scope |
| Q17 | What "approved" means in the claim lifecycle |
| Q18 | Complete claim status lifecycle |
| Q25 | Budget model (per-org, per-dept, per-employee) |
| Q28 | Vendor invoice flow (who invoices whom) |
| Q34 | Clinic-Organization relationship model |
| Q38 | Clinic visibility of employee identity |
| Q39 | Anonymity scope (claim-level vs. portal-wide) |
| Q40 | Who CAN see employee identities |
| Q41 | Specific identity exposure points |
| Q57 | Payment gateway integration needed? |

### Important — Influences future design, can be deferred

| # | Summary |
|---|---|
| Q3 | Tenant dashboard admin vs. employee identity merge |
| Q4 | Authorized employee list details |
| Q5 | Self-registration flow |
| Q6 | Email verification requirements |
| Q7 | Password ownership & management |
| Q8 | Account deactivation rules |
| Q9 | Multi-organization identity |
| Q12 | Role overlap |
| Q13 | Role hierarchy & delegation |
| Q16 | Employee self-service scope |
| Q19 | Rejected claim handling |
| Q20 | Claim editing rules |
| Q21 | Multi-stage approval |
| Q23 | Claim attachment requirements |
| Q24 | Claim history & audit visibility |
| Q26 | Budget commitment timing |
| Q27 | Budget overrun behavior |
| Q29 | Who transfers money |
| Q30 | Organization invoicing |
| Q31 | Claim amount limits |
| Q32 | Financial audit trail |
| Q33 | Clinic registration flow |
| Q35 | Clinic portal scope |
| Q36 | Clinic claim initiation |
| Q37 | Clinic authentication |
| Q42 | Anonymity model (configurable vs. fixed) |
| Q43 | Retroactive anonymity |
| Q44 | Department-level/aggregated visibility |
| Q49 | Employee migration strategy |
| Q50 | Tenant admin migration |
| Q51 | Existing claims migration |
| Q52 | Coexistence period & rollback |
| Q53 | Data retention & archival |
| Q54 | Employee portal location |
| Q55 | Database strategy (MongoDB for financial data) |
| Q56 | Session strategy (JWT vs. cookies) |
| Q58 | File storage strategy |
| Q59 | Email service |
| Q61 | Super Admin authentication |
| Q62 | Organization creation |
| Q63 | Organization lifecycle |
| Q64 | Marketing site integration |
| Q65 | Existing clinic data migration |
| Q66 | Clinic requirement on claims |
| Q67 | Employee code uniqueness |

### Future — Useful but not required for MVP

| # | Summary |
|---|---|
| Q10 | Public user registration |
| Q22 | Claim reference number format |
| Q45 | Anonymous reference format |
| Q46 | Claim-level conversations |
| Q47 | Notification triggers |
| Q48 | Notification channels |
| Q60 | Event/webhook system |
| Q68 | Claim type vocabulary |
| Q69 | Service date requirements |
| Q70 | Receipt hash purpose |

---

## Quick Reference: 15 Questions That Must Be Answered Before Any Implementation Begins

These are the CRITICAL questions grouped by the milestone they block:

### Blocking Milestone 1 (Identity Foundation)
1. **Q1** — Does Remedy own identity (platform-wide accounts)?
2. **Q2** — What is the login identifier (email vs. code)?
3. **Q11** — What roles exist?

### Blocking Milestone 2 (Authorized Employee List)
4. **Q4a** — What fields are on the authorized list?
5. **Q5** — What is the self-registration flow?

### Blocking Milestone 3 (Claims Refactor)
6. **Q17** — What does "approved" mean?
7. **Q18** — What is the complete claim status lifecycle?
8. **Q39** — What is the scope of anonymity (claim-level vs. portal-wide)?
9. **Q40** — Who CAN see employee identities?
10. **Q41** — Which specific data points remain visible?

### Blocking Milestone 4 (Budget Engine)
11. **Q25** — What does the budget model look like?

### Blocking Milestone 5 (Vendor Invoice & Payout)
12. **Q28** — What is the complete vendor invoice flow?
13. **Q57** — Is payment gateway integration needed?

### Blocking Milestone 6 (Clinic Portal)
14. **Q34** — What is the clinic-organization relationship?
15. **Q38** — Can clinics see employee identities?

---

*This document consolidates findings from Phases 1–3. No implementation decisions have been made. Every question should be discussed with the client before architectural redesign begins.*
