# Attribute Template System

## Source Files

- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/attributes/attributeTemplateUtils.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/runtime/hooks/useAttributeTemplate.ts`
- `tenantapp/runtime/hooks/useRuntimeAttributeForm.ts`
- `tenantapp/runtime/mocks/mockRuntimeConfig.ts`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`
- `tenantapp/components/dashboard/filter/DashboardFilters.tsx`

## Runtime Contract Shape

`tenantapp` now resolves attribute templates through a centralized runtime layer.

```ts
attributeTemplate: {
  streams: Array<{ id: string; label: string; value: string }>;
  locations: Array<{
    id: string;
    label: string;
    value: string;
    streamIds?: string[];
  }>;
  functions: Array<{
    id: string;
    label: string;
    value: string;
    streamId?: string;
    streamIds?: string[];
    departmentIds?: string[];
    locationIds?: string[];
  }>;
  departments: Array<{
    id: string;
    label: string;
    value: string;
    streamId?: string;
    streamIds?: string[];
    functionId?: string;
    functionIds?: string[];
    locationIds?: string[];
  }>;
  genders?: string[];
  ageGroups?: string[];
  seniorityLevels?: string[];
  fixedAttributes?: {
    location?: { enabled?: boolean; required?: boolean; label?: string; placeholder?: string };
    gender?: { enabled?: boolean; required?: boolean; label?: string; placeholder?: string };
    age?: { enabled?: boolean; required?: boolean; label?: string; placeholder?: string };
    seniority?: { enabled?: boolean; required?: boolean; label?: string; placeholder?: string };
  };
}
```

## Centralized Runtime Layer

`tenantapp/runtime/attributes/attributeTemplateUtils.ts` is the active source of truth for:

- template normalization
- duplicate filtering
- broken-reference filtering
- field visibility
- hierarchical option filtering
- parent-change resets
- required-field validation
- blocking empty-state detection

`tenantapp/runtime/hooks/useRuntimeAttributeForm.ts` owns the live form state for `/survey`.

## Active Runtime Flow

1. `RuntimeConfigProvider` loads the selected mock tenant config.
2. `/survey` resolves `config.attributeTemplate` through `useRuntimeAttributeForm()`.
3. The runtime layer exposes:
   - `fields`
   - `validation`
   - `configurationIssues`
   - `selections`
   - `updateSelection()`
4. Valid selections are persisted to `sessionStorage` through `surveySession.ts`.
5. `/survey-questions` reads the saved runtime attribute session and includes it in the final submission payload.

## Implemented Hierarchy Behavior

The mounted runtime path now supports:

- `stream` as the root hierarchy field
- stream-filtered locations when `location.streamIds` exists
- stream-filtered departments
- department-filtered functions
- function-filtered departments
- optional location-based narrowing for both departments and functions

Reset behavior:

- changing `stream` clears `location`, `department`, and `function`
- changing `location` clears `department` and `function`
- changing `department` clears `function` when the selected function is no longer valid
- changing `function` clears `department` when the selected department is no longer valid

## Fixed Attributes

Implemented fixed attributes:

- `location`
- `gender`
- `age`
- `seniority`

Runtime rules:

- if an option array exists, the field is enabled by default
- enabled fields are required by default
- `fixedAttributes.*` can override `enabled`, `required`, labels, and placeholders
- if a fixed attribute is disabled, the runtime clears any stale selection
- if a fixed attribute is enabled but has no options, the UI stays safe and the survey is blocked with an explicit empty state

## Mock Tenant Coverage

### `tenant-a`

- full hierarchy
- full demographics
- single-parent `streamId` and `functionId` mappings

### `tenant-b`

- different stream/location/function/department structure
- many-to-many `functionIds` and `departmentIds`
- stream-scoped locations
- `seniority` disabled through `fixedAttributes`
- renamed `location` label and placeholder

### `tenant-c`

- partial hierarchy
- invalid function and department references
- broken mappings filtered out during normalization
- one stream path remains valid and another intentionally resolves to empty departments
- `seniority` disabled

### `tenant-d`

- no streams
- empty hierarchy
- demographics still present
- survey safely blocks with a stream empty state

## Session Payload Shape

The saved runtime attribute session and active submit payload use canonical `value` strings:

```json
{
  "attributes": {
    "stream": "clinical_services",
    "location": "central_campus",
    "department": "patient_services",
    "function": "care_delivery",
    "gender": "female",
    "age": "25-34",
    "seniority": ""
  }
}
```

Empty strings are allowed for disabled optional attributes.

## Current Safe-Handling Rules

- duplicate values are ignored
- invalid stream/function/department/location references are ignored
- missing demographic arrays do not crash the form
- missing tenant attribute sessions block `/survey-questions` with a recovery state
- invalid stored sessions are cleared from `sessionStorage`

## Current Mismatches Still Present

- `tenantapp/components/dashboard/filter/DashboardFilters.tsx` still contains a separate hardcoded attribute hierarchy.
- The active survey route does not activate `followUpRules`.
- Legacy backend survey contracts still use different field names and enums than the runtime payload.
