# AI Schema Context

## Build Order

1. Introduce `tenants`.
2. Introduce versioned branding and attribute-template storage.
3. Introduce immutable `scanner_versions`.
4. Introduce runtime-backed `survey_submissions` tied to `scannerVersionId`.
5. Introduce `dashboard_aggregations`.
6. Add compatibility adapters for legacy `organization`, `questions`, and `SurveyResponse` where needed.

## Required Schema Rules

- Store canonical IDs and labels together where the runtime contract needs both.
- Keep published scanner documents self-contained.
- Store `optionScores` with every question.
- Store follow-up rules inside the same published scanner version.
- Use `tenantId` on every runtime-facing record.
- Keep `publishedAt`, `createdBy`, `changeLog`, and `version` for scanner history.

## Required Validation Rules

- `options.length === scoring.optionScores.length`
- every follow-up rule references existing question IDs in the same scanner version
- `questionCount` is derived from `questions.length`
- `functions[*].streamId` references an existing stream
- `departments[*].functionId` references an existing function
- tenant branding colors are valid hex values

## Migration Cautions

- Do not migrate legacy `questions` into one mutable shared scanner.
- Do not collapse all tenants into one shared attribute template.
- Do not discard legacy data needed for invite status or completed-survey history during initial rollout.
- Do not rely on legacy 4-option scoring assumptions.

## Preferred Runtime-to-DB Mapping

- `tenant.name` -> `tenants.name`
- `tenant.slug` -> `tenants.slug`
- `branding.*` -> branding config document
- `attributeTemplate.*` -> attribute template document
- `scannerVersion.*` -> immutable scanner version document
- `SurveySubmission.attributes.*` -> stored submission attributes using runtime IDs
- `AggregationOutput` -> stored snapshot payload

## Forbidden Shortcuts

- no inline runtime-config JSON blobs stored only in the frontend codebase
- no scanner edits directly against published documents
- no browser-only dashboard calculations once aggregation is live
- no reusing `organizationId` as `tenantSlug`
