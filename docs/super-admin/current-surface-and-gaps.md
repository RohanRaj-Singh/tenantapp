# Super Admin Current Surface And Gaps

## Source Files

- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/questions/QuestionForm.tsx`
- `frontend/src/redux/api/apis/questionApi.ts`
- `frontend/src/redux/api/apis/organitaionApi.ts`
- `frontend/src/redux/api/apis/surveyApi.ts`
- `backend/src/app/modules/question/question.routes.ts`
- `backend/src/app/modules/question/question.service.ts`
- `backend/src/app/modules/organization/organization.routes.ts`
- `backend/src/app/modules/organization/organization.model.ts`
- `backend/src/app/modules/organization/organization.service.ts`
- `backend/src/app/modules/survey/survey.routes.ts`

## Current Admin Navigation

The legacy admin sidebar currently exposes:

- Dashboard
- Questions
- Organizations
- Completed Surveys

There is no admin module for:

- branding
- runtime tenant config
- attribute templates
- scanner versions
- publish history
- runtime preview

## Current Organization Module

Current persisted fields:

- `name`
- `username`
- `password`
- `emailInvitationUsername`
- `emailInvitationPassword`
- `emailInvitationPasswordUpdatedAt`
- `survayProvideLink`
- `organizationSurvaysLink`
- `isDelete`

Current UI/API behavior:

- frontend create flow sends `{ name, password: "123456" }`
- no slug
- no plan
- no status
- no branding fields
- no runtime settings
- no attribute-template fields
- no active scanner version pointer

Current backend caution:

- `updateOrganizationIntoDB()` in `organization.service.ts` looks up `_id` from `data.name`, so it is not a safe base for future tenant config updates.

## Current Question Module

Current question CRUD is flat.

Persisted fields:

- `id`
- `question`
- `options`
- `domain`
- `weight`
- `isInverted`
- `isFollowUp`
- `dashboardDomain`
- `dashboardDomainMaxPossibleScore`
- `dashboardDomainWeight`
- `isDeleted`

Missing relative to runtime scanner contracts:

- scanner version entity
- category tree
- subdomain tree
- follow-up rule graph
- `questionText` vs `question` normalization
- per-question `polarity`
- per-question `scoring.optionScores`
- publish metadata
- immutable version history

Current backend caution:

- create/update forces `isInverted: true`
- validation assumes exactly 4 options
- `dashboardDomainWeight` and `dashboardDomainMaxPossibleScore` are derived by hardcoded domain rules

## Current Survey/Admin Monitoring

Implemented in the legacy system:

- start survey
- submit answer
- token-based scanner session
- invite upload/send/monitor routes
- organization and super-admin survey statistics

Not implemented for the runtime app:

- runtime-backed survey session API used by `tenantapp`
- runtime-backed dashboard aggregation API used by `tenantapp`

## Required Super Admin Evolution

### Tenant runtime contracts

Add CRUD for:

- tenant `name`
- tenant `slug`
- tenant `status`
- tenant `plan`
- tenant `createdAt`
- runtime settings

### Branding contracts

Add CRUD for:

- `logoUrl`
- `primaryColor`
- `secondaryColor`
- `fontFamily`
- `faviconUrl`

### Attribute templates

Add CRUD for:

- streams
- locations
- functions
- departments
- genders
- ageGroups
- seniorityLevels

### Scanner publishing

Add CRUD and publish workflow for:

- scanner draft metadata
- categories
- subdomains
- questions
- weights
- option-score arrays
- follow-up rules
- version string
- change log
- published timestamp
- active scanner selection

## Publishing Flow Gaps

Currently missing:

- draft vs published state
- immutable publish snapshot
- rollback or history selection
- active scanner switch per tenant
- runtime preview against a draft config

## Required Validations

- tenant slug uniqueness
- branding color format
- runtime-safe logo presence or default fallback
- attribute-template referential integrity
- option-score length matching option length
- follow-up target validation
- published scanner non-emptiness
- no mutation of published versions
