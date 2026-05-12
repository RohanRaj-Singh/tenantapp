# Response Pipeline Edge Cases

## Source Files

- `docs/contracts/canonical-response-contract.md`
- `docs/contracts/canonical-aggregation-contract.md`
- `docs/contracts/immutable-versioning-strategy.md`
- `docs/contracts/api/submit-response-api.md`

## Edge-Case Matrix

| Case | Expected Behavior | DB Safeguard | Aggregation Safeguard |
| --- | --- | --- | --- |
| Partial submissions | Accept only if the platform intentionally supports immutable `in-progress` records. Otherwise reject as incomplete and keep progress outside canonical persistence. Completed records are never mutated into partial or vice versa. | If stored, flag with `completionState.status = "in-progress"` and keep a unique `submissionId` per accepted record. | Exclude `in-progress` records from canonical dashboard snapshots by default. |
| Invalid question IDs | Reject the request. Do not persist an accepted raw response record. | Validate `questionId` membership against `scannerVersionId` before insert. | Never attempt to aggregate quarantined or rejected payloads. |
| Deleted scanner versions | Do not hard-delete any scanner version referenced by a response or snapshot. Mark it superseded or inactive only. | Foreign-key-by-convention validation through preserved `scannerVersionId` and retention rules. | Continue resolving historical submissions against the preserved version document. |
| Missing answers | Reject `completed` submissions when any required visible question has no valid answer. If future partial support exists, store only as explicit `in-progress`. | Validate visible question count against `completionState.answeredQuestions`. | Exclude incomplete records unless an explicit partial analytics path exists. |
| Stale runtime configs | Accept only when `runtimeConfigId` still resolves to a preserved published snapshot and all echoed version refs match it. Reject revoked or unknown snapshots. | Retain superseded runtime configs; never overwrite them in place. | Aggregate by the preserved `runtimeConfigId` and version tuple that was actually submitted. |
| Orphan follow-ups | Reject follow-up rows that do not map to a valid trigger question or were not actually unlocked by the accepted primary answer. | Validate `questionKind`, `triggerQuestionId`, and trigger membership before insert. | Never infer missing trigger context during aggregation. |
| Duplicate submissions | Enforce tenant policy from runtime settings. If multiple submissions are disallowed, reject duplicates for the same invite or respondent scope. | Unique or semi-unique enforcement via `inviteToken`, session policy, or respondent identifier strategy. | Do not deduplicate heuristically inside aggregation after bad writes; reject or quarantine earlier in the pipeline. |
| Version mismatches | Reject when request version refs differ from the authoritative runtime config snapshot. | Compare `runtimeConfigId`, `scannerVersionId`, and `attributeTemplateVersionId` before insert; stamp `calculationVersionId` server-side. | Never mix mismatched version records into a canonical snapshot. |

## Additional Safeguard Rules

- Published versions may be superseded, never edited in place.
- Rejected requests do not create canonical `rawResponses` records.
- Aggregation jobs must fail closed when version references cannot be resolved.
- Dashboard APIs must return pending or empty states instead of falling back to raw response reads.
