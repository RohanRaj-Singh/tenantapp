# Tenant Runtime Resolution

## Resolution Flow

The runtime app now resolves tenants through a shared path used by middleware, runtime config loading, dashboard aggregation, and survey submission handling.

```text
request
-> middleware hostname/query parsing
-> request tenant context headers
-> runtime context resolution
-> active tenant lookup
-> active runtime config lookup
-> branding + scanner + attributes + dashboard scope
```

## Hostname Parsing

The shared resolver in `runtime/tenant/tenantResolution.ts` supports:

- local hosts such as `localhost` and `127.0.0.1`
- wildcard local domains such as `*.lvh.me`
- future production root domains through `NEXT_PUBLIC_ROOT_DOMAIN`

Examples:

- `demo.lvh.me` -> `demo`
- `tenant-b.lvh.me` -> `tenant-b`
- `localhost?tenant=demo` -> `demo`

## Middleware Contract

`middleware.ts` resolves the request tenant using the raw incoming host header first, which keeps local `lvh.me` subdomains working during `next dev`.

The middleware forwards canonical request context through headers so downstream routes all operate on the same tenant decision.

## Runtime Config Lookup

`/api/runtime/current` is now the authoritative runtime bootstrap endpoint for the client provider.

It resolves the current tenant request, then loads the published runtime config through `resolveRuntimeContext()`.

That lookup only succeeds when:

- the tenant exists
- the tenant is active
- a published runtime config exists
- provided tenant identifiers agree with the resolved runtime config

## Submission Resolution

`/api/survey/submit` now validates the submission body against the active request tenant context.

Protections include:

- `tenantSlug`, `tenantId`, and `runtimeConfigId` mismatch rejection
- host-based tenant mismatch rejection
- runtime version mismatch rejection
- published scanner and attribute template enforcement

## Dashboard Resolution

`/api/dashboard/metrics` now uses the same request tenant context as runtime bootstrap and submission handling.

This keeps hostname-based and localhost-fallback requests consistent for:

- dashboard snapshots
- runtime config scope
- scanner version scope
- calculation version scope

## Isolation Guarantees

Tenant isolation is enforced at multiple layers:

- hostname wins over query fallback when both are present
- runtime configs are loaded by active tenant scope
- dashboard snapshots are keyed by `tenantId` and `runtimeConfigId`
- submissions are stored with `tenantId`, `tenantSlug`, and `runtimeConfigId`
- conflicting host/body/runtime identifiers return errors instead of cross-tenant data

Verified local behavior:

- `tenant-b.lvh.me` resolves as `tenant-b`
- `tenant-b.lvh.me?tenant=demo` still resolves as `tenant-b`
- `localhost:3001?tenant=demo` resolves as `demo`
- bare `localhost:3001` returns a safe unavailable response
- dashboard metrics stay pinned to the hostname tenant
- submission attempts with a mismatched hostname are rejected
