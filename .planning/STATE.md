---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 4
current_phase_name: Task & Subtask Workflow
status: planning
stopped_at: Phase 03 complete, ready to plan Phase 4
last_updated: "2026-08-28T08:05:00.000Z"
last_activity: 2026-08-28
last_activity_desc: Post-phase-03 convention review; ready to plan Phase 4
state_head: 5ab43e702e8035c087f3f6acbfd3f4372beaaaf1
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 92
  completed_plans: 92
milestone_name: milestone
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-22)

**Core value:** A signed-in user can create boards, organize tasks across columns via
drag-and-drop, and trust that every change is reliably persisted and reconciled against the
real backend.
**Current focus:** Phase 03 — Column Management
cover board create + initial columns (BOARD-02), board detail view, rename, and delete.

## Current Position

Phase: 4 of 10 (Task & Subtask Workflow)
03-01/02/03 in wave 1, 03-04 in wave 2, 03-05 in wave 3, 03-06 in wave 4)
Phase 02 (Board Management): COMPLETE — 15/15 plans, verified (02-VERIFICATION.md status: passed).
Status: Ready to plan
Last activity: 2026-08-27 — Phase 03 complete, transitioned to Phase 4

Progress: Milestone v1.0 — Phase 1: 38/38 plans; Phase 02.1: 15/15 plans; Phase 02.2: 9/9 plans;
Phase 02: 15/15 plans (complete); Phase 03: 4/13 plans (in progress)

## Performance Metrics

**Velocity:**

- Total plans completed: 92
- Average duration: n/a
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 38 | - | - |
| 02.1 | 15 | - | - |
| 02.2 | 9 | - | - |
| 02 | 16 | - | - |
| 03 | 14 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: n/a

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02.1 P12 | 55min | 3 tasks | 13 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Auth mutations carved out to Server Actions (ADR tech/0017); boards/columns/tasks
  stay on TanStack Query per the original ADR tech/0002 — a deliberate split, not an oversight.

- Phase 1: No mock server anywhere — dev, every test layer, and CI all dial the real deployed
  nonprod backend (ADR tech/0018, supersedes tech/0004's MSW choice).

- Phase 1: `visual-baselines.yml` restricted to master-only dispatch and changed to open a PR
  (image-diff review) instead of committing screenshots directly, closing a previously-flagged
  unreviewed-overwrite risk.

- [Phase 02.1]: update-theme.ts's session-check-then-validate comment compressed to one sentence + docs/adr/tech/0019 pointer; every T-01-NN/T-02.1-NN threat identifier preserved verbatim through compression (plan 02.1-12)

- [Phase 02.1 close-out]: code review (02.1-REVIEW.md, 0 critical/2 warning/3 info) fixed rather
  than deferred — theme cookie name/max-age promoted to `cookie-registry.ts`'s single source of
  truth, `buildClientCookieString()` added as the `document.cookie` counterpart to
  `createCookieClient()`, both reusing `createBaseCookieOptions()`'s secure/sameSite/path policy.
  Generalized into a durable convention (CONVENTIONS.md): any structured delimiter-joined string
  built from named fields goes through one named builder once a second call site needs the same
  shape, never a repeated inline template literal.

### Pending Todos

Refreshed 2026-08-24 — the two Storybook-mock spikes were resolved this session and moved to
`.planning/todos/completed/`; this list now matches `.planning/todos/pending/` exactly (3 items).
**Not re-audited since** — `.planning/todos/pending/` now holds 7 items total (this prose lists a
subset); check the directory directly for the full, current list. Newest addition (2026-08-26):
`pnpm storybook`'s dev server crashes on any story reaching `session.ts` (pre-existing, found while
verifying phase 03 wave 4) —
`.planning/todos/pending/2026-08-26-storybook-dev-server-crashes-on-any-story-reaching-session-ts.md`.

- Trim `src/features/boards/schemas.unit.test.ts`'s rejection cases that just re-test zod's own
  primitives —
  `.planning/todos/pending/2026-08-21-trim-boards-schema-unit-tests-that-just-retest-zod.md`.

- Reopen the local pre-commit gitleaks investigation — CI-only secret scanning was a deliberate
  Phase 1 call (npm gitleaks wrappers rejected on supply-chain grounds); worth re-checking whether
  the tooling landscape has better options now —
  `.planning/todos/pending/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md`.

