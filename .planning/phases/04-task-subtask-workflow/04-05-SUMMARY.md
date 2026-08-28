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
  - "`Checkbox`'s `hasStrikethroughWhenChecked` opt-in now carries the completed-subtask label colour as well as the strikethrough"
affects: [task-card, add-task-modal, edit-task-modal, subtask-checklist-row, task-detail-modal]

actuals:
  tokens: 6987
  tasks: 3
  commits: 5

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
  - "The completed-subtask colour was left exactly as UI-SPEC specifies and the axe failure left unsuppressed, rather than silently choosing between the mock and WCAG AA"

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
        ref: "pnpm test:a11y — checkbox.stories.tsx > Checked With Strikethrough (color-contrast 3.86:1)"
        status: fail
    human_judgment: true
    rationale: "The colour is provably correct against the mock (#7a7c87 rendered vs #797B87 sampled on p5) and provably fails WCAG AA. Which authority wins is a product/accessibility decision, not an executor call."

duration: 76 min
completed: 2026-08-28
status: halted
---

# Phase 4 Plan 05: Design-System Prerequisites Summary

**Added the mock's sixth type role (`heading-m`), a `Textarea` primitive mirroring `TextField`'s Field anatomy through Base UI's `render` prop, and the colour half of `Checkbox`'s completed-label opt-in — which turned out to fail WCAG AA at exactly the value the mock specifies.**

## Performance

- **Duration:** 76 min
- **Started:** 2026-08-28T14:05Z
- **Completed:** 2026-08-28T13:26Z (UTC clock; wall time above)
- **Tasks:** 3 of 3 implemented, 1 blocked on an unresolved decision
- **Files modified:** 11 source files + 40 visual baselines

## Accomplishments

- `heading-m` (Plus Jakarta Sans / 700 / 15px / 19px) is in the token pipeline, asserted in both themes, with the existing five roles byte-identical.
- `Textarea` ships at `src/components/ui/textarea/` — nine stories, 24 browser assertions across both viewports, an axe pass, and 36 Playwright baselines in light and dark.
- `Checkbox`'s `hasStrikethroughWhenChecked` now applies `text-text-primary/50` alongside the strikethrough, closing RESEARCH Pitfall 16 at the primitive.
- Surfaced a genuine conflict the plan did not anticipate: the specified completed-label colour fails WCAG AA contrast.

## Task Commits

1. **Task 1: heading-m type token** — `ccee574` (test, RED) → `8a085f2` (feat, GREEN)
2. **Task 2: Textarea primitive** — `0f6a3ef` (feat)
3. **Task 3: Checkbox completed-label colour** — `5978b0e` (test, RED) → `0bdf64b` (feat, GREEN)

## Files Created/Modified

- `tokens/typography.tokens.json` — adds `font.heading-m`; the other five roles untouched.
- `tokens/style-dictionary.build.test.ts` — two `heading-m` assertions (both-theme resolution, and no `--tracking-*`).
- `src/components/ui/textarea/textarea.tsx` — exports `Textarea`; `Field.Control render={<textarea />}` with `aria-busy` and `disabled={isDisabled || isLoading}`.
- `src/components/ui/textarea/textarea-variants.ts` — exports `textareaVariants`; `min-h-28` floor, `state` and `isBusy` axes.
- `src/components/ui/textarea/textarea.stories.tsx`, `textarea.test.tsx` — nine stories, 12 assertions × 2 viewports.
- `src/components/ui/checkbox/checkbox.tsx` — the opt-in gains `peer-data-[checked]:text-text-primary/50`.
- `src/components/ui/checkbox/checkbox.stories.tsx` — adds `UncheckedWithStrikethroughOptIn`.
- `src/components/ui/checkbox/checkbox.test.tsx` — three completed-label assertions; `Error` aliased to `ErrorStory`.
- `visual/primitives.visual.spec.ts` — nine `components-ui-textarea--*` ids and one new checkbox id.

## Decisions Made

1. **`Textarea` has no `size` variant.** `TextField`'s `size` maps to `h-8`/`h-10`/`h-12`. A fixed height directly contradicts "`min-h-28` and let it grow, never a fixed height", so the axis was dropped. The `Omit<…, "size">` base is kept, so a raw HTML `size` attribute still cannot leak in.
2. **`Textarea` has no `trailing` slot.** An absolutely-positioned trailing node inside a growing, scrolling box has no sensible anchor, and the plan's props list omits it.
3. **The axe failure was neither suppressed nor designed around.** See the blocker below.

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

## Acceptance Criteria Not Met As Written

Two of the plan's criteria were factually wrong about the repository, and one is self-contradictory. None indicates a defect in the delivered code.

