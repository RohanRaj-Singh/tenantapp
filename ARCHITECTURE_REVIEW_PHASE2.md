# RemedyGCC v2 Architecture Review — Phase 2

> **Date:** 2026-07-18
> **Status:** Pre-design — client clarification required
> **Constraint:** No business assumptions have been made

---

## 1. Executive Summary

The Phase 1 audit revealed seven major architectural domains where the current implementation conflicts with the client's stated direction. However, the client's specification leaves critical business rules ambiguous across every domain. The following areas cannot be redesigned without explicit client clarification:

**Identity ownership** — the most fundamental unresolved question. If Remedy owns identity, the entire tenant-scoped data model changes. But "owning identity" could mean anything from platform-wide user accounts to simply holding the authoritative employee list.

**Anonymous claims** — the client stated organizations should not see employee names, but did not specify who CAN see them, at what granularity, or whether anonymity applies only to claims or to the entire organization experience.

**Financial workflow** — the vendor invoice model is described at a high level but the actual money flow, commitment timing, and responsibility boundaries are unspecified.

**Clinic model** — clinics are being elevated from a data field to a first-class entity, but their exact role in the claim lifecycle is undefined.

**Role architecture** — the client mentioned multiple portal types (tenant, clinic, super admin) but no concrete permission model.

The following document lists every specific business question that must be answered before architectural redesign begins.

---

## 2. Identity & Authentication Questions

### Q2.1 — Identity Ownership Model
When the client says "Remedy owns identity management," does this mean:
- (a) Employees have platform-wide accounts not scoped to any tenant?
- (b) Remedy holds the authoritative employee list and tenants reference platform identities?
- (c) Remedy simply provides the authentication infrastructure (login/logout) while tenants still manage employee records?

**Why it matters:** This is the root decision. Option (a) requires a new User entity detached from Tenant. Option (b) means Employee stays but adds a platform identity layer. Option (c) means minimal change — mostly switching PIN to password.

### Q2.2 — Primary Identifier
When an employee logs in, do they use:
- Email + password only?
- Employee ID (code) + password?
- Email OR Employee ID + password?
- Phone number + password?

**Why it matters:** The login API, session model, and database uniqueness constraints all depend on the identifier. The current system uses `tenantSlug + employeeCode` as the composite key.

### Q2.3 — Authorized Employee List
When an organization uploads an "authorized employee list":
- What fields are on the list? (Name, email, employee ID, department?)
- Does uploading the list automatically create accounts, or only pre-authorize future registration?
- Can the same email appear on multiple organizations' lists?
- Is the list a one-time upload or a living document that syncs?

**Why it matters:** This defines the boundary between tenant-managed identity and platform-managed identity. It determines whether the import creates Employee records immediately or creates a separate "authorization" entity.

### Q2.4 — Self-Registration Flow
What is the exact flow from "authorized" to "active"?
1. Organization uploads list → employee receives email → employee clicks link → employee creates password → account activated?
2. Organization uploads list → accounts auto-created → employee receives credentials → employee forced to set password on first login?
3. Employee signs up directly → system checks authorized list → if matched, allows registration?

**Why it matters:** This defines the account state machine (invited → pending → verified → active), the email notification requirements, and whether the registration API is public or invitation-only.

### Q2.5 — Email Verification
Is email verification required?
- If yes, what happens before verification — can the employee log in? Submit claims?
- Who sends verification emails — Remedy's system or a third-party provider?
- Is there a verification expiry?
- Can an organization resend verification emails?

**Why it matters:** Email verification adds a state machine dependency, async notification infrastructure, and potential UX friction. It affects the minimum viable employee lifecycle.

### Q2.6 — Password Ownership
- Who resets forgotten passwords — the employee (self-service) or the organization admin?
- Is there a "forgot password" flow? If so, how does it work without email being verified?
- Are there password complexity requirements (length, special chars, expiry)?
- Can organizations enforce password policies for their employees?

**Why it matters:** Self-service password reset requires email verification to be in place. Organization-managed passwords keep the current model. The choice affects the entire authentication service.

### Q2.7 — Account Deactivation
- Can an organization deactivate an employee? Immediately or with notice?
- What happens to an employee's pending claims when their account is deactivated?
- Can a deactivated employee's claims still be processed?
- Is deactivation reversible?

**Why it matters:** Deactivation policy affects claim lifecycle, data retention, and audit trail requirements.