- Fold e2e seeding logic into a single service/module — `theme.e2e.spec.ts`'s
  `signUpDirectCapturingTheme()` duplicates `seed.ts`'s `seedAccount()` because the seed script
  doesn't return the `theme` field; also needs a design decision for seeding future entities
  (columns, tasks) as Phase 2+ lands —
  `.planning/todos/pending/2026-08-22-fold-e2e-seeding-logic-into-a-single-service-module.md`.

### Blockers/Concerns

- **RESOLVED 2026-08-24** — `pnpm comments:check` was red on `main` and CI *does* gate on it, so
  the `quality` job had been failing since 2026-08-22 (4+ consecutive runs), short-circuiting every
  step after it: API-types drift, Build, Test, and the whole `visual` and `e2e` jobs. Both comment
  violations compressed; confirmed green on CI in run 32740030630 (`quality` 2m8s, `secrets`,
  `visual` 2m54s, `e2e` 1m41s) — the first fully passing run since 2026-08-22, and the first time
  `visual`/`e2e` have executed at all in that window.

- **RESOLVED 2026-08-24** — the `text-field.test.tsx` flake was root-caused: it typed 200 chars at
  one driver round-trip each, overran the 15s `testTimeout` under contention, and Vitest could not
  cancel the in-flight keystrokes, which then typed into a *later* test (that test failed with
  `onValueChange` receiving `"x"` instead of `"a"`). Count cut to 60 against a measured 41-char
  overflow threshold; 0 failures in 8 full runs, from 2-in-6 before.

- `toast.test.tsx` races Base UI's 5s auto-dismiss — 1 failure in 8 `pnpm test` runs.
  `renderToastHarness` renders a bare `<ToastProvider>` while the `Default` story sets `timeout: 0`,
  so harness toasts vanish mid-test under load. Diagnosed but **not yet fixed** — one-line change
  plus a verification loop. See
  `.planning/todos/pending/2026-08-24-toast-harness-races-the-5s-auto-dismiss-under-load.md`.

