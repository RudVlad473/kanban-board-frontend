---
status: testing
phase: 02-board-management
source: [02-VERIFICATION.md]
started: 2026-08-26T11:10:00Z
updated: 2026-08-26T11:10:00Z
---

## Current Test

number: 1
name: Cross-account board-data leakage after sign-out/sign-in on a shared browser
expected: |
  Sign out of an account that has boards, then sign in as a different account on the same
  browser. No board name, board list, or board-detail content from the first account is ever
  visible, even for a frame, before the second account's own boards load. The sidebar and board
  view show only the newly signed-in account's own data (or an empty/loading state), never a
  flash of the previous account's boards.
awaiting: user response

## Tests

### 1. Cross-account board-data leakage after sign-out/sign-in on a shared browser
expected: No cross-account board data ever renders. The sidebar and board view show only the
newly signed-in account's own data (or an empty/loading state), never a flash of the previous
account's boards.
result: [pending]

### 2. No raw backend error text ever reaches user-facing copy
expected: Trigger a create-board duplicate-name refusal, a rename refusal, and a board-detail
403/404. Every message shown is this app's own authored copy (e.g. "A board with that name
already exists. Choose a different name.") — never a raw backend string, error code, or stack
trace fragment.
result: [pending]

### 3. Delete confirmation cannot be bypassed; rename rollback is always visibly announced
expected: Delete always requires an explicit affirmative click on "Delete Board" with initial
focus on "Keep Board" (no auto-confirm, no one-click destroy). A failed rename always raises a
visible danger toast at the moment of rollback, never a silent revert.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
