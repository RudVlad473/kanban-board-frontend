---
phase: 04-task-subtask-workflow
plan: 22
subsystem: docs
tags: [conventions, validation, ci, mock-fidelity, phase-close]

requires:
    - phase: 04-task-subtask-workflow
      provides: "Plans 04-01 through 04-21, all summarized"
provides:
    - "Conventions matching the shipped code, audited against the tree rather than a predicted list"
    - "All eight phase success criteria proved by a gate or a live observation"
    - "A reconciled 04-VALIDATION.md with Wave 0 resolved and sign-off answered rather than ticked"
    - "Every rendered surface measured against the design source in both themes"
affects: []

actuals:
    tasks: 3
    commits: 2
completed: 2026-09-02
status: complete
---

# Phase 4 Plan 22: Phase Close-Out Summary

Executed as a **manual close-out recovery**, not a fresh dispatch. `c0ab07e` had already landed
Task 1 with no SUMMARY, which the `safe_resume_gate` correctly refused to re-dispatch; the user
selected manual recovery, so this run preserved `c0ab07e` and resumed at Task 2.

## Task 1 — CONVENTIONS.md audit (`c0ab07e`, preserved)

Committed in a previous session. Verified this session rather than taken on trust:

| Acceptance check | Result |
| ---------------- | ------ |
| `grep -c 'features/tasks' CONVENTIONS.md` ≥ 1 | **4** |
| `grep -c 'features/subtasks' CONVENTIONS.md` = 0 | **0** |
| `grep -rn 'storybook-stub' CONVENTIONS.md` empty | **empty** |
| Layout ring named as the two-feature composition point | **`CONVENTIONS.md:96-101`**, naming the board view and the boundaries policy as the reason |
| `pnpm comments:check`, `pnpm format:check` | **both exit 0** |

Divergences the commit corrected (net −27 lines: 8 insertions, 35 deletions): the
project-organization tree now describes `features/tasks/` with subtasks inside it rather than a
folder of their own; the layout ring is described as the composition point; the deleted
double seam is gone from the where-code-lives table; schema references name the core ring.

## Task 2 — Success criteria and the full gate

### The eight success criteria

No row cites a plan SUMMARY. Each names a gate or a live observation and the command that produced it.

| # | Criterion | Evidence | Command / spec |
| - | --------- | -------- | -------------- |
| 1 | Create a task with title + optional description inside a column | e2e, real backend, survives reload | `e2e/tasks-create.e2e.spec.ts` — "fills the create form, chooses a column, and the card survives a reload"; plus "a task created with no subtasks renders with no caption at all" |
| 2 | Open a task's detail view: title, description, checklist, current column | e2e + live observation | `e2e/tasks-detail.e2e.spec.ts` — "shows a seeded task's title, description, checklist and current column". Observed live this session: detail modal renders all four (`Subtasks (0 of 3)`, `Current Status: Doing`) |
| 3 | Edit title and description; the change persists | e2e across a reload | `e2e/tasks-edit.e2e.spec.ts` — "changes the title and description, and both persist across a reload" |
| 4 | Drag a task to a different column; applies instantly, confirmed by server | e2e, pointer **and** keyboard **and** cancel | `e2e/tasks-move.e2e.spec.ts` — 3 cases incl. "drags a task into another, empty column and keeps it there across a reload" and "writes nothing when a lifted task is moved and then cancelled" |
| 5 | Add, rename, toggle-complete, delete subtasks, independent of column | e2e | `e2e/subtasks.e2e.spec.ts` — "an add, a rename and a delete each persist across a reload with the edit modal's submit never pressed"; "flips a subtask's completion and it persists across a reload" |
| 6 | Delete a task; subtasks removed with it | e2e, read back from the backend | `e2e/tasks-delete.e2e.spec.ts` — "cascades to its subtasks, read back from the backend"; plus the declined-confirmation case |
| 7 | Stale-version rejection ⇒ error shown and change reverts | e2e against a real out-of-band update | `e2e/tasks-conflict.e2e.spec.ts` — "task edit conflict" and "task move conflict", each asserting revert + distinct toast + board re-read |
| 8 | No `*-action-storybook-stub.ts`, no `serverActionStubAlias`, `browser` project green without them | **static gate + suite** | `pnpm actions:check` exit 0 — `findStubSeamViolations` at `scripts/check-action-verbs.mjs:89` with the suffix and alias patterns at `:57`/`:78`. Confirmed absent on disk: no `src/test-utils/*action-storybook-stub*` match, no `serverActionStubAlias` in `vitest.config.ts`. `pnpm test` 1909/1909 |

### The full gate — every command run this session