1. **`grep -c '15px' tokens/typography.tokens.json` is 1** — it is 3. `heading-s` and `body-m` already carried `"lineHeight": "15px"` before this plan. The meaningful form, `grep -c '"fontSize": "15px"'`, is exactly 1.
2. **`grep -c 'heading-m' tokens/style-dictionary.build.test.ts` is at least 2** — it is 9. Satisfied.
3. **`git status --porcelain visual/` shows only ADDED baselines, no modified pre-existing Checkbox baseline** — **not satisfiable.** `components-ui-checkbox--checked-with-strikethrough` is the story that *renders the treatment this task changes*; its four baselines necessarily move. The criterion's protective intent is intact: the other **eight** Checkbox baselines are byte-identical, and the recorded diff is the label colour alone (checkbox box, strikethrough, metrics and layout unchanged — confirmed by reading the actual/expected/diff PNGs). Re-recording was scoped with `-g "components-ui-checkbox--checked-with-strikethrough" --update-snapshots=changed` so nothing else could be touched.

## Issues Encountered

**BLOCKER — the specified completed-subtask colour fails WCAG AA, and the mock is where it comes from.**

`pnpm test:a11y` is **red** on one story: `checkbox.stories.tsx > Checked With Strikethrough`.

```
Elements must meet minimum color contrast ratio thresholds (color-contrast)
insufficient color contrast of 3.86 (foreground #7a7c87, background #f4f7fd,
font size: 13px, weight: normal). Expected contrast ratio of 4.5:1
```

What is verified, not assumed:

- The rendered foreground is **`#7a7c87`** — measured by axe against the real render, not inferred.
- `04-UI-SPEC.md` § "Completed-subtask treatment" predicts exactly `#7A7C87` for this composite and records `#797B87` sampled from mock p5. **The implementation is correct.**
- Mock p5 was rendered at 300 DPI and read this session: its completed subtask rows do carry a light grey struck-through label, visibly lighter than the incomplete row's near-black one. The design intends this.
- The dark theme is unaffected (`#8F9095` on `#20212C` is high-contrast); only the light row fails.
- Every other gate is green: `pnpm test` 1354/1355, `CI=1 pnpm test:visual` 300/300, `pnpm lint`, `tsc --noEmit`, `format:check`, and all six check scripts.

So the mock, the UI-SPEC and WCAG AA cannot all be satisfied. Three resolutions, none of which is an executor's call:

| Option | Consequence |
|--------|-------------|
| **A. Ship as-is, record a scoped axe exception** | Matches the mock exactly. Ships a known 4.5:1 failure on real content, and weakens D-21's "an axe violation fails the story rather than merely annotating it — nothing ships unverified." Every future subtask row inherits it. |
| **B. Darken the completed label to reach 4.5:1** | Passes AA. Diverges from the mock and from UI-SPEC's explicitly-sampled composite; the UI-SPEC would need amending, not just the code. |
| **C. Use `--color-text-muted` (`#66707F` light)** | **Explicitly barred** by UI-SPEC ("Do not substitute `text-text-muted` — it is a different value in each theme and misses both"). Listed only so it is visibly rejected rather than silently rediscovered. |

Per `CLAUDE.md` ("When the mock and a UI-SPEC disagree, surface the conflict instead of following either silently") the code was left exactly as specified and the axe rule left **unsuppressed**, so the failure is visible rather than buried. Recorded in `.planning/WINDOWS.md` as an `unmet-truth`.

`status: halted` is deliberate: CI is red, and `CLAUDE.md` states a red job is a hard blocker on advancing rather than a caveat to carry forward. Downstream plans consuming this Checkbox treatment should stay blocked until the decision is made.

## User Setup Required

None — no external service configuration required. This plan installed no packages (T-04-SC holds).

## Next Phase Readiness

**Ready and green:**

- `heading-m` is available for the task card title (C-02's fix).
- `Textarea` is available for the Description field in `Add New Task` / `Edit Task`, baselined in both themes. It performs no validation and claims none — `.safeParse` at the action boundary remains the real defence (T-04-19).
- `label` is a required prop on `Textarea`, so an unlabelled control fails type-checking, not merely the axe pass (T-04-20 mitigated; verified with a throwaway probe file that errored `TS2741`, then deleted).

**Blocked:**

- The subtask checklist row cannot ship its completed-state treatment until the contrast decision above is made. The primitive is ready either way; only the one colour literal changes.

## Self-Check: PASSED

- All four created files exist on disk (`src/components/ui/textarea/{textarea.tsx,textarea-variants.ts,textarea.stories.tsx,textarea.test.tsx}`).
- All five commits resolve: `ccee574`, `8a085f2`, `0f6a3ef`, `5978b0e`, `0bdf64b`.
- No stubs, no skipped tests, no unrun `<verify>` commands. The single failing gate is documented above, not hidden.

---

_Phase: 04-task-subtask-workflow_
_Completed: 2026-08-28_
