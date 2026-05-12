# Runtime Attribute Flow Edge Cases

## Stale Selection Scenarios

### Scenario 1: Stale Department After Function Change
```
Initial: Stream A → Location X → Function 1 → Department α
Action: Change Function 1 → Function 2 (which has no Department α)
Expected: Department α is cleared, department dropdown shows empty state
```

### Scenario 2: Stale Function After Location Change
```
Initial: Stream A → Location X → Function 1 → Department α
Action: Change Location X → Location Y (which has no Function 1)
Expected: Function 1 and Department α are cleared
```

### Scenario 3: Stale Location After Stream Change
```
Initial: Stream A → Location X → Function 1 → Department α
Action: Change Stream A → Stream B
Expected: All child selections (location, function, department) are cleared
```

## Invalid Hierarchy Combination Scenarios

### Scenario 1: Missing Leaf Node
```
Structure: Stream A → Location X → Function 1 → (no departments)
Expected: 
  - Stream and location selectable
  - Function selectable
  - Department field disabled with message "No departments are available for the selected function."
  - Form blocked from submission
```

### Scenario 2: Orphan Department Reference
```
Data: Department references functionId that doesn't exist
Expected: Department is filtered out during template resolution
           configurationIssues logs the orphaned reference
```

### Scenario 3: Parallel Paths with Different Completeness
```
Structure:
  Stream A → Location X → Function 1 → Department α
  Stream B → Location Y → Function 2 → (no departments)
Expected:
  - Both streams selectable
  - Stream A path works completely
  - Stream B path stops at function, department disabled
  - Form allows submission only if Stream A path is complete
```

## Partial Hierarchy Loading Scenarios

### Scenario 1: Stream Exists But No Locations Loaded
```
Data: streams: [{...}] but locations: []
Expected:
  - Stream dropdown enabled
  - Location dropdown disabled with "No locations are available for the selected stream."
  - Form blocked from submission
```

### Scenario 2: Template Loads After Initial Render
```
Timing: Component renders before attributeTemplate resolves
Expected:
  - Loading state shown
  - Once template resolves, form builds correctly
  - No stale selections from previous template
```

## Missing Parent Mapping Scenarios

### Scenario 1: Location References Non-Existent Stream
```
Data: { streamId: "nonexistent" }
Expected: Location is filtered out during resolution
           Issue logged: "Location "..." references missing stream..."
```

### Scenario 2: Function References Non-Existent Location
```
Data: { locationId: "nonexistent" }
Expected: Function is filtered out
           Issue logged during resolution
```

### Scenario 3: Department References Non-Existent Function
```
Data: { functionId: "nonexistent" }
Expected: Department is filtered out
           Issue logged during resolution
```

## Empty Branch Scenarios

### Scenario 1: Stream Has No Locations
```
Data: streams: [{...}] locations: []
Expected:
  - configurationIssues logs: "Stream "..." has no linked locations."
  - Location dropdown disabled
  - Form blocked
```

### Scenario 2: Location Has No Functions
```
Data: Location exists but no functions have matching locationId
Expected:
  - configurationIssues logs: "Location "..." has no linked functions."
  - Function dropdown disabled
  - Form blocked
```

### Scenario 3: Function Has No Departments
```
Data: Function exists but no departments have matching functionId
Expected:
  - configurationIssues logs: "Function "..." has no linked departments."
  - Department dropdown disabled
  - Form blocked
```

## Runtime Reset Failure Scenarios

### Scenario 1: Reset Fails to Clear Deep Selection
```
Bug Condition: applyRuntimeAttributeSelection doesn't reset all children
Action: Change parent, child selection persists in UI
Fix: Ensure all child fields are explicitly cleared in the hierarchy order
```

### Scenario 2: Sanitization Doesn't Run on Template Update
```
Bug Condition: useEffect with sanitize doesn't trigger when expected
Action: Invalid selections persist after template change
Fix: Verify dependency array includes resolvedTemplate
```