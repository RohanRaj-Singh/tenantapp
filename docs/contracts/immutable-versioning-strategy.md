# Immutable Versioning Strategy

## Source Files

- `docs/contracts/canonical-scanner-contract.md`
- `docs/runtime/attribute-template-system.md`
- `docs/runtime/branding-system.md`
- `docs/contracts/canonical-response-contract.md`
- `docs/contracts/canonical-aggregation-contract.md`

## Canonical Version Tuple

Every accepted submission and every generated snapshot must preserve this immutable tuple:

```text
runtimeConfigId
+ scannerVersionId
+ attributeTemplateVersionId
+ calculationVersionId
+ brandingVersionId
```

`runtimeConfigId` is the published composition pointer.
The remaining version IDs are preserved explicitly so no later lookup is forced to infer the historical contract.

## Scanner Version Snapshot Behavior

- Publishing creates a new immutable `scannerVersionId`.
- The full category, subdomain, question, answer, and follow-up graph is frozen at publish time.
- Published scanner versions may be superseded, but never edited in place once referenced by a submission.
- Referenced scanner versions must remain readable even when no longer active.

## Attribute Template Snapshot Behavior

- Publishing creates a new immutable `attributeTemplateVersionId`.
- Stream, location, function, department, demographic options, and dependency rules are frozen for that version.
- Attribute labels may evolve in later versions, but historical submissions keep the original selected values and version reference.
- Published attribute template versions must not be deleted if raw responses reference them.

## Calculation Version Behavior

- Publishing or activating a new calculation contract creates a new immutable `calculationVersionId`.
- Formula changes do not rewrite historical raw responses.
- Historical aggregation may be recomputed into new snapshots, but only by writing new `aggregationSnapshots` with the new `calculationVersionId`.
- Default dashboard reads must not silently mix submissions from different calculation versions into one canonical snapshot.

## Branding Snapshot Behavior

- Branding changes create a new immutable `brandingVersionId` or a new immutable runtime config snapshot that points to the new branding payload.
- Branding versioning exists for audit, export fidelity, and future report reproduction.
- Branding changes do not change raw answers or aggregation math.
- Historical records may resolve branding for presentation, but never for recalculation.

## Runtime Config Snapshot Behavior

- Every publish of scanner, attributes, calculation, branding, or runtime settings creates a new immutable `runtimeConfigId`.
- `runtimeConfigs` is the tenant-facing published composition delivered by `GET /api/runtime/:tenantSlug`.
- The active tenant pointer may move to a newer runtime config without invalidating the historical config snapshots already referenced by submissions.

## How Old Submissions Stay Stable Forever

- Raw response records preserve all version references at accept time.
- Published version documents are retained even after supersession.
- Aggregation snapshots preserve the version tuple used at calculation time.
- Later UI changes render new submissions against new runtime configs instead of mutating old ones.
- Backfills, migrations, and exports must always start from preserved raw responses plus explicit version references.

## Forbidden Versioning Patterns

- Editing a published scanner or attribute template in place
- Reusing an old version ID for new content
- Deleting a referenced version document because a new version is active
- Recalculating an existing snapshot in place under a different formula version
