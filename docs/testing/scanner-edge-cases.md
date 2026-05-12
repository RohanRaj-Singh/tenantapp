# Scanner Edge Cases

## Empty Answers

Current runtime behavior:

- answers without label, score, id, or numeric order are filtered
- if fewer than two valid answers remain, the question is removed

Required DB safeguard:

- reject publish when any question resolves to fewer than two answers

## Duplicate IDs

Current runtime behavior:

- duplicate category IDs are ignored
- duplicate subdomain IDs are ignored
- duplicate question IDs are ignored
- duplicate answer IDs inside a question are ignored
- duplicate trigger IDs are ignored

Required DB safeguard:

- enforce unique IDs within each scanner version snapshot

## Invalid Trigger References

Current runtime behavior:

- missing trigger questions invalidate the trigger
- trigger scores with no numeric entries invalidate the trigger
- missing follow-up targets are removed from the trigger
- triggers with no valid follow-up targets are dropped

Required DB safeguard:

- publish validation must reject invalid trigger references instead of silently filtering them

## Orphan Follow-Ups

Current runtime behavior:

- follow-up questions not referenced by any valid trigger remain hidden
- runtime emits a configuration warning

Required DB safeguard:

- publish validation should block orphan follow-ups unless explicitly allowed as drafts only

## Missing Subdomains

Current runtime behavior:

- empty categories are tolerated
- empty categories contribute no rendered questions

Required DB safeguard:

- publishing should block categories that contain no publishable subdomains unless intentionally empty states are supported

## Partial Runtime Config

Current runtime behavior:

- valid questions still render
- invalid questions are filtered
- warning banner explains that some configuration issues were ignored safely

Required DB safeguard:

- drafts may allow partial saves
- publish should require a clean valid tree

## Invalid Weights

Current runtime behavior:

- questions with invalid or non-positive weight are removed

Required DB safeguard:

- publish validation must reject invalid weights

## Invalid Ordering

Current runtime behavior:

- entities missing numeric `order` are ignored at runtime
- valid entities are sorted strictly by explicit order

Required DB safeguard:

- require numeric order for categories, subdomains, questions, and answers

## Missing Scores

Current runtime behavior:

- answers missing numeric score are filtered
- questions are removed if too few valid answers remain

Required DB safeguard:

- publish validation must reject answers without explicit numeric scores
