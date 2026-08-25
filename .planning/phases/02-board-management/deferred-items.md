# Deferred Items — Phase 02

Out-of-scope discoveries logged during plan execution. Not fixed — outside the scope of the
plan that surfaced them.

## 02-02

- **`.claude/settings.local.json` fails `pnpm format:check`** — untracked, harness-managed local
  settings file (not part of `scripts/serve-static.mjs`, `scripts/serve-static.unit.test.mjs`, or
  `vitest.config.ts`, the only files this plan touches). Pre-existing before this plan's session
  started; unrelated to the path-traversal fix or the vitest wiring. `pnpm format:check` scoped to
  this plan's own files passes cleanly.

## 02-09

- **`app/layout.tsx(19,41): error TS2304: Cannot find name 'LayoutProps'`** — `pnpm exec tsc
  --noEmit` fails on the root `app/layout.tsx`, a file this plan never touches (confirmed via
  `git diff --stat HEAD -- app/layout.tsx`: no diff). Pre-existing before this plan's session
  started, unrelated to the sidebar/board-list split. `tsc` scoped to this plan's own changed
  files (`app/(dashboard)/layout.tsx`, `src/components/layout/sidebar/*`,
  `src/features/boards/components/*`) reports no new errors.
- **`.claude/settings.local.json` fails `pnpm format:check`** — same pre-existing, untracked,
  harness-managed file noted under 02-02 above; still present and still unrelated to this plan's
  files.

## 02-10

- **BLOCKED ON BACKEND — boards cannot be sorted by creation date.** Raised during 02-10
  checkpoint review: the sidebar board list has no ordering control, and none can be built
  client-side. `BoardResponseDTO` exposes exactly `["id", "name", "version"]` — no `createdAt`,
  no `updatedAt`, no `position`. `GET /boards` accepts exactly one parameter, `userId`: no
  `sort`, `order`, or `pageable`. Verified directly against `docs/api/kanban-board-openapi.json`,
  not inferred from the client types.

  There is no client-side workaround: the data does not exist in the response, so any ordering
  the frontend applies would be arbitrary (current order is whatever the backend returns, with no
  documented guarantee). `GET /boards/{boardId}/activity` *does* accept `pageable`, so the
  backend already has the pagination/sorting pattern — it simply is not exposed on `/boards`.

  **Needs a backend change** before any frontend work is possible. Minimum ask: add a creation
  timestamp to `BoardResponseDTO`. Better: add `sort`/`pageable` to `GET /boards` matching the
  `/activity` convention already in the contract.

- **Duplicate board names are rejected by the backend, contradicting a locked plan truth.** The
  02-10 plan asserted "Duplicate board names are allowed — creating a board whose name another
  board already has succeeds." Probed twice against the real backend during execution: a
  duplicate name returns `409 Conflict`, `code: "DUPLICATE_RESOURCE"`,
  `detail: "Board with that name already exists"`. No probe in `02-BACKEND-FACTS.md` ever tested
  this, so the truth was assumed, not measured. The app handles the failure correctly (D-05:
  modal stays open, inline error), but two decisions remain open: whether duplicates *should* be
  permitted (a backend change), and whether the generic "Couldn't create board. Try again." is
  adequate copy for a name collision under the UI-SPEC Copywriting Contract. This constraint
  most likely also applies to board rename (02-12) — worth probing there before assuming.

- **`CONVENTIONS.md` contradicts ADR tech/0019 on who calls `refresh()`.** `CONVENTIONS.md` says
  the *client caller* invokes `router.refresh()` after a mutating Server Action; `docs/adr/tech/0019`
  — which those same bullets cite — says the *Server Action* calls `refresh()` from `next/cache`
  and lists anything else as Anti-pattern 1. 02-10 followed the ADR. One of the two documents
  needs correcting; left alone deliberately rather than silently picking a winner in a plan that
  was not about documentation.

## 02-11

