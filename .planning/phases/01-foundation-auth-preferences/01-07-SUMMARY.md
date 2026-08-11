---
phase: 01-foundation-auth-preferences
plan: 07
subsystem: ui
tags: [react, base-ui, tailwind, cva, tailwind-merge, vitest-browser, storybook, axe, design-tokens]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (01-06)
    provides: Button/IconButton primitives establishing the wrapper shape (cva variants, cn()
      className merge, Storybook visual-only stories, Vitest Browser Mode behaviour tests) that
      this plan's TextField/Checkbox copy; src/lib/cn.ts's typography class-group fix
provides:
  - TextField primitive (Base UI Field composition, label/description/error/size axes, built-in
    error state per D-17)
  - Checkbox primitive (Base UI Checkbox.Root/Indicator + Field.Label, sm/md/lg tick sizing,
    opt-in strikethrough-when-checked for the Phase 4 subtask row)
  - A WCAG-AA-contrast fix to the shared `color-text-muted` semantic token (light mode only) —
    every future consumer of muted/secondary text inherits the fix automatically
affects: [01-08, 01-09, 01-10, 01-11, 01-12, 01-13, ui, testing]

# Actuals (#2632)
actuals:
  tokens: 8545
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Base UI's Field composition (Field.Root/Label/Control/Description/Error) drives label
      association, aria-invalid and aria-describedby wiring for every form primitive — no
      hand-rolled aria-describedby bookkeeping (D-15)"
    - "Field.Error is force-rendered via match={true} and conditionally mounted in JSX (not left
      to native/Form constraint validity), since hasError/errorMessage are fully externally
      controlled props, not native validation"
    - "peer / peer-data-[checked]:* CSS pairing lets a sibling Field.Label react to a control's
      live data-checked attribute without JS state tracking — works for both controlled and
      uncontrolled usage"
    - "eslint-plugin-boundaries forbids ui-to-ui imports (D-26q/ADR tech/0009) — a primitive's
      Storybook story cannot import a sibling primitive to compose a demo; stage the visual
      position with a bare glyph instead and let real composition happen at the feature/layout
      layer"

key-files:
  created:
    - src/components/ui/text-field/text-field.tsx
    - src/components/ui/text-field/text-field.test.tsx
    - src/components/ui/text-field/text-field.stories.tsx
    - src/components/ui/checkbox/checkbox.tsx
    - src/components/ui/checkbox/checkbox.test.tsx
    - src/components/ui/checkbox/checkbox.stories.tsx
  modified:
    - tokens/color.tokens.json
    - tokens/color.light.tokens.json
    - src/styles/tokens.css
    - visual/primitives.visual.spec.ts
    - .planning/WINDOWS.md

key-decisions:
  - "Field.Description/Field.Error are conditionally mounted in JSX (only when description/
    hasError+errorMessage are provided) rather than left permanently mounted with Base UI's own
    async mount/unmount transition — makes 'no error element when valid' a structural JSX fact,
    not a timing-dependent one"
  - "TextField's trailing slot is a plain ReactNode positioned absolutely inside a relative
    wrapper around Field.Control, matching input right-padding via a hasTrailing cva variant —
    the real IconButton password-toggle consumer lands in plan 01-12, at the feature layer where
    ui-to-ui composition is actually allowed"
  - "Checkbox's hasStrikethroughWhenChecked defaults to false and is implemented purely via a
    peer-data-[checked]:line-through Tailwind class (not a React isChecked read), so it works
    correctly even when the consumer only passes defaultChecked (uncontrolled)"

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "TextField's visible label is programmatically associated with its input (accessible name = label text, clicking the label focuses the input)"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#TextField > associates the visible label with the input as its accessible name, and clicking the label focuses the input"
        status: pass
    human_judgment: false
  - id: D2
    description: "TextField's error state renders the danger border/text, marks the input aria-invalid, and exposes the error message as the input's accessible description; no error element renders when hasError is unset"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#TextField > renders the danger border and message, marks the input invalid, and exposes the message as its accessible description when hasError"
        status: pass
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#TextField > renders no error message element and does not mark the input invalid when hasError is unset"
        status: pass
    human_judgment: false
  - id: D3
    description: "A 300-character TextField value holds the field's rendered width instead of expanding or wrapping the layout"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#TextField > holds its rendered width against a 300-character value instead of expanding or wrapping the layout"
        status: pass
    human_judgment: false
  - id: D4
    description: "Checkbox is keyboard-operable (tab-reachable, toggles on Space) and exposes checked/disabled/invalid state to assistive technology, sharing TextField's danger token for its error state"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#Checkbox > is reachable by keyboard tab order and toggles on Space"
        status: pass
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#Checkbox > renders the danger border using the same semantic token as TextField and marks the control invalid when hasError"
        status: pass
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#Checkbox > renders disabled, is not focusable by pointer activation, and does not toggle when isDisabled"
        status: pass
    human_judgment: false
  - id: D5
    description: "Checkbox is a real controlled component: onCheckedChange fires the intended next value but the rendered state only changes when the parent feeds isChecked back in"
    verification:
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#Checkbox > reflects a controlled isChecked prop and does not toggle itself when the parent does not update it"
        status: pass
    human_judgment: false
  - id: D6
    description: "axe-core reports no accessibility violation on any TextField or Checkbox story (17 stories, 34 light/dark cases)"
    verification:
      - kind: automated_ui
        ref: "pnpm vitest run --project storybook (30 stories total, 0 violations)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Visual-regression baselines exist for every TextField and Checkbox story in both light and dark scope, and the CI visual job is green"
    verification:
      - kind: e2e
        ref: "visual/primitives.visual.spec.ts (34 new assertions defined, story IDs verified against storybook-static/index.json; pnpm test:visual smoke run passes off-CI)"
        status: unknown
    human_judgment: true
    rationale: "Baselines are only ever generated in CI (ADR tech/0008) via the manual visual-baselines.yml workflow_dispatch, which requires this worktree's commits to be merged/pushed first. Same limitation as plan 01-06 (WINDOWS.md id 1, now fixed). Logged as WINDOWS.md id 4 (kind unrun-verify) with the exact post-merge follow-up command."

