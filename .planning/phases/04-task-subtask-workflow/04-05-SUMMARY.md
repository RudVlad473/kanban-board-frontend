---
phase: 04-task-subtask-workflow
plan: 05
subsystem: ui
tags: [design-tokens, style-dictionary, base-ui, tailwind-v4, storybook, playwright, axe, wcag]

requires:
  - phase: 01-foundation
    provides: DTCG → Style Dictionary → Tailwind v4 token pipeline, TextField/Checkbox primitives, visual-regression harness
provides:
  - "`heading-m` (15px / 700 / 19px) — the mock's sixth type role, the task card title's token"
  - "`Textarea` primitive at `src/components/ui/textarea/` with stories, browser tests, axe pass and 36 visual baselines"
  - "`Checkbox`'s `hasStrikethroughWhenChecked` opt-in now carries the completed-subtask label colour (55% of primary) as well as the strikethrough"
affects: [task-card, add-task-modal, edit-task-modal, subtask-checklist-row, task-detail-modal]

actuals:
  tokens: 6987
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Base UI `Field.Control render={<textarea />}` to swap the mounted element rather than forking the Field anatomy"
    - "A composed-story-only test file (ADR tech/0025) reads its own render's container when two stories share a label, instead of a page-wide strict-mode role query"

key-files:
  created:
    - src/components/ui/textarea/textarea.tsx
    - src/components/ui/textarea/textarea-variants.ts
    - src/components/ui/textarea/textarea.stories.tsx
    - src/components/ui/textarea/textarea.test.tsx
  modified:
    - tokens/typography.tokens.json
    - tokens/style-dictionary.build.test.ts
    - src/components/ui/checkbox/checkbox.tsx
    - src/components/ui/checkbox/checkbox.stories.tsx
    - src/components/ui/checkbox/checkbox.test.tsx
    - visual/primitives.visual.spec.ts

key-decisions:
  - "`heading-m` is asserted as declared-once-in-@theme-and-never-overridden-in-.dark, because the dark build source carries only colour tokens — the plan's literal 'present in both blocks' assertion is unsatisfiable without changing Phase 1's pipeline"
  - "`Textarea` ships no `size` variant: TextField's size axis maps to fixed heights, which contradicts the min-h-28 floor this box grows from"
  - "The completed-subtask colour is 55% of `--color-text-primary`, not the mock's 50%: 50% fails WCAG AA at 3.87:1, and 55% is the lowest whole percent clearing 4.5:1. Kept as a derived opacity rule rather than a hex literal, and `04-UI-SPEC.md` was amended to match"

patterns-established:
  - "Tier-2 off-scale `min-h-28` (112px) joins the shared precedent set, sourced from Tailwind v4's dynamic scale on the same 4px base"
  - "A CSF `Error` story is destructured as `Error: ErrorStory` — the bare name shadows the global constructor and breaks any `new Error()` in the same file"

requirements-completed: []

coverage:
  - id: D1
    description: "`heading-m` (15px / 700 / 19px) exists in the token pipeline and resolves identically in both themes"
    requirement: TASK-01
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#declares font-heading-m's four custom properties in the @theme block and overrides none of them in .dark"
        status: pass
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#gives font-heading-m no --tracking-* property, unlike font-heading-s"
        status: pass
    human_judgment: false
  - id: D2
    description: "`Textarea` primitive: labelled multi-line control with error/disabled/loading axes and a 112px minimum box that scrolls rather than grows"
    requirement: TASK-02
    verification:
      - kind: unit
        ref: "src/components/ui/textarea/textarea.test.tsx (24 assertions across both viewports)"
        status: pass
      - kind: automated_ui
        ref: "playwright:components-ui-textarea--*-{desktop,mobile}-{light,dark}.png (36 baselines)"
        status: pass
      - kind: integration
        ref: "pnpm test:a11y — textarea stories axe-clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "`Checkbox`'s completed-label treatment reaches the specified colour, opt-in only, with every existing consumer unchanged"
    requirement: SUBTASK-02
    verification:
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#strikes a checked label through and drops it to 50% of the primary text colour when hasStrikethroughWhenChecked"
        status: pass
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#leaves a checked label's colour and decoration untouched when hasStrikethroughWhenChecked is absent"
        status: pass
      - kind: integration
        ref: "pnpm test:a11y — checkbox.stories.tsx > Checked With Strikethrough (color-contrast clean at 55%)"
        status: pass
      - kind: automated_ui
        ref: "playwright:components-ui-checkbox--checked-with-strikethrough-{desktop,mobile}-{light,dark}.png (re-recorded at 55%)"
        status: pass
    human_judgment: false

