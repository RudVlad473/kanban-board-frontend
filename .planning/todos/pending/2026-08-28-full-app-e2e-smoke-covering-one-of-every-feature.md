---
created: 2026-08-28T19:15:00.000Z
title: Full-app e2e smoke covering at least one of every feature in one run
area: testing
severity: major
files:
  - e2e/
  - docs/adr/tech/
  - CONVENTIONS.md
---

## Problem

Every e2e spec today proves one feature in isolation — `boards-create`, `columns-reorder`,
`tasks-move`, and so on. Each one seeds the state it needs, exercises its own slice, and tears
down. Nothing anywhere drives the application end to end as a single continuous session.

That leaves a whole class of failure uncovered: the features work piece by piece but do not
work together. A board created through the real create flow may not be the shape the column
flow expects. A task moved by drag may leave state the detail modal reads differently. Cache
revalidation after one action may invalidate a query another feature depends on. Per-feature
specs each start from a clean seed, so none of them can see it.

## Solution

Add one e2e spec that walks the whole application in a single run, in the order a real user
would, carrying state forward rather than reseeding between steps. At minimum one instance of
every feature:

- sign up or sign in
- create a board
- create a column, rename it, reorder columns
- create a task with subtasks
- move a task between columns (pointer and keyboard)
- open the task detail view
- toggle a subtask complete
- edit a task's title and description
- add, rename and delete a subtask
- delete a task
- rename and delete a board
- toggle the theme

The open question is **how to keep it honest**. A checklist in a spec file is exactly the thing
people forget to extend when they ship feature fourteen, and a stale smoke test that silently
covers thirteen of fourteen features is worse than none because it reads as coverage. Options
worth weighing before writing it:

- **Derive the list from something that already has to be updated.** `REQUIREMENTS.md` requirement
  IDs, or the `actions/` directory, are both things a new feature cannot avoid touching. A check
  script could assert every requirement ID marked done has a corresponding step in the smoke
  spec, and fail CI when one is missing — the same shape as the existing `coverage:check` and
  `actions:check` scripts.
- **Make it a phase-close gate.** Every phase already ends with a validation step; adding "extend
  the full-app smoke" to that checklist ties the update to a moment someone is already looking.
- **Accept drift and re-derive periodically.** Cheapest, weakest — worth naming only to reject.

Decide the sustaining mechanism first. Writing the spec without one just moves the problem.

Related: `e2e/seed.ts` and `e2e/seed.sh` carry the current per-spec seeding approach, and the
existing pending todo about folding e2e seeding into a single service module is a likely
prerequisite — a whole-app run needs one coherent seed entry point, not per-spec ones.

## Built 2026-09-03 — spec and sustaining mechanism landed, CI wiring deliberately not

The "derive the list from something that already has to be updated" option was taken.
`scripts/check-smoke-coverage.mjs` (`pnpm smoke:check`) parses `.planning/REQUIREMENTS.md` for
requirements marked `- [x]` and fails when one has no `test.step("<ID> — …")` in
`e2e/full-app.e2e.spec.ts`. It found a real gap on its first run (SYNC-01 had no step).

Gating on the ticked box gives the property the todo wanted: the eight Phase 04 requirements are
still `- [ ]`, so ticking them is exactly the moment the gate demands steps for them.

**What remains open: the spec is intermittently red and the cause is not identified.** Six runs on
2026-09-03 failed at four different points. Three failures were the spec's own synchronisation and
are fixed — a live `classList` read where the dark scope is applied by the server render, a reload
racing the ~1.5s theme-cookie write, and asserting on the board while a dialog had `aria-hidden`'d
it. The remaining two both failed at BOARD-02 with exactly one of two columns created and no
failure toast.

That last one is NOT reproducible by hand. The same interaction was driven manually three times and
succeeded every time: dev with an existing board via the sidebar path, dev with a fresh zero-board
account via the empty-state path, and a **production build** with a fresh account via the
empty-state path. That last case falsifies the obvious hypothesis — that the navigation to the new
board cuts the serial column-creation loop short, and that a prod build's faster navigation makes it
bite. The application creates both columns in every configuration tested.

So the cause is in the spec or its environment. Worth noting the shared nonprod backend was under
heavy concurrent load from this same session (repeated e2e runs, a dev server, and a subagent's test
run), which is plausible but was NOT demonstrated — and a partial column failure is supposed to
raise a toast, which never appeared.

Until that is understood, neither the spec nor `smoke:check` is wired into CI. Run both by hand.
Wiring an unexplained intermittent failure into CI trains people to ignore a red build.
