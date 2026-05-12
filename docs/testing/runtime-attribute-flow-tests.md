# Runtime Attribute Flow Tests

## Cascading Filter Tests

### Stream → Location Filtering

**Test:** Selecting a stream should filter locations to only those linked to the stream.

1. Given: Template with streams `["commercial", "operations"]` and locations linked to each
2. When: User selects `"commercial"` stream
3. Then: `getAvailableLocations()` returns only locations where `streamId === "commercial"`

**Test:** Changing stream should reset child selections.

1. Given: Selection state `{ stream: "commercial", location: "hq", function: "sales", department: "ent" }`
2. When: User changes stream to `"operations"`
3. Then: State becomes `{ stream: "operations", location: "", function: "", department: "" }`

### Location → Function Filtering

**Test:** Selecting a location should filter functions to only those linked to the location.

1. Given: Template with functions linked to specific locations
2. When: User selects a location
3. Then: `getAvailableFunctions()` returns only functions where `locationId` matches selected location

**Test:** Changing location should reset function and department.

1. Given: Selection state with location, function, and department selected
2. When: User changes location
3. Then: Function and department are cleared

### Function → Department Filtering

**Test:** Selecting a function should filter departments to only those linked to the function.

1. Given: Template with departments linked to functions
2. When: User selects a function
3. Then: `getAvailableDepartments()` returns only departments where `functionId` matches selected function

## Reset Tests

### State Sanitization

**Test:** `sanitizeRuntimeAttributeSelections()` clears stale selections.

1. Given: Selection references a non-existent function
2. When: `sanitizeRuntimeAttributeSelections()` is called
3. Then: Function and department are cleared

**Test:** Invalid selections are cleared on template change.

1. Given: Selection state referencing options that no longer exist in template
2. When: Template is updated via `useEffect`
3. Then: `sanitizeRuntimeAttributeSelections()` clears invalid values

## Submission Payload Tests

**Test:** Submission payload includes canonical attribute hierarchy.

1. Given: User selects stream → location → function → department
2. When: Form is submitted
3. Then: `sessionStorage` contains attributes with all four hierarchy levels

**Test:** Empty hierarchy blocks submission.

1. Given: Template with no valid stream → location → function → department path
2. When: User tries to submit
3. Then: `validation.canSubmit` is `false` with blocking message

## Runtime Validation Tests

**Test:** Missing required hierarchy path triggers blocking issue.

1. Given: Stream with no linked locations
2. When: Template is resolved
3. Then: `configurationIssues` contains warning about missing locations

**Test:** Incomplete chain (stream → location → function) without departments triggers blocking issue.

1. Given: Function with no linked departments
2. When: Template is resolved
3. Then: `configurationIssues` contains warning about missing departments

## Tenant Isolation Tests

**Test:** Multiple tenants maintain independent attribute templates.

1. Given: Two tenants with different hierarchies
2. When: User switches between tenants
3. Then: Each tenant's selections remain isolated in sessionStorage

**Test:** Invalid cross-tenant session is ignored.

1. Given: Session stored for tenant A
2. When: App loads for tenant B
3. Then: Session is ignored and not applied