duration: 105 min
completed: 2026-08-28
status: complete
---

# Phase 4 Plan 05: Design-System Prerequisites Summary

**Added the mock's sixth type role (`heading-m`), a `Textarea` primitive mirroring `TextField`'s Field anatomy through Base UI's `render` prop, and the colour half of `Checkbox`'s completed-label opt-in — raised from the mock's 50% to 55% because 50% fails WCAG AA.**

## Performance

- **Duration:** 105 min (76 min to implementation, then a decision round-trip and re-verification)
- **Started:** 2026-08-28T13:05Z
- **Completed:** 2026-08-28T13:55Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 12 source files + 40 visual baselines

## Accomplishments

- `heading-m` (Plus Jakarta Sans / 700 / 15px / 19px) is in the token pipeline, asserted in both themes, with the existing five roles byte-identical.
- `Textarea` ships at `src/components/ui/textarea/` — nine stories, 24 browser assertions across both viewports, an axe pass, and 36 Playwright baselines in light and dark.
- `Checkbox`'s `hasStrikethroughWhenChecked` now applies `text-text-primary/55` alongside the strikethrough, closing RESEARCH Pitfall 16 at the primitive.
- Surfaced a conflict the plan did not anticipate — the mock's own completed-label colour fails WCAG AA — and resolved it by raising the opacity rather than by suppressing the gate or hardcoding a hex.

## Task Commits

