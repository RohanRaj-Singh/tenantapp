# Attribute Template System

## Canonical Hierarchy

**Stream → Location → Function → Department**

```
Stream
  └── (filters) → Location
                   └── (filters) → Function
                                └── (filters) → Department
```

## Source Files

- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/attributes/attributeTemplateUtils.ts`
- `tenantapp/runtime/attributes/surveySession.ts`
- `tenantapp/runtime/hooks/useRuntimeAttributeForm.ts`
- `tenantapp/runtime/mocks/mockRuntimeConfig.ts`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/components/dashboard/filter/DashboardFilters.tsx`

## Runtime Contract Shape

```ts
attributeTemplate: {
  streams: Array<{ id: string; label: string; value: string }>;
  locations: Array<{
    id: string;
    label: string;
    value: string;
    streamId: string;  // Links location to stream
  }>;
  functions: Array<{
    id: string;
    label: string;
    value: string;
    locationId: string;  // Links function to location
  }>;
  departments: Array<{
    id: string;
    label: string;
    value: string;
    functionId: string;  // Links department to function
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

- Template normalization and deduplication
- Broken-reference filtering
- Hierarchical option filtering
- Parent-change reset behavior
- Required-field validation
- Blocking empty-state detection

`tenantapp/runtime/hooks/useRuntimeAttributeForm.ts` owns the live form state for `/survey`.

## Active Runtime Flow

1. `RuntimeConfigProvider` loads the tenant config
2. `/survey` resolves `config.attributeTemplate` through `useRuntimeAttributeForm()`
3. The runtime layer exposes:
   - `fields` - Computed field states with visibility/disabled status
   - `validation` - Blocking issues and submit capability
   - `configurationIssues` - Template mapping warnings
   - `selections` - Current user selections
   - `updateSelection()` - Handler for user changes
4. Valid selections persist to `sessionStorage` via `surveySession.ts`
5. `/survey-questions` reads the session and includes it in the final submission payload

## Cascading Filter Behavior

### Stream Selection
- `selectedStream` → filters available `locations` via `getLocationsForStream(template, streamId)`
- Changing stream resets `location`, `function`, and `department`

### Location Selection
- After stream selection, selected location filters available `functions` via `getFunctionsForLocation(template, locationId)`
- Changing location resets `function` and `department`

### Function Selection
- After location selection, selected function filters available `departments` via `getDepartmentsForFunction(template, functionId)`
- Changing function resets `department`

### Department Selection
- Final leaf node in the hierarchy, no further filtering

## Reset Behavior

```ts
// In applyRuntimeAttributeSelection():
if (field === "stream") {
  nextSelections.location = "";
  nextSelections.function = "";
  nextSelections.department = "";
}
if (field === "location") {
  nextSelections.function = "";
  nextSelections.department = "";
}
if (field === "function") {
  nextSelections.department = "";
}
```

## Fixed Attributes

- `location`, `gender`, `age`, `seniority`
- Enabled when option arrays exist
- Required by default when enabled
- Disabled fields clear stale selections

## Session Payload Shape

```json
{
  "attributes": {
    "stream": "commercial",
    "location": "commercial_hq",
    "function": "business_development",
    "department": "strategic_partnerships",
    "gender": "female",
    "age": "25-34",
    "seniority": "senior"
  }
}
```

## Safe-Handling Rules

- Duplicate values are ignored during normalization
- Invalid stream/location/function/department references are filtered out
- Missing demographic arrays do not crash the form
- Invalid stored sessions are cleared from `sessionStorage`
- Surveys with incomplete hierarchy show explicit blocking messages