### Q2.8 — Multi-Tenant Identity
If Remedy owns identity, can a single employee account belong to multiple organizations?
- If yes, does the employee have a separate claim history per organization?
- Do they log in once and switch between organizations?
- Do they need separate passwords per organization?

**Why it matters:** Multi-tenant identity fundamentally changes the User → Employee → Tenant relationship from a tree to a graph.

---

## 3. Authorization Questions

### Q3.1 — Tenant Scope
What can a tenant admin actually do in the new system?
- Create/view claims within their organization?
- Approve/reject claims?
- View employee names?
- Manage clinic relationships?
- View financial data (budgets, payouts)?
- Add/remove employees from the authorized list?

**Why it matters:** The tenant admin role needs explicit boundaries before any permission system can be designed. Currently tenant admins have full CRUD on everything — that will not work with the new model.

### Q3.2 — Employee Self-Service Scope
What can an employee do in the system?
- Submit claims only?
- View claim history?
- Edit/delete their own pending claims?
- Update their profile?
- View clinic information?
- Communicate with reviewers?

**Why it matters:** Defines the employee-facing API surface and whether the existing marketing site proxy pattern remains viable.

### Q3.3 — Cross-Tenant Visibility
Can a Super Admin see everything across all tenants?
- All claims with employee names visible?
- Financial data aggregated or detailed?
- Can Super Admin act on claims (approve, pay, reject) or only view?

**Why it matters:** Defines whether Super Admin is read-only oversight or active participant in the workflow.

### Q3.4 — Organization Data Ownership
- Can organizations edit employee details (name, email) after the employee has self-registered?
- Can organizations permanently delete employee records?
- Is there a shared "profile" that both organization and employee can edit?

**Why it matters:** Data ownership conflicts need resolution before the Employee document model can be redesigned.

---

## 4. Claims Workflow Questions

### Q4.1 — Claim Status Semantics
The current statuses are `pending → approved → paid` and `pending → rejected`.

Does "approved" mean:
- (a) Budget check passed and claim is validated? OR
- (b) Payment has been authorized and vendor can invoice?
- (c) Both?

What is "frozen" intended for — fraud hold, dispute, or budget exhaustion?

**Why it matters:** The entire financial workflow depends on what "approved" actually means. If it's budget approval, a separate "payment approval" status may be needed.

### Q4.2 — Rejected Claims
- Can an employee edit and resubmit a rejected claim?
- Or is rejection final?
- Is there a reason/note required on rejection?
- Can an employee appeal a rejection?

**Why it matters:** New status transitions needed. Current rejection is terminal with no resubmission path.

### Q4.3 — Claim Editing
- Can an employee edit a pending claim (change amount, description, receipt)?
- After editing, does the claim go back to pending or stay under review?
- Is there a cut-off after which editing is locked?

**Why it matters:** Affects claim versioning and whether the existing `updateReimbursement` service needs to be restructured.

### Q4.4 — Multi-Stage Approval
Do claims require:
- Single approval (one person)?
- Sequential approvals (manager → finance → super admin)?
- Parallel approvals (any of three reviewers)?
- Different approval chains based on claim amount?

**Why it matters:** Multi-stage approval requires a new state machine, reviewer assignment logic, and notification system.

### Q4.5 — Claim Reference Numbers
Is the current `RMB-YYYY-NNNNNN` format acceptable?
- Should claim numbers be tenant-scoped or platform-wide unique?
- Should the format be configurable?

**Why it matters:** Affects the counter service and whether claim numbers need tenant prefixes.

### Q4.6 — Claim Attachments
- Are receipts mandatory or optional?
- Maximum file size and allowed formats?
- Are multiple attachments per claim allowed?
- Are attachments visible to the organization (anonymity concern)?

**Why it matters:** Storage, bandwidth, and anonymity requirements depend on the answer.

### Q4.7 — Claim History & Audit
- Who can view the full claim history (status changes, reviewer notes)?
- Is the claim history anonymous or does it show reviewer identities?
- Should history be immutable once written?

**Why it matters:** The current `history[]` is already append-only. The question is who can read it and whether actor identities are exposed.

---

## 5. Financial Workflow Questions

### Q5.1 — Budget Model
Does each organization have:
- A single annual budget?
- Per-department budgets?
- Per-employee limits?
- Per-category limits (e.g., mental health vs. medical)?

**Why it matters:** Budget enforcement logic cannot be designed without knowing the budgeting model. Currently no budget infrastructure exists.

