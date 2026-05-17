# Tenant Dashboard Protection

## Protected Routes

The tenant runtime protects:

- `/dashboard`
- `/dashboard/*`
- `/analytics`
- `/analytics/*`
- `/reports`
- `/reports/*`
- `/settings`
- `/settings/*`
- `/change-password`

Public routes remain outside runtime auth:

- `/`
- `/survey`
- `/survey-questions`
- `/about`
- `/contact`
- `/submit`

## Middleware Rules

Runtime middleware performs lightweight route protection only:

- inject tenant-resolution headers for downstream server logic
- redirect unauthenticated protected-page requests to `/login`
- clear malformed tenant auth cookies
- avoid touching public survey runtime routes

Full session validation remains server-side so tenant lifecycle, account status, and request-tenant matching stay authoritative.

## Protected API Rules

Protected APIs use tenant auth guards rather than trusting middleware alone.

Current protected runtime APIs include:

- `/api/dashboard/metrics`
- `/api/tenant-auth/me`
- `/api/tenant-auth/change-password`
- `/api/tenant-auth/logout`

The runtime API guard validates:

- tenant session presence
- session expiry
- current tenant scope match
- active account status
- active tenant lifecycle state
- must-change-password gating when required

## Lifecycle Enforcement

Tenant dashboard access follows this runtime policy:

- `active`: allow dashboard access
- `inactive` and `suspended`: block dashboard access until the tenant goes live
- `disabled`: block access temporarily
- `archived`: block access permanently

If a lifecycle state changes after login, the next protected request invalidates the old session and returns the user to `/login`.
