---
created: 2026-09-02T00:00:00.000Z
title: Replace raw null/undefined comparisons with es-toolkit's isNil
area: code-quality
severity: minor
files:
  - src/**/*.ts
  - src/**/*.tsx
  - eslint.config.mjs
---

## Problem

`src/` carries **167 raw nullish comparisons across 77 files** — `=== null`, `!== null`,
`=== undefined`, `!== undefined` (55 null-form, 115 undefined-form; some lines carry both).
49 of the 167 are in test/story files, so roughly 118 are production sites.

`es-toolkit`'s `isNil` is already a pinned dependency and the project has settled on it
(`src/components/ui/text-field/text-field.tsx:3` is the shipped precedent; `isNil` specifically,
never `isEmpty`, because `isEmpty(0)` is `true` and `targetPosition` is `z.number().min(0)`).
But adoption stopped at the one site that needed it, so the codebase now reads two ways for the
same check.

Two sites were converted on 2026-09-02 as part of the Phase 04 checkpoint response
(`src/test-utils/raised-toasts.ts`, `src/features/tasks/hooks/use-open-board-columns.ts`);
those were in scope only because a separate defect touched them. The remaining ~165 were
deliberately left alone — see the count above before assuming this is a small change.

## New code uses `isNil` regardless

Deferring the sweep does NOT license writing fresh raw comparisons. This was breached the same
day it was filed: `use-delete-task.ts` was rewritten optimistic by copying `use-delete-column.ts`'s
shape verbatim, carrying `context?.previousBoard !== undefined` in with it, and the reviewer
caught it. Copying a sibling hook is exactly how the count grows while a todo says it is frozen.

Converted at the point of writing, so they never joined the backlog: `use-delete-task.ts`
(2 sites) and `create-children-serially.ts` (1). Until a lint rule exists, this section is the
only thing holding the line.

## Solution

Not picked up. This is a callout for a future session, not scheduled work.

If taken up:

1. Decide the boundary first. `isNil(x)` collapses `null` and `undefined` into one check, which
   is **not** equivalent to `x === null` where the two are meaningfully distinct — e.g. a field
   where `null` means "explicitly cleared" and `undefined` means "not supplied". Audit for those
   before a blanket sweep; a mechanical codemod would silently change behaviour at any such site.
2. Decide whether tests are in scope. The 49 test/story occurrences are mostly assertions where
   the raw comparison is arguably clearer about what is being asserted.
3. The lint rule now exists: `local/prefer-is-nil`, wired in `eslint.config.mjs` section 11 at
   **`"warn"`** and reporting 175 sites. Promoting it to `"error"` is this sweep's finish line and
   has its own todo:
   [`2026-09-02-promote-prefer-is-nil-from-warning-to-error.md`](./2026-09-02-promote-prefer-is-nil-from-warning-to-error.md).
   Original note, kept because it still applies to any rule change: enforce with lint rather than prose, or it will drift straight back. `no-restricted-syntax`
   on `BinaryExpression` with a `null`/`undefined` operand is the shape; **make the rule fail
   first** before trusting it — a green run is not evidence a new guard works, which this repo
   has already been bitten by (`import-x/no-cycle` reported a real cycle as clean until
   `import-x/parsers` was configured; `docs/adr/tech/0031` records the re-falsification rule).
4. Land it as its own commit with no functional change riding along, so a behaviour regression
   at a `null`-vs-`undefined` boundary is bisectable.

## Related

`eslint.config.mjs` rule 8i (empty-consequent ternaries) was broadened on 2026-09-02 in the same
session. That rule governs branch *order*, not the comparison form — it does not and will not
catch a raw `=== null`.
