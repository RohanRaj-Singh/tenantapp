# Tenant Runtime Auth Tests

## Covered Areas

The runtime auth test suite covers:

- successful login flow
- logout invalidation
- lifecycle blocking for draft-style, disabled, and archived tenants
- session restoration for the current tenant
- expired-session invalidation
- must-change-password flow
- password change flow
- rate limiting
- tenant-scope isolation
- redirect helper behavior
- protected-route matching

## Key Assertions

### Login and Session Creation

- active tenant owner credentials create a server-side session
- successful login updates `lastLoginAt`
- successful login returns whether password change is required

### Logout

- invalidating the session removes it from persistence immediately

### Lifecycle Enforcement

- disabled tenants are blocked
- archived tenants are blocked
- pre-live states are blocked with draft-style messaging

### Password Flow

- `mustChangePassword` is surfaced at login time
- authenticated password change clears the flag
- new-password validation enforces the minimum tenant password rules

### Session Integrity

- expired sessions are deleted during validation
- sessions cannot be reused against a different tenant slug
- malformed or missing route targets fall back to `/dashboard`