- **Board creation and sign-out are not optimistic — the user waits on a round trip before any UI
  feedback.** Raised during 02-11's Task 4 checkpoint review (2026-08-25). Creating a board keeps
  the modal in its pending state until `POST /boards` and every column POST have returned before
  the sidebar and the new board's route update; signing out shows nothing until the Server Action's
  redirect lands. In both cases the user sees a delay where an instant update followed by
  reconciliation would read as immediate.

  Both behaviours predate this plan: board creation is 02-10's `useCreateBoard`
  (`src/features/boards/hooks/use-create-board.ts`) driving
  `src/features/boards/actions/create-board.ts`; sign-out is 02-01/02-04's
  `src/features/auth/actions/sign-out.ts` behind `sign-out-button.tsx`'s `useActionState`. Plan
  02-11 adds only the read-only board-detail view and touches neither mutation path, so this is
  out of scope for it — user confirmed at the checkpoint, do not fix here.

  Worth noting the pattern already has a home in this phase: D-15 makes board *rename* optimistic
  via TanStack Query's `onMutate`/`onError` rollback, and 02-CONTEXT calls that "the general
  optimistic-update pattern board/column/task mutations follow project-wide". Creation and
  sign-out are the two mutations that pattern has not yet reached. Sign-out additionally has a
  constraint create does not: it must keep working pre-hydration, which is why it is a plain
  `useActionState` form today — any optimistic treatment has to preserve that.

## 02-15

- **MIGRATION OWED — ten pre-existing test suites are exempted from the story-only-render gate.**
  Turning `scripts/check-story-only-renders.mjs` on repository-wide reported **121 direct renders
  across 10 files (~116 test cases)**, not the single file with nine call sites plan 02-15 assumed —
  roughly 13x the scale it budgeted for. The gate is not over-firing: every one is a genuine
  violation of ADR tech/0025's Decision Outcome and of `CONVENTIONS.md`'s "Component tests from
  stories" second bullet. All ten are *mixed* suites — they compose stories for shallow cases and
  direct-render the raw component for deep-interaction ones, several under an explicit in-file
  comment reading "Deep: real pointer/keyboard interaction and computed style — stay direct
  renders."

  | Suite | Direct renders | Cases |
  |---|---:|---:|
  | `src/components/ui/dropdown/dropdown.test.tsx` | 34 | 14 |
  | `src/components/ui/modal/modal.test.tsx` | 17 | 10 |
  | `src/components/ui/text-field/text-field.test.tsx` | 15 | 16 |
  | `src/components/ui/button/button.test.tsx` | 15 | 14 |
  | `src/components/ui/checkbox/checkbox.test.tsx` | 12 | 15 |
  | `src/components/ui/menu/menu.test.tsx` | 11 | 9 |
  | `src/components/ui/icon-button/icon-button.test.tsx` | 8 | 10 |
  | `src/components/ui/switch/switch.test.tsx` | 6 | 8 |
  | `src/components/layout/error-fallback/error-fallback.test.tsx` | 2 | 7 |
  | `src/components/ui/toast/toast.test.tsx` | 1 | 13 |

  **User decision (2026-08-25, Option B):** do not rewrite them in plan 02-15; exempt them
  explicitly, publish the carve-out honestly, and track the migration here. What that migration
  costs, so a future planner does not under-scope it the way 02-15 did: a named exported story per
  prop combination in ten `.stories.tsx` files, `fn()` spies in ten `meta.args` blocks, and every
  new story additionally rendered by the `storybook` (a11y) and `visual` projects — nine of the ten
  are `components/ui/` primitives with visual-regression baselines. `add-board-modal.test.tsx` alone
  (21 cases, 9 call sites) consumed plan 02-15's entire Task 3 budget. Do this as its own phase or
  as one plan per suite, not as a task inside a feature plan.

  **Why this is logged rather than considered settled — threat T-02-54 of 02-15's own register**
  ("a false coverage claim is a real defect class here, not a documentation nicety"). This plan's
  whole thesis is that review-only enforcement fails, and it was confirmed at 13x the assumed scale.
  Publishing Enforcement lines that read as mechanical coverage while quietly carving out most of
  the primitives library would be the same defect one level up. Mitigations actually applied:
  ADR tech/0025's Enforcement section and `CONVENTIONS.md`'s bullet both state plainly that the gate
  is **not** repository-wide and name all ten suites; the checker prints the whole carve-out on every
  run, pass or fail; and each count is a ratchet ceiling in `MIGRATION_EXEMPTIONS` — an exempt suite
  that grows fails CI, and one that reaches zero also fails, so the ledger cannot rot into a claim
  nobody re-reads.

  The `.tsx`-declaration gate (`pnpm tsx:check`) is **not** affected: it is green repository-wide
  with no baseline and no carve-out beyond ADR tech/0027's two exemptions.
