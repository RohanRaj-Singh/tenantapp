# Scanner Risk Analysis

## Legacy Risks Removed

### Hidden answer-position scoring

Removed from runtime.

Current runtime uses explicit answer objects with `score`.

### `isInverted`

Removed from runtime.

Question meaning is now defined by explicit answer scores, not inversion flags.

### Fixed 4-option assumption

Removed from runtime.

Current scanner mocks and renderer support variable answer counts.

### Domain-wide follow-up triggering

Removed from runtime.

Current runtime uses question-level trigger definitions.

### Frontend score derivation

Removed from runtime.

Frontend submits raw answer selections only.

## Runtime Coupling Reduced

- scanner validation is centralized in `scannerUtils.ts`
- follow-up sequencing is centralized in `scannerUtils.ts`
- submission row shaping is centralized in `scannerUtils.ts`
- scanner session safety now includes `scannerVersionId`

## Risks Prevented

- scanner edits no longer require answer-order score inference
- neutral answers are preserved explicitly
- scanner IDs no longer double as order
- different tenants can carry different scanner shapes without rewriting the survey UI

## Remaining Risks

- runtime still uses local mock scanners, not persisted DB data
- local submit route does not yet validate answer membership against a published scanner version
- no automated browser tests cover scanner flows yet
- dashboard formulas are intentionally deferred to the future calculation layer
