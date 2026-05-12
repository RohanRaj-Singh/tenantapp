# Local Subdomain Development

## Goal

Run the tenant runtime locally with production-style tenant URLs while keeping the existing localhost query fallback available for debugging.

## Environment

Set the runtime root domain in the tenant app:

```env
NEXT_PUBLIC_ROOT_DOMAIN=lvh.me
```

`lvh.me` resolves wildcard subdomains to `127.0.0.1`, so local tenant hosts work without editing the hosts file.

## Local URLs

Use tenant-specific runtime hosts on port `3001`:

- `http://demo.lvh.me:3001`
- `http://tenant-b.lvh.me:3001`
- `http://tenant-c.lvh.me:3001`

Keep the localhost fallback for local debugging:

- `http://localhost:3001?tenant=demo`

## Running Both Apps

Run the Super Admin app separately on `localhost:3000`.

Run the tenant runtime app on `localhost:3001`.

Example:

```bash
npm run dev -- --port 3001
```

## Resolution Priority

Tenant resolution inside the runtime app now follows this order:

1. Hostname subdomain
2. Localhost or bare-root query fallback
3. Stored local fallback for localhost-style development
4. Optional environment fallback

`tenant-b.lvh.me?tenant=demo` still resolves to `tenant-b`.

## Middleware Behavior

`middleware.ts` now resolves tenant request context once per request and forwards it through request headers for the runtime app and runtime APIs.

Forwarded request metadata includes:

- resolved tenant slug
- resolution source
- hostname
- configured root domain
- resolution failure reason

## Localhost Fallback Behavior

`localhost` requests do not infer a tenant from the hostname.

Use:

```text
http://localhost:3001?tenant=demo
```

The client runtime keeps that local debugging tenant available across in-app navigation, and runtime API calls continue passing the explicit tenant query when the request is running in localhost fallback mode.

## Safe Unavailable States

Bare localhost requests without a tenant now return a runtime-safe unavailable state instead of silently loading another tenant.

Examples:

- invalid or missing tenant slug
- bare `localhost:3001`
- inactive, disabled, or archived tenant
- missing published runtime configuration

The runtime shell renders:

```text
This survey is currently unavailable.
```

instead of exposing undefined runtime data.