### Q5.2 — Budget Commitment Timing
When does a claim consume budget?
- When the claim is submitted (reserve)?
- When the claim is approved (commit)?
- When the claim is paid (actual)?

**Why it matters:** This affects whether budgets can be oversubscribed and whether "pending" claims count against available budget.

### Q5.3 — Vendor Invoice Flow
What is the complete vendor invoice workflow?
1. Employee submits claim → approved → vendor sends invoice → Remedy/Super Admin pays vendor?
2. Vendor submits invoice directly for services rendered → organization approves → Remedy pays?
3. Employee pays clinic upfront → submits receipt → organization approves → Remedy reimburses employee?

**Why it matters:** The invoice flow determines whether claims, invoices, and payments are separate entities or the same thing viewed differently. It affects whether the current `ReimbursementDocument` can be extended or must be replaced.

### Q5.4 — Payment Responsibility
Who actually transfers money?
- Remedy (platform) pays the vendor directly?
- Remedy reimburses the employee who already paid?
- Remedy invoices the organization → organization pays → Remedy releases funds?
- Super Admin manually triggers each payout?

**Why it matters:** Payment responsibility determines whether a payment gateway integration is needed, whether invoicing is platform-to-organization or platform-to-vendor, and whether the "paid" status is automated or manual.

### Q5.5 — Organization Invoicing
- Does Remedy invoice organizations periodically (monthly/quarterly) or per-claim?
- Does Remedy pay vendors upfront and bill organizations later?
- What happens if an organization does not pay Remedy — are future claims blocked?

**Why it matters:** Accounts receivable is a completely new domain not present in the current architecture.

### Q5.6 — Claim Amount Limits
- Is there a maximum claim amount? Different per category?
- Can organizations set their own limits?
- Are there per-period limits (e.g., $5,000/year per employee)?

**Why it matters:** Current system has a single `MAX_CLAIM_AMOUNT = 999,999,999` constant — essentially no limit.

### Q5.7 — Financial Audit Trail
- Who can see payout records?
- Are payouts linked to specific claims or aggregated?
- Is there a separate ledger entity, or is claim status sufficient?

**Why it matters:** Financial audit requirements affect whether a separate Ledger/Transaction entity is needed.

---

## 6. Clinic Questions

### Q6.1 — Clinic Registration
- How does a clinic register — self-service signup, invitation by Remedy, or organization onboards them?
- Is clinic registration approved by Remedy (Super Admin) or automatic?
- What information is required for registration (license, address, contact)?

**Why it matters:** Determines whether clinic registration is a public flow with verification, or an admin-only creation flow.

### Q6.2 — Clinic-Organization Relationship
- Can a clinic serve multiple organizations?
- Or is a clinic exclusive to one organization?
- Does the organization choose which clinics their employees can use?
- Or can employees submit claims from any registered clinic?

**Why it matters:** Affects whether Clinic has a `tenantId` or is a platform-wide entity with many-to-many relationships.

### Q6.3 — Clinic Scope
What can a clinic do in their portal?
- View claims that reference them?
- Submit invoices for claims?
- Communicate with employees or organizations?
- Update their own profile?
- View aggregated analytics?

**Why it matters:** Defines the clinic API surface, permission boundaries, and whether clinics need read access to claim data.

### Q6.4 — Clinic Claims
- Can a clinic submit claims on behalf of an employee (direct billing)?
- Or must the employee always initiate the claim?
- If a clinic submits, does the employee need to approve before it moves forward?

**Why it matters:** This changes who can create claims — currently only employees can.

### Q6.5 — Clinic Authentication
- Do clinics authenticate via the same identity system as employees?
- Or do they have a separate login?
- Can a clinic have multiple user accounts?

**Why it matters:** Affects whether the identity system needs role-based accounts or separate user types.

---

## 7. Anonymity Questions

### Q7.1 — Anonymity Scope
Does "organizations should not see employee names" mean:
- (a) Claims display without employee names (employee sees own name, org sees "Claim #12345")?
- (b) The entire employee list is hidden — org cannot browse employees at all?
- (c) Claims are aggregated — org only sees totals and trends, never individual claims?

**Why it matters:** Options (a), (b), and (c) are very different levels of anonymity. (a) preserves the existing claim workflow. (b) removes the employee management page. (c) fundamentally changes the dashboard and analytics.

### Q7.2 — Who CAN See Identities
Who is allowed to see employee identities?
- Super Admin only?
- Remedy support staff?
- The employee themselves (their own identity)?
- Organization (with explicit consent / during audit)?

