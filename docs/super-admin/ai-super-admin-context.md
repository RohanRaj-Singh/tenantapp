# AI Super Admin Context

## Use This File For

- generating new admin CRUD modules
- extending the legacy admin UI safely
- introducing draft/publish workflow
- aligning admin write models with `tenantapp` runtime contracts

## Required Module Boundaries

- tenant registry module
  owns tenant identity and status
- branding module
  owns runtime branding fields only
- attribute-template module
  owns hierarchy and demographic sets
- scanner draft module
  owns editable draft tree
- scanner publish module
  owns immutable publish snapshots and active pointers

## Do Not Reuse Directly

- legacy flat `questions` collection as the final runtime scanner store
- legacy `organization` model as the complete runtime tenant contract
- legacy dashboard stats endpoints as runtime config APIs

## Required Admin Behaviors

- save drafts without affecting production runtime config
- preview draft config in a tenant-scoped runtime preview path
- publish new immutable versions
- switch active published version per tenant
- retain publish history

## Required Admin Validations

- slug uniqueness before save
- valid hex branding values
- non-empty scanner publish
- stable question IDs inside a published version
- no missing follow-up references
- consistent attribute-template hierarchy

## Forbidden Admin Patterns

- editing published scanners in place
- mixing draft and published records in one mutable document without state guards
- storing follow-up mappings as loose strings outside the scanner version
- letting UI-only labels become canonical stored values