1. **Task 1: heading-m type token** — `ccee574` (test, RED) → `8a085f2` (feat, GREEN)
2. **Task 2: Textarea primitive** — `0f6a3ef` (feat)
3. **Task 3: Checkbox completed-label colour** — `5978b0e` (test, RED) → `0bdf64b` (feat, GREEN at the mock's 50%) → `4f3ca32` (fix, raised to 55% for WCAG AA)

## Files Created/Modified

- `tokens/typography.tokens.json` — adds `font.heading-m`; the other five roles untouched.
- `tokens/style-dictionary.build.test.ts` — two `heading-m` assertions (both-theme resolution, and no `--tracking-*`).
- `src/components/ui/textarea/textarea.tsx` — exports `Textarea`; `Field.Control render={<textarea />}` with `aria-busy` and `disabled={isDisabled || isLoading}`.
- `src/components/ui/textarea/textarea-variants.ts` — exports `textareaVariants`; `min-h-28` floor, `state` and `isBusy` axes.
- `src/components/ui/textarea/textarea.stories.tsx`, `textarea.test.tsx` — nine stories, 12 assertions × 2 viewports.
- `src/components/ui/checkbox/checkbox.tsx` — the opt-in gains `peer-data-[checked]:text-text-primary/55`.
- `.planning/phases/04-task-subtask-workflow/04-UI-SPEC.md` — § "Completed-subtask treatment" amended from 50% to 55% in both themes, with the rejected 50% recorded so it is not "restored" to match the mock.
- `src/components/ui/checkbox/checkbox.stories.tsx` — adds `UncheckedWithStrikethroughOptIn`.
- `src/components/ui/checkbox/checkbox.test.tsx` — three completed-label assertions; `Error` aliased to `ErrorStory`.
- `visual/primitives.visual.spec.ts` — nine `components-ui-textarea--*` ids and one new checkbox id.

## Decisions Made

1. **`Textarea` has no `size` variant.** `TextField`'s `size` maps to `h-8`/`h-10`/`h-12`. A fixed height directly contradicts "`min-h-28` and let it grow, never a fixed height", so the axis was dropped. The `Omit<…, "size">` base is kept, so a raw HTML `size` attribute still cannot leak in.
2. **`Textarea` has no `trailing` slot.** An absolutely-positioned trailing node inside a growing, scrolling box has no sensible anchor, and the plan's props list omits it.
3. **The completed-subtask label is 55% of `--color-text-primary`, not the mock's 50%.** 50% fails
   WCAG AA at 3.87:1; 55% is the lowest whole percent clearing 4.5:1 (`#6e707c`, 4.58:1). Kept as a
   derived opacity rule rather than a hex literal, applied in both themes, and `04-UI-SPEC.md` was
   amended so the code and the spec agree. No axe rule was suppressed. See "Issues Encountered".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's both-theme token assertion was unsatisfiable as written**

- **Found during:** Task 1
- **Issue:** The plan required asserting `heading-m` "resolves in BOTH themes" in the shape of the existing five. `style-dictionary.config.mjs`'s dark config sources only `color.tokens.json` and `color.dark.tokens.json` — `modeInvariantSources` (typography included) is light-only, so the `.dark` block contains no typography at all. The literal assertion failed even after the token landed.
- **Fix:** Asserted the pipeline's real invariant instead — the four properties are declared in `@theme` and the `.dark` block overrides none of them, which is precisely *why* the token resolves identically in both themes. Falsifiable in both directions.
- **Files modified:** `tokens/style-dictionary.build.test.ts`
- **Verification:** `pnpm exec vitest run --project tokens` → 10 passed.
- **Committed in:** `8a085f2`

**2. [Rule 1 - Bug] A composed story may not be re-configured, but two stories share a label**

- **Found during:** Tasks 2 and 3
- **Issue:** ADR tech/0025 bans passing props to a composed story, and `renders:check` enforces it with no exemption for new files. The busy-vs-disabled and completed-vs-default comparisons each render two stories that carry the same label, which Playwright's strict mode rejects as an ambiguous role query.
- **Fix:** A `readTextarea` / `readLabel` helper reads each control out of its own render's `container`. This is a DOM query, not a story re-configuration, so it satisfies both rules.
- **Files modified:** `src/components/ui/textarea/textarea.test.tsx`, `src/components/ui/checkbox/checkbox.test.tsx`
- **Verification:** `renders:check passed`; both suites green.
- **Committed in:** `0f6a3ef`, `0bdf64b`

**3. [Rule 3 - Blocker] The CSF `Error` story shadows the global `Error` constructor**

- **Found during:** Tasks 2 and 3
- **Issue:** `const { Error } = composeStories(stories)` makes `new Error(...)` in the same module a type error (`'new' expression … lacks a construct signature`). `pnpm lint` did not catch it; only `tsc --noEmit` did.
- **Fix:** Destructured as `Error: ErrorStory` in both files and updated the single usage in `checkbox.test.tsx`.
- **Files modified:** `src/components/ui/textarea/textarea.test.tsx`, `src/components/ui/checkbox/checkbox.test.tsx`
- **Verification:** `pnpm exec tsc --noEmit` clean.
- **Committed in:** `0f6a3ef`, `0bdf64b`

**4. [Rule 3 - Blocker] `PageProps`/`LayoutProps` were unresolved in a fresh worktree**

- **Found during:** Task 2
- **Issue:** `tsc --noEmit` and `pnpm lint` reported five pre-existing errors in `app/` files, because Next.js's generated `.next/types` globals do not exist in a freshly created worktree.
- **Fix:** Ran `pnpm exec next typegen`. No source change.
- **Files modified:** none (generated, gitignored)
- **Verification:** `tsc --noEmit` and `pnpm lint` both clean afterwards.

---

**Total deviations:** 4 auto-fixed (2 × Rule 1, 2 × Rule 3). No scope creep — each unblocked a stated plan requirement.

## Issues Encountered

**RESOLVED — the mock's completed-subtask colour fails WCAG AA; the opacity was raised to 55%.**

Task 3 initially shipped `text-text-primary/50` exactly as `04-UI-SPEC.md` specified, and
`pnpm test:a11y` went red on `checkbox.stories.tsx > Checked With Strikethrough`:

```
Elements must meet minimum color contrast ratio thresholds (color-contrast)
insufficient color contrast of 3.86 (foreground #7a7c87, background #f4f7fd,
font size: 13px, weight: normal). Expected contrast ratio of 4.5:1
```

The implementation was not at fault: `04-UI-SPEC.md` predicted exactly `#7A7C87` for that
composite and recorded `#797B87` sampled from mock p5, and rendering p5 at 300 DPI confirmed the
mock does draw completed rows in a light grey struck-through label. **The mock's own design fails
AA.** So the conflict was surfaced rather than resolved unilaterally (`CLAUDE.md`: "When the mock
and a UI-SPEC disagree, surface the conflict instead of following either silently"), with the axe
rule left unsuppressed so the failure stayed visible.

**Decision (user, 2026-08-28): Option B — raise the opacity from 50% to 55%.**

The orchestrator independently confirmed both halves before the decision (orchestrator-run, not
this executor's measurements):

| Sample | Composite | Ratio | Verdict |
|--------|-----------|-------|---------|
| Light @ 50% (implemented) | `#7a7c87` on `#f4f7fd` | 3.87:1 | fails AA |
| Light @ 50% (mock-sampled `#797B87`) | — | 3.92:1 | fails AA — not implementation drift |
| Light @ **55%** | `#6e707c` on `#f4f7fd` | **4.58:1** | **passes** — first whole percent clearing AA |
| Dark @ 55% | `#9b9ba0` on `#20212C` | 5.77:1 | passes (dark already passed at 50%, 5.03:1) |

This executor re-derived the light and dark composites and all four ratios from the raw hex
independently and reproduced them exactly, including `#6e707c` at 4.58:1.

**Kept as a derived opacity rule, not a hex literal.** `04-UI-SPEC.md` states this as a percentage
of `--color-text-primary`; a hardcoded `#6f717c` would also pass AA but would replace a system rule
with a literal nothing else in the codebase uses. The spec was amended in both themes — the dark
half moved to 55% too, so one rule covers both — and records the rejected 50% inline so a future
reader does not "restore" it to match the mock.

**No axe exception was added.** The gate is green on its own terms.

## Acceptance Criteria Not Met As Written

Two of the plan's criteria were factually wrong about the repository, and one is self-contradictory.
None indicates a defect in the delivered code, and all three are preserved here as planning defects
worth fixing at the source rather than deleted now that the gates are green.

1. **`grep -c '15px' tokens/typography.tokens.json` is 1** — it is 3. `heading-s` and `body-m`
   already carried `"lineHeight": "15px"` before this plan. The meaningful form,
   `grep -c '"fontSize": "15px"'`, is exactly 1.
2. **`grep -c 'heading-m' tokens/style-dictionary.build.test.ts` is at least 2** — it is 9.
   Satisfied.
3. **`git status --porcelain visual/` shows only ADDED baselines, no modified pre-existing Checkbox
   baseline** — **not satisfiable.** `components-ui-checkbox--checked-with-strikethrough` is the
   story that *renders the treatment this task changes*; its four baselines necessarily move. The
   criterion's protective intent is intact and was verified twice (at 50% and again at 55%): the
   other **eight** Checkbox stories' baselines are byte-identical to their committed versions, and
   the recorded diff is the label colour alone — checkbox box, strikethrough, metrics and layout
   unchanged, confirmed by reading the actual/expected/diff PNGs. Re-recording was scoped with
   `-g "components-ui-checkbox--checked-with-strikethrough"` so nothing else could be touched.

   One detail worth carrying forward: at 55% the re-record needed `--update-snapshots=all`, not
   `=changed`. The 50%→55% shift is subtle enough to fall under Playwright's default per-pixel
   `threshold`, so `=changed` reported all four as passing and rewrote nothing — which would have
   left committed baselines that no longer matched what ships.

## User Setup Required

None — no external service configuration required. This plan installed no packages (T-04-SC holds).

## Next Phase Readiness

**Ready and green:**

- `heading-m` is available for the task card title (C-02's fix).
- `Textarea` is available for the Description field in `Add New Task` / `Edit Task`, baselined in both themes. It performs no validation and claims none — `.safeParse` at the action boundary remains the real defence (T-04-19).
- `label` is a required prop on `Textarea`, so an unlabelled control fails type-checking, not merely the axe pass (T-04-20 mitigated; verified with a throwaway probe file that errored `TS2741`, then deleted).

- The subtask checklist row's completed-state treatment is ready and AA-clean. Consumers opt in with `hasStrikethroughWhenChecked`; the default path is untouched.

**Nothing is blocked.** All gates green: `pnpm test` 1355/1355 across all five projects, `pnpm test:a11y` 203/203, `CI=1 pnpm test:visual` 300/300, `pnpm lint`, `tsc --noEmit`, `format:check`, and all six check scripts.

## Self-Check: PASSED

- All four created files exist on disk (`src/components/ui/textarea/{textarea.tsx,textarea-variants.ts,textarea.stories.tsx,textarea.test.tsx}`).
- All five commits resolve: `ccee574`, `8a085f2`, `0f6a3ef`, `5978b0e`, `0bdf64b`.
- No stubs, no skipped tests, no unrun `<verify>` commands, and no suppressed lint or axe rules.
- `.planning/WINDOWS.md` entry 29 (`unmet-truth`) is marked `fixed` — the contrast gate it recorded is green.

---

_Phase: 04-task-subtask-workflow_
_Completed: 2026-08-28_