**Why it matters:** Defines which parts of the system need role-based filtering on employee data.

### Q7.3 — Identity Exposure Points
Every current API returns employee identity. Which of these should remain visible to the organization:
- Employee name on a claim detail page?
- Employee name in a claim list?
- Employee name in search results?
- Employee name on dashboard aggregates?
- Employee name on receipt images?
- Employee email for notifications?

**Why it matters:** Each exposure point represents a code change. We need to know which ones to keep and which to anonymize.

### Q7.4 — Anonymity by Default or Optional
Is anonymity:
- Always enforced (system-wide setting)?
- Configurable per organization?
- Configurable per claim type?

**Why it matters:** Configurable anonymity adds complexity. System-wide is simpler but may not match client expectations.

### Q7.5 — Retroactive Anonymity
Do existing claims (which have `employeeName` stored on the document) need to be anonymized?
- If yes, is overwriting the stored name sufficient, or does the audit trail need to be preserved?

**Why it matters:** Retroactive data migration is high-effort. If existing claims need to stay as-is and only new claims are anonymous, the system needs a cutover date.

### Q7.6 — Department-Level Visibility
Can the organization see:
- How many employees in each department submitted claims?
- The total claim amount per department?
- Department-level trends without individual names?
- Or is everything fully anonymous?

**Why it matters:** Department-level rollups require aggregation logic but preserve some analytical value for organizations.

---

## 8. Roles & Permissions

### Q8.1 — Role Architecture
What roles exist in the new system?
- Employee — submits claims?
- Organization Admin — manages authorized list, reviews claims?
- Organization Finance — manages budgets, approves payments?
- Clinic Manager — views claims, submits invoices?
- Super Admin — cross-tenant oversight, payout control?
- Remedy Support — investigates issues?

**Why it matters:** The role hierarchy determines the entire permission model. Missing roles discovered mid-implementation cause rework.

### Q8.2 — Role Overlap
Can one person hold multiple roles?
- Can an Organization Admin also be an Employee at the same organization?
- Can a Clinic Manager also be a Super Admin?
- Can one person be Organization Admin for multiple organizations?

**Why it matters:** Multi-role support changes the User → Role relationship from single to many-to-many.

### Q8.3 — Role Inheritance
If an organization has multiple admins:
- Do all admins have identical permissions?
- Or can the "primary admin" delegate specific permissions (claims-only, finance-only)?
- Is there a hierarchy (super admin > org admin > reviewer)?

**Why it matters:** Granular sub-roles within an organization add significant complexity.

### Q8.4 — Super Admin Scope
What exactly can Super Admin do?
- View all claims (anonymous or identified)?
- Process payouts?
- Create/manage tenants?
- Manage clinics?
- Override claim decisions?
- Access employee identities?

**Why it matters:** Super Admin powers cannot be designed without an explicit scope. Current admin routes only provide basic cross-tenant claim listing.

---

## 9. Notification Questions

### Q9.1 — Notification Triggers
Should the system send notifications for:
- Claim status changes (approved, rejected, paid)?
- Password reset requests?
- Account deactivation?
- Budget threshold warnings?
- Pending claims awaiting review?
- New employee registration?

**Why it matters:** Notifications affect the API design (webhook vs. email vs. in-app) and whether an event system is needed.

### Q9.2 — Notification Channel
- Email only?
- SMS?
- In-app notifications?
- All of the above?

**Why it matters:** Different channels require different infrastructure investments.

### Q9.3 — Notification Recipients
Who receives each notification type?
- Employee on claim status change → employee
- Pending approval → org admin
- Budget warning → org finance
- New registration → org admin

**Why it matters:** Notification routing depends on the role model being in place.

---

## 10. Data Migration & Coexistence

### Q10.1 — Migration Strategy
When the new system goes live:
- Do existing employees need to re-register with passwords?
- Or is there a migration script that converts PIN hashes to password hashes?
- Do existing pending claims continue through the old workflow or migrate to the new?

**Why it matters:** Migration strategy determines whether old and new systems coexist, and for how long.

### Q10.2 — Rollback Plan
If the new workflow has issues:
- Is there a fallback to the old system?
- How long should both systems be supported simultaneously?

**Why it matters:** Coexistence doubles maintenance surface area and affects the deployment plan.

### Q10.3 — Data Retention
- After migration, are old employees and claims preserved in the new data model?
- Or is there an archival process?
- How long must audit history be retained?