| Command | Result |
| ------- | ------ |
| `pnpm lint` | **exit 0** |
| `pnpm exec tsc --noEmit` | **exit 0** |
| `pnpm format:check` | **exit 0** — "All matched files use Prettier code style!" |
| `pnpm routes:check` … `coverage:check` (all nine) | **all exit 0** |
| `pnpm test` (5 Vitest projects) | **1909 passed / 1909**, 125 files, 121.20s |
| `pnpm test:unit` (quick-run latency measurement) | 309/309, **11.39s wall** |
| `pnpm build` | **exit 0** |
| `pnpm build-storybook` | **exit 0** — rebuilt fresh before the visual run |
| `CI=1 pnpm test:visual` | **300 passed / 300**, 4.4m |
| `pnpm exec playwright test --project e2e` | **57 passed / 57**, 1.0m |
| `pnpm exec playwright test --project e2e --repeat-each=3 --workers=2` | **171 passed / 171**, 3.9m, **zero flaky** |

The visual run was prefixed with `CI=1` and preceded by `pnpm build-storybook`. Without the prefix
`playwright.config.ts`'s `ignoreSnapshots: !process.env.CI` makes every screenshot assertion a
silent no-op, and without the rebuild the run compares against a stale `storybook-static/`. Both
conditions were met, so the 300 assertions genuinely compared.

`next-env.d.ts` was rewritten by the dev server's typegen during Task 3 and restored with
`git checkout -- next-env.d.ts` before committing, per CLAUDE.md.

### `04-VALIDATION.md` reconciliation

- **Wave 0 checklist:** all seven items resolved individually against the tree. Every artefact
  exists. Both flake items are fixed — `toast.test.tsx:52` renders `<ToastProvider timeout={0}>`
  matching the `Default` story, and both todos sit in `.planning/todos/completed/`.
- **Requirement→test map:** all 20 rows updated; every `❌ W0` marker replaced with the file that
  now exists.
- **Per-task verification map:** filled at plan granularity, with the per-task property stated as a
  machine-checked count — **72 of 72 tasks** across all 22 plans carry a `<verify><automated>` block
  or are a `checkpoint:*` type. Zero prose-only verifications, so the "no 3 consecutive tasks
  without automated verify" rule holds trivially.