- **01-33's no-JS submission must-have does not actually hold** — `sign-up-form.tsx`'s
  `formAction` wraps `useActionState`'s `dispatch` in a plain client closure, so React can't
  generate a real progressively-enhanceable POST target. Explicitly de-scoped by the user ("not
  sure that's needed in 2026") — see `01-33-SUMMARY.md` coverage D4 if ever revisited. Still
  live: not addressed by any later plan.

- Local `pnpm build` still fails without a real `SESSION_SECRET` in `.env.local` (pre-existing
  gap; CI and the deployed Vercel build are unaffected — CI generates its own secret, Vercel has
  per-environment secrets set). User was asked to run `vercel env pull --yes` to fix locally;
  unconfirmed whether that happened.

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Testing strategy overhaul and code-quality retrofit (no-mocking policy, curl-based e2e seeding, Storybook-driven component tests) plus deferred 02-08 code-review scope (URGENT) — **complete** 2026-08-22, 15/15 plans, verified 22/22 D-IDs
- Phase 02.2 inserted after Phase 2: Follow-up from 02.1's own retrospective: unify component tests fully onto Storybook stories (delete renderWithProviders, move all providers into Storybook decorators, render composed stories directly instead of .run(), no play functions) — closes a live QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx — **pulled forward 2026-08-22**: `depends_on` changed from "Phase 2" to "Phase 1, Phase 02.1" so it now runs before Phase 2's remaining plans (02-10..13) instead of after full Phase 2 completion; still not yet planned
- Wave 9/10 inserted into Phase 02 after Wave 8 (2026-08-25, user decision recorded in
  `.continue-here.md` and `02-CONTEXT.md` D-27..D-30): `02-14-PLAN.md` (shared `RESULT_STATUS`
  enum across 18 files, `usehooks-ts` for boolean toggle state) and `02-15-PLAN.md` (`.tsx`
  declaration hygiene + composed-story test enforcement) — inserted so board detail/rename/delete
  (02-11/12/13, shifted to waves 11/12/13) are written against the replacement patterns, not
  three more instances of the ones being replaced. Phase 02 total: 13 → 15 plans.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-26T11:35:43.230Z
Stopped at: Phase 03 complete, ready to plan Phase 4

**This session:** Resumed from a HANDOFF.json pause at the Wave 7 (02.1-15) Task 3 human
checkpoint — user replied "approved". Ran the phase's post-execution gate in full:

1. **Code review** (`gsd-code-reviewer`, standard depth, 141 files): 0 critical, 2 warning, 3
   info (02.1-REVIEW.md, commit `9679a83`).

2. **Phase-goal verification** (`gsd-verifier`): independently re-checked all 22 D-01..D-22
   truths against the live codebase (not SUMMARY claims) — all verified. Routed to
   `human_needed` only for two process items: confirm the approval (already given) and decide
   fix-vs-defer on the 4 review findings.

3. **User chose "fix now"** — fixed all 4: promoted `THEME_COOKIE_MAX_AGE_SECONDS` into
   `cookie-registry.ts` alongside `COOKIE.THEME`; added `buildClientCookieString()` as the
   `document.cookie` counterpart to the existing server-side `createCookieClient()`, both
   sharing `createBaseCookieOptions()`'s secure/sameSite/path policy (closes WR-01/WR-02);
   corrected two stale `CONVENTIONS.md` claims and moved their todos to `completed/`
   (IN-01/IN-02). User separately asked for the fix to generalize into a durable convention —
   added a CONVENTIONS.md rule: any structured delimiter-joined string built from named fields
   goes through one named builder once a 2nd call site needs the same shape (commits `5f3b62b`,
   `eca3b5d`).

4. **VERIFICATION.md** updated to `status: passed` with a resolution note, then
   `phase.complete` run — ROADMAP.md/STATE.md advanced, PROJECT.md's Key Decisions table gained
   the 6 ADRs this phase produced (tech/0019-0024).

All commits pushed as fast-forwards (`c701467..19ee0ca`). Phase 02.1 is fully closed: 15/15
plans, 22/22 D-IDs verified, code review clean.

**Next:** Phase 2 (Board Management) has 8/13 plans done. Waves 7-11 (02-09..13) were flagged
stale (predated 02.1's RSC rebuild) and have now been fully replanned against the current
codebase — `gsd-planner` regenerated all 5, `gsd-plan-checker` verified them clean (BOARD-01..06
covered, dependency chain intact, all 02-REVIEWS.md findings incorporated). Two
documentation-hygiene items (stale `02-VALIDATION.md`, `02-RESEARCH.md`'s unmarked open
questions) filed as a pending todo, non-blocking. Phase 02.2 (Storybook test unification) is
inserted after Phase 2 but not yet planned (no CONTEXT.md).

**This session (WSL, resumed via `/gsd-resume-work`):** Reconstructed a stale `HANDOFF.json`
against actual git state — a fresh worktree-isolated `gsd-executor` had already applied plan
02-09's BUG A fix and 8b spec amendment in a *different* live worktree
(`agent-a738a127deda3ab5a`) than the handoff pointed at. Dispatched a new `gsd-executor` into
that worktree to finish Task 4 (re-verify all 8 checkpoint observations headlessly via Chrome
DevTools MCP, run full acceptance criteria, write `02-09-SUMMARY.md`); a sandbox guard forced it
into its own fresh worktree instead, so it fast-forward-merged the prior commits in rather than
editing the other worktree's git state directly. User approved the Task 4 checkpoint; the branch
was rebased onto current `main` (which had advanced with unrelated commits in the meantime) and
fast-forward merged — plan 02-09 is complete, 9/13 plans of Phase 02 done. Both worktrees and
their branches cleaned up after merging.

Also this session: added a `CLAUDE.md` rule requiring Playwright/Chrome DevTools MCP (headless)
for UI debugging instead of scratch scripts, after finding two leftover `*.tmp.mjs` debug
scripts in a worktree. Fixed two small duplications surfaced during a testing-architecture
discussion — `formDataToObject` (deduped into `src/test-utils/`) and `SkeletonRow` (extracted
into `src/components/ui/skeleton/`) — and captured three deeper open questions from that
discussion as todos feeding Phase 02.2's eventual planning (action-stub aliasing vs. the
no-mock policy, e2e-vs-mocked cookie coverage, centralizing `vi.mock` declarations). Added
`docs/kanban-task-management-web-app.pdf` (115MB Figma export) as a gitignored, local-only
reference file — over GitHub's 100MB limit, so never committed.

`HANDOFF.json` and both phase `.continue-here.md` checkpoint files removed as resolved/stale.

**This session:** Began dispatching Phase 02 Wave 8 (plan 02-10) — ISOLATION resolved to
`harness-worktree`, no worktree/agent actually spawned yet. User interrupted to ask about
alternatives to the action-stub and `renderWithProviders` test patterns; investigating surfaced
that this exact ground was already captured in the prior session as 4 dated pending todos plus
the Phase 02.2 ROADMAP insertion — nothing new needed researching from scratch. User then decided
(offered 3 scopes: resolve stub-aliasing only / resolve all 4 testing todos / pull full Phase
02.2 forward) to pull Phase 02.2 forward in full, ahead of Phase 02's remaining plans, rather
than let 02-10/02-12/02-13 add three more instances of the stub pattern under review.

Edited `.planning/ROADMAP.md`'s Phase 02.2 section: `depends_on` "Phase 2" → "Phase 1, Phase
02.1"; title marked "(INSERTED, PULLED FORWARD)"; Goal/Requirements rewritten to name the driving
todos; added a sequencing note. Verified via `roadmap milestone-scope` that the phase set is
unchanged (no accidental milestone-scope break). Wrote `.planning/HANDOFF.json` and
`.planning/phases/02-board-management/.continue-here.md` to record the pause.

**This session (resumed via `/gsd-resume-work`):** Discovered `HANDOFF.json` and
`.planning/phases/02-board-management/.continue-here.md` were stale — both timestamped
`2026-08-22T15:14:17Z`, predating Phase 02.2's actual planning/execution/verification, and their
`uncommitted_files` list no longer matched a clean `git status`. Phase 02.2 had since shipped in
full (9/9 plans, `02.2-VERIFICATION.md` 15/15 truths verified, commit `df10cb1`), including
formally documenting the `*-action-storybook-stub.ts` pattern as a sanctioned ADR tech/0020
carve-out rather than replacing it. Deleted both stale artifacts rather than following their
outdated "run `/gsd-discuss-phase 02.2`" instruction.

**This session (2026-08-24, resumed via `/gsd-resume-work`):** Clean resume — no HANDOFF.json, no
`.continue-here` checkpoint, no interrupted agent, no async jobs; working tree clean and `main`
in sync with `origin/main` at `87c9994`. Confirmed the 4 PLAN-without-SUMMARY files
(02-10..02-13) are simply unexecuted plans (Waves 8-11), not partial executions. Corrected the
stale frontmatter `status`/`stopped_at`, which still read "ready to plan Phase 2" from the 02.2
close-out.

**This session (spikes):** Resolved both Storybook-mock todos. `@storybook/nextjs-vite/navigation.mock`
**rejected** — its subpath carries ADR tech/0021's `process is not defined` pitfall, and past that it
only spies (`useRouter` delegates to real Next.js, needing an `AppRouterContext.Provider` the "browser"
project never loads); hand-providing it fails on Vite dep-optimizer context duplication, and
`optimizeDeps.exclude` cascades into unrelated `aria-query` CJS breakage. Recorded as an
"Evaluated and rejected" section in `docs/adr/tech/0020`; the six-line hand-written shim stays.

That killed the second todo's premise, so **ADR tech/0025's D-25 play-function ban was left
untouched** — no exception needed. Closed the coverage gap the cheap way instead: `board-list.test.tsx`
now asserts the D-19 shim's `refresh` spy after a real click. Also corrected CONVENTIONS.md, which
misattributed the call to `refresh()` from `next/cache` (it is `router.refresh()` from
`next/navigation`) in both places the rule appears, and upgraded its Enforcement line.

Open scope note for 02-10: the convention's real subject — a *mutating Server Action's* refresh —
still has zero call sites. `board-list.tsx:38`'s retry button is the repo's only `router.refresh()`
and is not a mutation; 02-10 (create board) introduces the first real one.

**This session (pipeline fix):** CI's `quality` job had been red since 2026-08-22 on the "Comment
length check" step, which sits before API-types drift, Build and Test — so those three, plus the
dependent `visual` and `e2e` jobs, had not run at all for four consecutive pushes. Compressed both
over-long comment blocks (`force-sign-out/route.ts` 10 prose lines → split into a 3-line ADR
pointer above the handler and a 3-line guard note at the check itself, since ADR tech/0026 step 1
already carried the full rationale verbatim; `session-bridge.e2e.spec.ts` 4 → 3).

Verified everything the gate had been hiding: lint, all four check scripts, format, API-types
drift, `pnpm build` (with a generated `SESSION_SECRET`, matching CI's own step) and `pnpm test` —
566/566 across all five Vitest projects.

Two further finds along the way. `pnpm routes:check` crashed locally (`EISDIR`) on a gitignored
Vitest failure-screenshot *directory* named like a `.tsx` file; `check-comment-length.mjs` already
guarded against exactly this but the other three checkers did not, so the guard was extracted to
`scripts/glob-real-files.mjs` (with unit tests) and all four now glob through it. CI never hit this
— it has no such directory — but it blocked running the gate locally. And `text-field.test.tsx`
flakes once in ~3 full-suite runs; captured as a todo, not fixed.

**This session (flake fix):** Root-caused the `text-field.test.tsx` flake via `/gsd-resume-work` →
systematic debugging. It was never a timeout margin or a cleanup race: the MOBILE truncation case
types 200 characters, each its own driver round-trip (~731ms unloaded, ~20x under full-suite
contention), which overran the 15s `testTimeout`; Vitest aborts the test but cannot cancel the
in-flight keystroke stream, so the remaining presses drained into whichever input a later test had
focused. The DESKTOP typing case was the victim — its `onValueChange` received `"x"`, not `"a"`.
Measured the box's real overflow threshold (41 chars at both viewports) and cut 200 → 60, keeping a
46% margin at 3x fewer round-trips. Verified 0 failures in 8 full `pnpm test` runs (2-in-6 before).

Added `.planning/LEARNINGS.md` — a project-level, cross-phase learnings file that did not exist
(GSD's own `{NN}-LEARNINGS.md` files are per-phase and are overwritten wholesale by
`/gsd-extract-learnings`, so hand-written knowledge cannot live there). Seeded with the two CI
lessons and this flake's surprise. Also added a `userEvent.type()` sizing rule to CONVENTIONS.md.

One unrelated flake surfaced during verification and is diagnosed but unfixed: `toast.test.tsx`
races Base UI's 5s auto-dismiss (see Blockers).

Resume file: .planning/phases/03-column-management/03-CONTEXT.md

**This session (02-10 checkpoint close-out + Wave 9 planning):** Resumed `/gsd-execute-phase 2`
with 02-10 halted on its unapproved Task 4 checkpoint (`02-10-UAT.md`, 4 UI findings). Per user
decision: fixed the findings as commits on 02-10 (not a separate plan), and planned the Wave 9
refactor insertion now (not deferred).

Dispatched a worktree executor to fix all 4 findings — read the canonical design source
(`docs/kanban-task-management-web-app.pdf`, extracted via `pdftoppm`/poppler-utils since the file
exceeds the Read tool's 100MB PDF limit) for exact reference: full-bleed selected sidebar row
(`rounded-r-full`, padding moved from `<ul>` onto the row), `lucide-react`'s `PanelLeft` icon on
every board row and "+ Create New Board", and a rebuilt theme toggle (static Sun/Moon icons
flanking a plain `Switch`, inside a `bg-bg-app` container) — commits `69f642a`, `a1a9ccb`,
`b703923`, `e5d85ae`, merged clean (`--ff-only`) and pushed. In parallel, dispatched `gsd-planner`
to create `02-14`/`02-15` (Wave 9/10) and renumber `02-11/12/13` to waves 11/12/13 — committed as
`203b0c2`, pushed.

Live-re-verified the fix in a real browser (Playwright, signed-in session, 3 boards, both themes)
against the same PDF reference — all 4 findings confirmed fixed. **Task 4 checkpoint: APPROVED.**
Fixed a Chrome-binary gap for Playwright/chrome-devtools-mcp along the way (`@playwright/mcp` and
chrome-devtools-mcp both expect `/opt/google/chrome/chrome`; symlinked to the already-installed
Chrome-for-Testing binary at `~/.cache/puppeteer/chrome/...` rather than adding a new apt repo).
Added `.mcp.json` (`--headless` on the Playwright server — it is headed by default) and a
CLAUDE.md note explaining the enforcement mechanism, since the prose-only instruction wasn't
sufficient on its own.

Next: Resume Phase 02 at Wave 9 — plan `02-14-PLAN.md` (shared `RESULT_STATUS` enum, `usehooks-ts`
boolean state) via `/gsd-execute-phase 2`.

**This session (2026-08-26, "nonprod is alive now" resume):** Re-ran `scripts/probe-column-backend.mjs`
now that nonprod recovered from the outage recorded in the prior session — got real R1-R7 answers,
recorded in `03-BACKEND-FACTS.md` (commit `28b748f`). Two of the five original assumptions were
**refuted**, not confirmed: A3 (duplicate column names are accepted, not rejected — no server-side
uniqueness enforcement) and A5 (an out-of-range `targetPosition` is clamped, not refused). Flags
plan 03-07 (duplicate-name branch is client-only UX with no backend backstop) and 03-10 (no
client-side clamping needed). Cleaned up two stale phase-02 handoff artifacts (`HANDOFF.json`,
`.continue-here.md`) predating phase 02's actual completion.

Discovered wave 1 (03-01/02/03) was not actually fully done: plan 03-03's Task 2 (React 19 dnd-kit
runtime spike) had halted in a prior session because Playwright MCP tools were unreachable from a
worktree-isolated executor — exactly the `.mcp.json` wrapper-key bug fixed in commit `f7ae5f3`.
Resumed and completed Task 2 directly in the main session: drove a scratch Storybook story headless
via `mcp__playwright__*`, confirmed dnd-kit's full keyboard contract (lift via Space/Enter, arrow-move,
escape-cancel, sibling-control safety, nested-container auto-scroll) with no runtime error. Wrote
`03-SPIKE-DNDKIT.md` (commit `27e4421`) — A6 CONFIRMED, Open Question 4 resolved (`@dnd-kit/modifiers`
not needed). This unblocked every remaining plan in the phase (03-04 through 03-13 had all shown
`blocked_by: ["03-03"]`).

Then ran `/gsd-execute-phase 3` and completed waves 2-4 via the normal executor→merge→verify loop,
each isolated in its own worktree, fast-forward merged, then re-verified on the main checkout
(`tsc`, `lint`, full `pnpm test`, and a `pnpm build` after wave 3):

- **Wave 2 — 03-04** (`f833c17`): column path templates, the four action input schemas, response
  schema, and every pure model function (dot-colour mapping, order-preserving reorder/remove, the
  9-column nudge predicate), all unit-tested. Surfaced a repo-structural finding, now in project
  memory (`tdd-red-commit-blocked-by-precommit-hook.md`): the pre-commit hook's type-aware ESLint
  refuses a RED-only TDD commit when the new test imports a not-yet-existing export, so `tdd: true`
  tasks land as one combined commit here, not two — expected, not a compliance gap.

- **Wave 3 — 03-05** (`8f43606`): the create-column tracer — COLUMN-01 wired end to end (ghost
  column → modal → hook → Server Action → upstream call → `refresh()`). `pnpm build` confirmed all
  8 routes still prerender.

- **Wave 4 — 03-06** (`5ccbb04`): extracted presentational `ColumnHeader` (decorative
  position-cycled dot + name + count) out of `board-view.tsx`. Live-verified visually via
  `column-header.stories.tsx` in both themes (Playwright MCP, headless) since the executor's own
  environment had no Playwright MCP tools — confirmed all three dot hues render distinctly and
  long-name truncation keeps the count non-shrinking, in both light and dark.

**Found and filed as a todo, not fixed:** `pnpm storybook`'s manual dev server crashes any story
whose import chain reaches `src/lib/server/session.ts` (`node:crypto` externalization error) —
reproduces on the pre-existing `board-view.stories.tsx > Populated` story too, so it predates this
phase. `vitest.config.ts`'s `serverActionStubAlias` isn't applied by `.storybook/main.ts`'s own Vite
config. Worked around by verifying `column-header.stories.tsx` directly instead (see
`.planning/todos/pending/2026-08-26-storybook-dev-server-crashes-on-any-story-reaching-session-ts.md`).

Every wave's worktree was merged `--ff-only` and removed immediately after — no worktrees or
branches left open. All state pushed to `origin/gsd/phase-03-column-management` through commit
`b74d7f8`.

User then invoked `/gsd-pause-work` while wave 5's dispatch had not yet started (a prior wave-4
executor was still finishing at that moment; waited for it to complete, merged, and verified before
writing this pause rather than leaving an orphaned background agent/worktree).

