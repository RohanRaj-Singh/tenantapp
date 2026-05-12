# Runtime Config API

## Endpoint

```text
GET /api/runtime/:tenantSlug
```

## Purpose

Return the active immutable runtime configuration snapshot for the tenant.

This payload is the authoritative source for:

- scanner rendering
- attribute rendering
- runtime settings
- branding
- version references required for submission persistence

## Route Parameters

| Parameter | Type | Purpose |
| --- | --- | --- |
| `tenantSlug` | `string` | Resolve the tenant-scoped active runtime config |

## Success Response

```json
{
  "runtimeConfigId": "runtimecfg_2026_05_10_001",
  "publishedAt": "2026-05-10T08:00:00.000Z",
  "tenant": {
    "id": "tenant_acme_health",
    "name": "Acme Health",
    "slug": "acme-health",
    "status": "active",
    "plan": "enterprise"
  },
  "versionRefs": {
    "scannerVersionId": "scanner_v7",
    "attributeTemplateVersionId": "attr_v3",
    "calculationVersionId": "calc_v1",
    "brandingVersionId": "brand_v2"
  },
  "branding": {
    "logoUrl": "https://cdn.example.com/acme/logo.svg",
    "primaryColor": "#0f766e",
    "secondaryColor": "#115e59",
    "fontFamily": "IBM Plex Sans, sans-serif",
    "faviconUrl": "https://cdn.example.com/acme/favicon.ico"
  },
  "attributeTemplate": {},
  "scannerVersion": {},
  "runtimeSettings": {
    "allowAnonymous": true,
    "requireAuthentication": false,
    "surveyExpirationDays": 30,
    "allowMultipleSubmissions": false,
    "language": "en",
    "featureFlags": {}
  }
}
```

## Error Response

```json
{
  "error": {
    "code": "RUNTIME_CONFIG_NOT_FOUND",
    "message": "No active runtime configuration exists for the requested tenant.",
    "details": {}
  }
}
```

## Response Rules

- return a published immutable snapshot only
- do not compose scanner, attributes, and branding from unrelated draft documents
- return the full scanner and attribute template contract needed for rendering
- return `versionRefs` so the frontend can echo the expected version tuple during submit
- return runtime settings required for runtime gating, but do not return calculation formulas

## Backend Responsibilities

- resolve tenant by slug
- load the active published runtime config
- embed or compose the exact published scanner and attribute template snapshots
- expose explicit version references for audit-safe submission
- reject inactive or missing tenants with a controlled error state

## Frontend Responsibilities

- render only from this payload
- persist `runtimeConfigId` and `versionRefs` with the runtime session
- invalidate stale local sessions when the runtime config changes
- avoid mixing scanner or attribute data from older local caches

## Forbidden Frontend Behaviors

- hardcoding scanner structures when runtime data is available
- hardcoding attribute hierarchies when runtime data is available
- inferring formulas from `calculationVersionId`
- substituting a dashboard snapshot for runtime configuration