- **Sign-off:** five of six boxes ticked with the check that earned each. The sixth,
  `nyquist_compliant: true`, is **deliberately left unticked**: `/gsd-validate-phase` was never run
  for this phase, so there is no audit to justify the flag. `status` was raised to `validated`
  (this document's own contract is reconciled); `nyquist_compliant` stays `false`. Per #2117 the
  phase therefore reads **PARTIAL**, which is the honest state.

### Corrections to stale records found while verifying

- `.planning/STATE.md`'s Blockers section lists the `toast.test.tsx` auto-dismiss race as
  "Diagnosed but **not yet fixed**". It **is** fixed. The entry predates the fix.
- `.planning/STATE.md`'s Session Continuity ends with "**Next:** write `04-15-SUMMARY.md`". That
  summary exists; the line is stale by seven plans.

Both are corrected in the STATE.md update accompanying this plan.

## Task 3 — Mock comparison, every rendered surface, both themes

**MCP server:** this project's own, headless. Resolved tool names were `mcp__playwright__browser_*`
— confirmed before driving, not the globally-installed `mcp__plugin_playwright_playwright__*`
variant, which has no headless override. No visible window appeared.

**Method:** dev server at `localhost:3000`, viewport 1440×900, a real seeded account (board
"Platform Launch", Todo/Doing/Done, tasks with subtasks and a description). Mock pages rendered with
`pdftoppm -r 300` and measured with the **pt calibration** (÷4.16667 at 300 DPI), per `04-UI-SPEC.md`
C-01 — not the ÷6.25 divisor, which over-reads by 1.333×. Card edges and field borders were located
by scanning pixel rows, not eyeballed. The fixture account was deleted afterwards
(`seed.sh cleanup --users` → "deleted 1 user(s)").

| Surface | Mock page (light / dark) | Measurements | Verdict |
| ------- | ------------------------ | ------------ | ------- |
| Board with task cards | **p4 / p14** | Column width **280px** = spec. Inter-card gap **20px** shipped vs **20.16px** measured on the mock — S-07's `gap-4`→`gap-5` correction lands exactly. Card radius **8px**, `bg-bg-surface` `#fff` light / `#2b2c37` dark, shadow present | **Match** (one new finding below on card height) |
| Empty column | p4 / p14 (no mock counterpart) | Done column renders **no copy and no CTA**; the `(0)` caption is the only signal | **Match** — the mock has no empty column; `04-UI-SPEC.md:330` carries this forward verbatim from 03-UI-SPEC |
| Task detail view | **p5 / p15** | Modal **448px** wide, radius 8px. Checklist rows **40px** tall (mock 40.1px), **8px** between rows, radius 4px, `bg-bg-app`. Title/description/`Subtasks (0 of 3)`/`Current Status` all present, dropdown showing the task's own column | **Match**, with one recorded deviation |
| Add New Task modal | **p6 / p16** | Two blank subtask rows, remove ✕ **centred (offset 0)**, row pitch **56px** vs mock **52px**. Description textarea **112px** (mock 110.9px). Copy verbatim: "e.g. Take coffee break", "+ Add New Subtask", "Create Task" | **Match** |
| Edit Task modal | **p7 / p17** | Prefilled title/description, subtask rows, "Save Changes". **No Status control** | **Match** on structure; **one new finding** below |
| Delete confirmation | **p11 / p21** | 448px, title `#c93f3c`, "Delete this task?" + body verbatim with the title interpolated. Buttons 40px, pill radius, destructive fill + secondary outline | **Match**, with one recorded deviation |

### Already-recorded deviations — named as such, not reported as defects

| Deviation | Where recorded |
| --------- | -------------- |
| Modal **448px** where the mock is **480px** with 32px padding | `04-UI-SPEC.md:541-543` — reuses the shipped `Modal.Content` rather than re-deriving a Phase 1 primitive |
| Edit modal has **no Status/column control** | `04-UI-SPEC.md` S-02 |
| Subtask edits **save as you type**, the submit covers only title + description | `04-UI-SPEC.md` S-01, and the modal's own caption "Subtask changes save as you make them." |
| Delete actions read **"Delete Task" / "Keep Task"**, not the mock's `Delete` / `Cancel` | `04-UI-SPEC.md:327` — bare "Cancel" barred project-wide, bare "Delete" barred as generic |
| Secondary button fill (outline rather than the mock's lilac) | Carried Phase 1 primitive |
| Detail-view kebab items "Edit Task" / "Delete Task" | `04-UI-SPEC.md:321` — authored; the mock never renders this menu on any of its 73 pages |
| Empty column body has no copy and no CTA | `04-UI-SPEC.md:330` |

### NEW divergences — surfaced, not resolved

Per the standing rule, neither was fixed in this plan.

**N-1 — The Edit modal's subtask remove control sits 26px below its field's centre.**
`src/features/tasks/components/subtask-editor-row/subtask-editor-row.tsx:105` puts
`className="mt-6"` (24px) on the remove `IconButton` to clear a label — but the same component
passes `isLabelHidden={true}`, so no label occupies that space. Measured on all three rows, in both
themes: row 68px tall, input 40px centred at y=20, ✕ button 44px centred at y=46 → **offset 26px**
(24px `mt-6` + 2px height difference). Row pitch is **80px** against the mock's **52px** (mock p7:
field top borders at y=431 and y=648 at 300 DPI → 217px ÷ 4.16667). Mock p7 centres the ✕ on the
field. The `Add New Task` modal — a sibling implementation of the same mock row — measures **offset
0** and pitch 56px, so the two implementations of one design disagree with each other.
Not caught by any gate: the browser tests assert behaviour (busy state, required message, sibling
enablement), and `subtask-editor-row`'s visual baselines were recorded from this same markup, so
they lock the offset in rather than catching it.

**N-2 — Design line-heights reach no rendered element (project-wide, pre-dates this phase).**
`tokens/typography.tokens.json` is correct (`heading-m` 15px/**19px**, `body-m` 12px/**15px**) and
`src/styles/tokens.css` emits `--leading-heading-m: 19px` — but the `leading-*` utility appears in
**zero** `.tsx` files, and no `--text-*--line-height` pairing exists, so Tailwind never attaches the
token's line-height to `text-*`. Every one of the **59** `text-heading-*`/`text-body-*` usages
across **32** files therefore renders at the browser default 1.5. Measured live: card title
**22.5px** (= 15 × 1.5, spec 19px), card caption **18px** (= 12 × 1.5, spec 15px), detail title
**27px** (= 18 × 1.5, spec 23px). Consequence on the board: task cards measure **96.5px** tall
against the mock's **88.08px** (p4 at 300 DPI, cards 1 and 4, 367px ÷ 4.16667) — the 8.4px is
exactly the two inflated line-heights. The inter-card gap is unaffected and matches exactly, which
is why this reads as a typography wiring defect rather than a spacing one. Scope is Phase 1 token
wiring, not Phase 4; it is surfaced here because Phase 4's surfaces are where it was measured.

## Verification

| Evidence | Result |
| -------- | ------ |
| Task 1 acceptance checks re-run against the tree | all pass |
| Full local gate (11 commands above) | all exit 0 |
| e2e contention `--repeat-each=3 --workers=2` | 171/171, zero flaky |
| Every surface driven live through the project's own headless MCP | 6 surfaces × 2 themes |
| Mock pages measured at 300 DPI with the pt calibration | p4/p5/p6/p7/p11 + p14/p15/p16/p17/p21 |
| CI | recorded below |

## CI

Recorded in the phase-close commit; see the checkpoint hand-off for each job's conclusion.

## Deviations from the plan

- Task 1 was not executed — it was already committed as `c0ab07e` and was **verified** instead,
  per the `.continue-here.md` blocking constraint.
- The per-task verification map is recorded at plan granularity with the per-task property stated
  as a machine-checked count, rather than 72 enumerated rows. `/gsd-validate-phase`, which owns
  that table's format, was never run for this phase.
