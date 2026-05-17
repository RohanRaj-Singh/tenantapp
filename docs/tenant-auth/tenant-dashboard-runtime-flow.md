# Tenant Dashboard Runtime Flow

## Canonical Runtime Flow

1. Tenant owner opens `/login` within a resolved tenant workspace.
2. Login API validates credentials with bcrypt.
3. The login service confirms the user belongs to the current tenant slug.
4. A server-side tenant session is created and stored.
5. HttpOnly tenant auth cookies are written.
6. The user is redirected to `/dashboard` or `/change-password`.
7. Middleware protects future dashboard navigation.
8. Server-side layouts validate the session on each protected request.
9. Logout destroys the session and clears cookies immediately.

## Login

`/api/tenant-auth/login` performs:

- tenant resolution
- basic rate limiting
- lifecycle validation
- account-status validation
- bcrypt password comparison
- session creation
- cookie issuance

If `mustChangePassword` is true, the runtime always redirects to `/change-password` before normal dashboard access continues.

## Protected Navigation

Protected runtime routes are:

- `/dashboard/*`
- `/analytics/*`
- `/reports/*`
- `/settings/*`
- `/change-password`

Navigation behavior:

- authenticated user visiting `/login` is redirected into the protected tenant surface
- unauthenticated user visiting a protected route is redirected to `/login`
- invalid or expired session cookies are cleared
- tenant-scope mismatches invalidate the session immediately

## Logout

`/api/tenant-auth/logout`:

1. reads the tenant session cookie
2. deletes the server-side session
3. clears tenant auth cookies
4. redirects to `/login` or returns JSON success for client-triggered logout
