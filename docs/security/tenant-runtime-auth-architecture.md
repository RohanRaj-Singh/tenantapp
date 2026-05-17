# Tenant Runtime Auth Architecture

## Purpose

The tenant app runtime auth layer protects only the tenant dashboard surface:

- `/dashboard/*`
- `/analytics/*`
- `/reports/*`
- `/settings/*`
- `/change-password`

Public survey runtime routes remain unauthenticated:

- `/`
- `/survey`
- `/survey-questions`
- `/submit`

## Core Runtime Boundary

Tenant runtime auth is isolated from super admin auth through:

- a separate session cookie: `tenant_dashboard_session`
- a separate password-change cookie: `tenant_dashboard_password_change`
- separate Mongo collections: `tenantDashboardUsers` and `tenantDashboardSessions`
- separate runtime middleware and server-side guards under `src/modules/tenant-auth`

No JWT, OAuth, RBAC, public signup, or team-management logic is part of this runtime layer.

## Session Architecture

Tenant runtime sessions use:

- bcrypt password verification
- cryptographically random `tds_*` session tokens
- server-side session persistence
- 7-day session expiry
- last-accessed updates on successful validation
- stale session cleanup on login and validation

Mongo sessions store an internal `expiresAtDate` for TTL cleanup while the public contract continues to expose the canonical string fields:

- `id`
- `tenantUserId`
- `tenantId`
- `sessionToken`
- `createdAt`
- `expiresAt`
- `lastAccessedAt`
- `ipAddress`
- `userAgent`

## Request Scoping

Every protected runtime request is tenant-scoped.

The middleware first resolves the request tenant from hostname or query string and injects tenant-resolution headers. Server-side auth validation then checks that:

1. the session exists
2. the session is not expired
3. the user is active
4. the tenant lifecycle still allows dashboard access
5. the session tenant matches the current request tenant

That final check is especially important for localhost and query-tenant flows so a cookie created for one tenant cannot be replayed against another tenant workspace.

## Lifecycle Enforcement

Runtime auth treats tenant lifecycle states as follows:

- `active`: dashboard access allowed
- `inactive` and `suspended`: dashboard blocked as not-live-yet
- `disabled`: dashboard blocked temporarily
- `archived`: dashboard blocked permanently

Blocked lifecycle states invalidate the active dashboard session and force a clean return to `/login`.

## Cookie Strategy

Tenant auth cookies are configured with:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` in production
- host-only scope by default
- path `/`

Middleware clears malformed tenant auth cookies before allowing dashboard access to continue.

## Protected Rendering Model

Protected pages do not rely on a client-side auth gate.

Instead:

1. middleware checks for a well-formed tenant session cookie before protected routes
2. server-side layout helpers validate the session against the current tenant
3. protected pages receive a static runtime provider so dashboard branding and theme context render without auth flicker

This keeps public runtime and protected runtime concerns separate while preserving the existing survey branding system for the dashboard shell.