Next: resume Phase 3 at Wave 5 — plan `03-07-PLAN.md` (COLUMN-01 completed: empty-state CTA,
post-create auto-scroll, the 9-column nudge, and the duplicate-name inline branch — now known to be
client-only UX per the R5 refutation above) via `/gsd-execute-phase 3`.

**This session (2026-08-28, post-phase-03 convention review):** Resumed via `/gsd-resume-work`.
Removed two stale phase-03 handoff artifacts (`HANDOFF.json`, the phase `.continue-here.md`) that
still pointed resume at Wave 5, long since shipped. The user then raised four review points about
the phase-03 implementation; two premises turned out to be wrong, and checking them surfaced two
real defects nobody had flagged.

1. **Force sign-out is not a rule violation and is not from phase 03.** ADR tech/0019 bans Route
   Handlers; ADR tech/0026 carves out exactly one file, because a Suspense-streamed Server
   Component cannot legally mutate cookies. `scripts/check-no-route-handlers.mjs` hard-codes a
   one-entry allowlist, so a second handler still fails the build. Landed in Phase 02.2, amended in
   plan 02-11. Incidentally re-verified live this session: the dev log shows the real
   `GET /api/session/force-sign-out 307` hop, and e2e SESSION-01/03 cover both directions.

2. **`renderSignInForm` never violated the rule** — it is a zero-argument alias for
   `render(<Empty />)` and configures nothing; the rule bans *re-configuring* a story. But the audit
   the question prompted found `sidebar.test.tsx` spreading `defaultIsExpanded` and `children` onto
   a composed story reached through a helper parameter. That file is not exempt and `renders:check`
   passed anyway, because the checker only ever saw JSX tags bound by a sibling import.
   `findStoryPropOverrideViolations` now resolves story bindings through aliases, destructured
   defaults and typed parameters, and treats JSX children as a prop. Reports outside
   `MIGRATION_EXEMPTIONS` so the ten tracked ratchets do not shift. Repository-wide result after
   replacing the helper with three named stories: zero. The checker's own guidance text, which
   claimed all same-file render helpers were banned, was corrected — it never was the rule
   (commit `e8e8601`, ADR tech/0025 amended).