# Metrics
duration: 30min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 7: TextField & Checkbox Primitives Summary

**TextField and Checkbox primitives wrapping @base-ui/react's Field/Checkbox composition, with a built-in error state sharing the same danger token, plus a real WCAG AA contrast fix to the shared muted-text semantic color.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-11T14:27:00+02:00 (worktree branched from 8551540)
- **Completed:** 2026-08-11T14:56:00+02:00
- **Tasks:** 2 (Task 1 TextField, Task 2 Checkbox)
- **Files modified:** 11 (6 created, 5 modified)

## Accomplishments

- `TextField` primitive: Base UI `Field.Root/Label/Control/Description/Error` composition, seven behaviours covered (label association, typing + `onValueChange`, error state with `aria-invalid`/`aria-describedby`, no-error-when-valid, disabled, password masking + trailing slot, 300-char overflow holding layout width), nine Storybook stories, axe-clean
- `Checkbox` primitive: Base UI `Checkbox.Root`/`Checkbox.Indicator` + `Field.Label`, six behaviours covered (accessible name + label click toggle, keyboard Space toggle, `onCheckedChange` firing/suppression, controlled-prop reflection, shared danger error token, disabled/non-focusable-by-pointer), eight Storybook stories, axe-clean
- Real WCAG AA contrast bug fixed at the token root: `color-text-muted` (#828FA3, 3.27:1 on white) darkened to a new light-mode-only `grey.550` (#6B7686, 4.61:1) in `tokens/color.tokens.json`/`color.light.tokens.json` — dark mode's value is untouched since it already passes against the dark surfaces
- `visual/primitives.visual.spec.ts` now carries 17 new stories (34 light/dark assertions) on top of Button/IconButton's 13

## Task Commits

Each task was committed atomically:

1. **Task 1: TextField primitive with built-in error state** — `886d75d` (feat)
2. **Task 2: Checkbox primitive** — `0809474` (feat)

**Plan metadata:** committed alongside this SUMMARY (see final commit below)

## Files Created/Modified

- `src/components/ui/text-field/text-field.tsx` - TextField primitive (Base UI Field wrap, cva size/state/hasTrailing axes)
- `src/components/ui/text-field/text-field.test.tsx` - 7 browser-mode behaviour tests
- `src/components/ui/text-field/text-field.stories.tsx` - 9 visual-only stories
- `src/components/ui/checkbox/checkbox.tsx` - Checkbox primitive (Base UI Checkbox wrap, cva size/state axes, opt-in strikethrough)
- `src/components/ui/checkbox/checkbox.test.tsx` - 6 browser-mode behaviour tests
- `src/components/ui/checkbox/checkbox.stories.tsx` - 8 visual-only stories
- `tokens/color.tokens.json` - new `grey.550` primitive shade for WCAG-AA-compliant light-mode muted text
- `tokens/color.light.tokens.json` - `text.muted` now references `grey.550` instead of `grey.500`
- `src/styles/tokens.css` - regenerated (`pnpm tokens:build`) to reflect the token change
- `visual/primitives.visual.spec.ts` - TextField's 9 + Checkbox's 8 stories appended (34 assertions)
- `.planning/WINDOWS.md` - new id 4 (unrun-verify) logging the not-yet-dispatched visual-baselines follow-up for these 17 stories

## Decisions Made

- **Field.Error force-rendered via `match={true}`, conditionally mounted in JSX:** Base UI's `Field.Error` normally derives its visibility from native constraint validation or a `<Form>` context, neither of which this primitive uses — `hasError`/`errorMessage` are fully externally controlled. Wrapping it in `{hasError && errorMessage ? <Field.Error match={true}>...</Field.Error> : null}` makes "no error element when valid" a structural JSX fact rather than dependent on the library's own async mount/unmount transition.
- **TextField's `Password` story stages the trailing eye glyph as a bare icon, not the real `IconButton`:** `eslint-plugin-boundaries` forbids `ui`-to-`ui` imports (only `ui`→`lib` and `feature`/`layout`→`ui` are allowed per `eslint.config.mjs`). The `trailing` prop itself stays a plain `ReactNode` — this is a story-only substitution, not a primitive-level restriction. The real `IconButton` composition happens in plan 01-12 at the feature layer.
- **Checkbox's `hasStrikethroughWhenChecked` uses a `peer`/`peer-data-[checked]:line-through` CSS pairing** instead of reading `isChecked` in the label's className. This makes the strikethrough correct for both controlled (`isChecked`) and uncontrolled (`defaultChecked`) usage, since it reacts to the live DOM `data-checked` attribute Base UI's `CheckboxRoot` already sets, not to React props.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing `text-{name}` size utility left Field.Label/Description/Error at the browser default 16px**
- **Found during:** Task 1, first `pnpm vitest run --project storybook` run
- **Issue:** `text-field.tsx`'s composite typography classes only included `font-{name}` (family) and the `[font-weight:var(...)]` arbitrary property, omitting the `text-{name}` (size) utility that button.tsx's established pattern also uses — every text element rendered at the browser's unstyled 16px default instead of the token's real 12/13px.
- **Fix:** Added `text-body-m`/`text-body-l` to Field.Label/Field.Description/Field.Error's className, matching button.tsx's three-part composite pattern (`font-{name} text-{name} [font-weight:var(...)]`).
- **Files modified:** `src/components/ui/text-field/text-field.tsx`
- **Verification:** `getComputedStyle` now reports the correct token sizes; this also directly caused/exposed the WCAG contrast finding below.
- **Committed in:** `886d75d` (Task 1 commit)

**2. [Rule 1 - Bug] `color-text-muted` fails WCAG AA 4.5:1 contrast as real text content**
- **Found during:** Task 1, `pnpm vitest run --project storybook` — axe-core flagged the `WithDescription` story
- **Issue:** `color-text-muted` (#828FA3) measured 3.27:1 against the light-theme white surface — below WCAG AA's 4.5:1 threshold for normal-size text. The token had shipped previously only as placeholder/disabled text (both exempt from axe's `color-contrast` rule), so this was the first time it rendered as real, checked content (`Field.Description`).
- **Fix:** Added a new primitive shade `color.grey.550` (#6B7686, 4.61:1 against white) and pointed `color.light.tokens.json`'s `text.muted` at it instead of `grey.500`. Left `color.dark.tokens.json`'s `text.muted` referencing the original `grey.500`, since that value already passes comfortably (~5.3:1/4.6:1) against the dark-theme surfaces and darkening it further would only shrink that margin. Same fix pattern (darken at the token root, not per-component) as the prior WCAG contrast fix in commit `e173b23`.
- **Files modified:** `tokens/color.tokens.json`, `tokens/color.light.tokens.json`, `src/styles/tokens.css` (regenerated)
- **Verification:** `pnpm vitest run --project storybook` passes with 0 violations; `pnpm test` (token pipeline + browser + storybook, 63 tests) all pass.
- **Committed in:** `886d75d` (Task 1 commit)

**3. [Rule 4-adjacent, resolved without an architectural change] `eslint-plugin-boundaries` forbids TextField's story from importing IconButton**
- **Found during:** Task 1, `pnpm lint`
- **Issue:** The plan's `Password` story text ("with the trailing eye toggle") implied composing the real `IconButton` primitive, but `eslint.config.mjs`'s `boundaries/dependencies` rule only allows `ui`→`lib` (not `ui`→`ui`) — a real architectural constraint, not a bug.
- **Fix:** Rather than changing the boundaries rule (an architectural decision needing sign-off), the story stages the same visual position with a bare `lucide-react` `Eye` glyph instead of `IconButton`. `trailing` itself remains a generic `ReactNode` prop, so this only affects the story's demo, not the primitive's real capability.
- **Files modified:** `src/components/ui/text-field/text-field.stories.tsx`
- **Verification:** `pnpm lint` passes with 0 errors; `pnpm test:visual` smoke run renders the story correctly.
- **Committed in:** `886d75d` (Task 1 commit)

**4. [Rule 3 - Blocking] Vite dependency pre-bundle cache stale for the newly-imported `@base-ui/react/checkbox` subpath**
- **Found during:** Task 2, first `pnpm vitest run --project browser src/components/ui/checkbox` run
- **Issue:** All six Checkbox tests failed with `Invalid hook call` / `Cannot read properties of null (reading 'useContext')`, tracing into `@base-ui/react/checkbox`'s `useFormContext` — a duplicated React copy from Vite's optimizer not having pre-bundled the new subpath import correctly. Same known issue documented in plan 01-06's SUMMARY.
- **Fix:** Cleared `node_modules/.vite` and `node_modules/.cache/storybook`, re-ran.
- **Files modified:** none (cache-only)
- **Verification:** Re-run passed 5/6 immediately (see deviation 5 for the remaining failure).
- **Committed in:** n/a (no code change)

**5. [Rule 1 - Bug, test design] `isDisabled` test asserted programmatic `.focus()` suppression instead of pointer-click focus suppression**
- **Found during:** Task 2, after the cache-clear re-run
- **Issue:** `Checkbox.Root` renders a `<span role="checkbox">`, not a native form control — a disabled `<span>` still accepts a programmatic `.focus()` call as long as it carries a `tabindex` attribute (even `tabindex="-1"`), unlike a native `disabled` `<input>`/`<button>`, which browsers refuse to focus at all. The original test called `.focus()` directly and asserted it failed, which is not actually part of the primitive's contract — the plan's `<behavior>` text ("unfocusable by pointer activation") specifically means clicking must not move focus in, not that `.focus()` is blocked.
- **Fix:** Rewrote the assertion to only exercise pointer-click activation (`.click()`), which correctly does not move focus or toggle the disabled checkbox.
- **Files modified:** `src/components/ui/checkbox/checkbox.test.tsx`
- **Verification:** All 6 Checkbox tests pass.
- **Committed in:** `0809474` (Task 2 commit)

---

**Total deviations:** 5 (2 Rule 1 bugs including one real cross-cutting WCAG token fix, 1 boundaries-constraint workaround resolved without an architectural change, 1 Rule 3 blocking cache issue, 1 Rule 1 test-design fix). No scope creep — every fix was necessary to make this plan's own `<behavior>`/`<acceptance_criteria>` blocks actually true.

## Issues Encountered

- The visual-regression baseline capture step in Task 2's action ("dispatch the visual-baselines workflow, commit the returned artifact, confirm the CI visual job passes") could not be completed inside this isolated worktree — same limitation as plan 01-06 (no push/merge access from within the worktree). Logged as `WINDOWS.md` id 4 (kind `unrun-verify`) with the exact follow-up command for after merge.
- This worktree had no `node_modules/` on start (fresh worktree checkout) — ran `pnpm install` before any test could execute. Also required `pnpm exec next typegen` once to resolve a pre-existing `Cannot find name 'LayoutProps'` `tsc` error in `app/layout.tsx` (a Next.js 16 generated-route-type artifact, not caused by this plan — same gotcha noted in 01-06's SUMMARY).

## Known Stubs

None. Every behaviour this plan's `<behavior>` blocks specify is real, tested, and passing — no placeholder data, no hardcoded empty states, no unwired props.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `TextField` and `Checkbox` exist in the exact shape (Base UI wrapped, cva-driven, semantic-token-only, className-mergeable, behaviour-tested, axe-clean) that plans 01-08/01-09 (Switch, Dropdown, Modal) will continue to copy.
- The auth forms in plan 01-12 can now render inline validation errors through `TextField`'s built-in `hasError`/`errorMessage` props and a "Remember me" `Checkbox`, per D-17.
- `color-text-muted` is now WCAG-AA-safe as real text content in light mode — every future primitive/feature that uses it for secondary/muted copy inherits the fix automatically, no per-component workaround needed.
- **Blocker for `/gsd-ship` (or any `windows_enforce`-gated step):** three open `.planning/WINDOWS.md` entries — CI's visual job needs `visual-baselines.yml` dispatched once this worktree's code lands on `master` (ids 1's earlier fix now needs a follow-up re-run to cover the 17 new stories, tracked as id 4), the token pipeline's font-weight naming collision (id 2, pre-existing, out of this plan's scope), and the Node `/tmp` path-resolution tooling gotcha (id 3, pre-existing, environmental). None block this plan's own correctness; all are pre-existing/cross-plan concerns now made visible or extended.
- Plan 01-08 (Switch) should reuse `cn.ts` and the `Field.Root`/`Field.Label` composition pattern established here, and can lean on the now-fixed `color-text-muted` contrast without rediscovering the same axe finding.

## Self-Check: PASSED

All claimed files verified present on disk; both commit hashes (`886d75d`, `0809474`) verified present in `git log --oneline --all`.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-11*