**Why it matters:** Regulatory requirements (if any) affect minimum data retention periods.

---

## 11. Impact Analysis

### Critical Questions (Architecture cannot proceed without answer)

| # | Question | Affects | Rationale |
|---|---|---|---|
| Q2.1 | Identity ownership model | User entity, Employee entity, all auth, all APIs | Every design decision flows from who owns identity |
| Q4.1 | Claim status semantics | Claim state machine, all workflow services | Cannot design state transitions without knowing what "approved" means |
| Q5.3 | Vendor invoice flow | Financial entities, payment lifecycle | Claims, invoices, and payments are separate or unified based on this |
| Q7.1 | Anonymity scope | Employee visibility at every layer | Determines whether employee names stay in the DB or are removed entirely |
| Q8.1 | Role architecture | Permission model, all API guards | Cannot build auth middleware without knowing who can do what |
| Q5.1 | Budget model | Budget entity, claim validation | Current system has zero budget infrastructure |

### Important Questions (Influences future design, can be deferred)

| # | Question | Affects | Rationale |
|---|---|---|---|
| Q2.4 | Self-registration flow | Employee lifecycle, email service | Can be phased — start with admin-created, add self-reg later |
| Q2.5 | Email verification | Notification infrastructure | Can be deferred if initial accounts are admin-created |
| Q4.4 | Multi-stage approval | Claim workflow service | MVP can start with single approval, add complexity later |
| Q6.1 | Clinic registration | Clinic module | Can be designed as admin-managed initially, self-service later |
| Q5.4 | Payment responsibility | Payout service | If Remedy does not process payments in MVP, can be deferred |

### Future Enhancement (Useful but not required for MVP)

| # | Question | Affects | Rationale |
|---|---|---|---|
| Q9.1 | Notification triggers | Event system, email service | MVP can work without notifications |
| Q10.2 | Rollback plan | Deployment strategy | Operational concern, not architectural |
| Q7.4 | Configurable anonymity | Permission system | Start with system-wide setting |
| Q8.3 | Role inheritance | Permission granularity | All org admins can be equal in MVP |

---

## 12. Recommendations

### What Has Been Confirmed by the Client
These are safe to proceed with:
- Employee auth will move from PIN to **password**
- **Self-registration** with authorized employee lists is desired
- **Clinics** should become first-class platform entities
- **Anonymous claims** — organizations should not see employee names
- **Super Admin** role is needed for oversight

### Reasonable Recommendations (recommend to client but do not implement without approval)
1. **Single identity system** — merge TenantUser and Employee into a unified User entity with role-based permissions. This avoids maintaining two separate auth stacks.
2. **Platform-wide identities** — users should not be scoped to tenants. Organization membership is a relationship, not an identity property.
3. **Layered approach to claims** — separate Claim (what the employee submits), Approval (organization decision), and Invoice/Payment (financial settlement) into distinct but linked entities. This maps naturally to the vendor invoice workflow.
4. **Incremental anonymity** — store employee name on claims but control visibility through permissions, not by removing data. This allows retroactive visibility if the client changes their mind.
5. **Event-driven notifications** — introduce an event bus early so notifications, audit, and webhooks can be added without rewriting service logic.

### Assumptions That Must Not Be Implemented Without Client Approval
1. **Do not assume** that "Remedy owns identity" means platform-wide accounts. The client may mean simple auth infrastructure.
2. **Do not assume** the vendor invoice flow involves Remedy paying clinics directly. The client may want a pass-through model.
3. **Do not assume** anonymity applies to the entire portal. The client may only want claim-level anonymity.
4. **Do not assume** Super Admin can see everything. The client may want Super Admin to have financial-only access.
5. **Do not assume** budgets are per-organization. The client may want per-employee, per-department, or no budgets at all.
6. **Do not assume** existing employees migrate. The client may want a clean slate with fresh registration.
7. **Do not assume** the marketing site (employee portal) stays external. The client may want it merged into this codebase.

---

## 13. Next Step

The critical questions (Section 11 above) must be answered by the client before any architectural work begins. All six critical questions affect fundamental design decisions:

1. Who owns identity?
2. What does "approved" mean?
3. How does vendor invoicing work?
4. How anonymous are claims?
5. What roles exist?
6. How are budgets structured?

Once these six are clarified, the architectural redesign can proceed with confidence. The remaining questions can be resolved during implementation phases.
