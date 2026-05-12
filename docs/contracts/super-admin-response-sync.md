# Super Admin Response Sync

## Source Files

- `docs/contracts/super-admin-scanner-sync.md`
- `docs/contracts/immutable-versioning-strategy.md`
- `docs/contracts/response-storage-strategy.md`
- `docs/contracts/api/runtime-config-api.md`

## Purpose

This document defines what Super Admin must support so the response pipeline can stay immutable, versioned, and backend-authoritative.

## Required Super Admin Capabilities

| Capability | Required Support | Why It Matters |
| --- | --- | --- |
| Immutable publishing | Publish creates a new version or runtime snapshot instead of editing live records | Prevents historical response drift |
| Version freezing | Show version IDs and freeze them after publish | Keeps submissions tied to a stable contract |
| Scanner publishing | Publish scanner trees as immutable `scannerVersionId` values | Preserves question, answer, and follow-up structure |
| Runtime snapshots | Compose and publish `runtimeConfigId` snapshots from scanner, attributes, branding, and calculation references | Gives the runtime and submit API one authoritative configuration pointer |
| Future calculation versioning | Register and select `calculationVersionId` without exposing formulas to the frontend | Lets formulas evolve safely later |

## Immutable Publishing Requirements

Super Admin must support:

- draft creation
- draft validation
- publish confirmation
- publish audit trail
- active version pointer updates without in-place mutation

Super Admin must not support:

- editing a published scanner directly
- editing a published attribute template directly
- silently swapping calculation references under an existing runtime config

## Version Freezing Requirements

On publish, Super Admin must freeze:

- `scannerVersionId`
- `attributeTemplateVersionId`
- `calculationVersionId`
- `brandingVersionId`
- resulting `runtimeConfigId`

After publish, these IDs become read-only for the published snapshot.

## Scanner Publishing Requirements

Super Admin must:

- validate question and answer membership before publish
- validate follow-up trigger references before publish
- create a new scanner version for any structural or scoring metadata change
- preserve prior published scanner versions for historical submission lookup

## Runtime Snapshot Requirements

Super Admin must publish a composed runtime snapshot that includes:

- tenant identity
- branding payload
- attribute template payload
- scanner payload
- runtime settings
- explicit version references

This is the payload later served by `GET /api/runtime/:tenantSlug`.

## Future Calculation Versioning Requirements

Super Admin must be ready to:

- register new calculation versions
- attach a calculation version to a runtime publish
- keep older calculation versions resolvable for historical audits
- backfill new aggregation snapshots without changing historical raw responses

## Operational Rules

- referenced published versions are retained, not hard-deleted
- superseded versions stay queryable
- publish UI should show downstream impact before activation
- runtime config history should remain inspectable for support and audit use