3. **Action-stub spike run** (`.planning/spikes/action-stub-automation/FINDINGS.md`, commit
   `014fc46`). Eliminating the doubling is impossible: the real action module cannot even be
   *imported* in the browser project — `next/cache` throws `process is not defined` before
   `node:crypto` is reached. ADR tech/0020's unwind trigger has not fired
   (`@storybook/nextjs-vite@10.5.7` ships no `"use server"` transform). Generating them *works*: a
   prototype Vite plugin plus one generic recorder replaces all twelve stub modules and the
   twelve-entry alias register, demonstrated against the real create-column action. Full browser run
   left 104 tests in 4 files failing, all on one gap — a generic recorder cannot invent a
   domain-shaped default success payload. **Not adopted; awaiting a decision.** Also found: ADR
   tech/0020's register documents 4 stubs where 12 exist.

4. **JSX return style decided** (ADR tech/0028, commit `7d5dd21`). Measured 76/8 block-vs-concise
   for named components against 7/58 the other way for inline callbacks — two opposite de-facto
   conventions, both inside single files. User chose "always explicit return"; all 66 concise JSX
   bodies converted, enforced by two `no-restricted-syntax` selectors rather than
   `arrow-body-style: always`, which cannot be scoped to a JSX body.

Verified end to end, not just claimed: `pnpm test` 1304/1304, `pnpm test:e2e` 43/43 against the real
backend and browser, `CI=1 pnpm test:visual` 260/260 compared against baselines, `pnpm build`,
`tsc`, `lint`, `format` and all seven check scripts. **CI run 33152938843 green on all four jobs**
(`secrets`, `quality`, `e2e`, `visual`). Everything pushed; tree clean.

**Decided after the review:** the stub-generation plugin is folded into Phase 4 and sequenced to run
*first* in the phase, before any task or subtask action lands. The contract exposes seven mutating
task/subtask operations, so building them on today's pattern would hand-write roughly 600 more lines
of the same skeleton and grow the register from twelve entries to nineteen — the same
write-it-then-delete-it argument that pulled Phase 02.2 forward ahead of plans 02-10/12/13.
`ROADMAP.md`'s Phase 4 section carries the scope, the sequencing note, the design gap planning must
close (the default success payload a generic recorder cannot invent), and the note that Phase 02.2
only ever answered the import-ergonomics half of this. Success criterion 8 was added so the phase is
verified against it.

**Next:** plan Phase 4 (Task & Subtask Workflow) via `/gsd-plan-phase 4`.
