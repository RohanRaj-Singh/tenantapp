# Tenant Runtime Auth Edge Cases

## Expired Sessions

- expired server sessions are deleted on validation
- stale cookies redirect back to `/login`
- the session-expired UX message is preserved for the user

## Stale or Invalid Cookies

- malformed tenant session cookies are cleared by middleware
- missing server-side session records are treated as expired sessions

## Disabled Tenants

- dashboard login is blocked
- existing sessions are invalidated on the next protected request

## Archived Tenants

- dashboard login is blocked
- existing sessions are invalidated on the next protected request
- access cannot continue into analytics, reports, or settings

## Invalid Credentials

- invalid identifiers or passwords return a generic auth failure
- repeated failures trigger lightweight rate limiting

## Forced Password Changes

- `mustChangePassword = true` redirects to `/change-password`
- protected routes deny normal dashboard access until the password is updated

## Tenant Scope Mismatch

- a session created for one tenant slug cannot be reused against another tenant workspace
- the mismatched session is invalidated immediately
