---
phase: 01-foundation-auth-preferences
plan: 23
subsystem: ui
tags: [react, base-ui, tailwind, cva, checkbox, accessibility]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "01-16's isLoading pattern on Button/TextField/IconButton/Dropdown (Field.Root disabled composition, aria-busy, isBusy cva axis) that this plan extends to Checkbox"
provides:
  - "Checkbox.isLoading prop, composing with isDisabled through Field.Root's single disabled propagation point"
  - "Fix for a dormant disabled-opacity CSS selector bug in checkboxVariants (affects isDisabled too, not just the new isLoading)"
  - "components-ui-checkbox--loading visual-regression story registration"
affects: [ui, design-system]

# Actuals (#2632)
actuals:
  tokens: 3300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "isLoading composes into Field.Root's disabled prop (disabled={isDisabled || isLoading}) rather than a second prop on the field control, for primitives already using Field.Root's single-propagation-point pattern (D-15)"
    - "data-[disabled]:* Tailwind selectors for Base UI components that render role=\"checkbox\"/role=\"radio\" style span-based controls, since these never receive a real DOM disabled attribute the CSS :disabled pseudo-class needs (data-disabled/aria-disabled only)"

key-files:
  created: []
  modified:
    - src/components/ui/checkbox/checkbox.tsx
    - src/components/ui/checkbox/checkbox.test.tsx
    - src/components/ui/checkbox/checkbox.stories.tsx
    - visual/primitives.visual.spec.ts

key-decisions:
  - "isLoading composes into Field.Root's existing disabled prop, not a second prop on Checkbox.Root — same single-propagation-point pattern isDisabled already used (D-15)."
  - "No spinner glyph on Checkbox's isLoading — the 16/20/24px tick box has no room for one; the grayed-out opacity treatment is what \"loading\" means here."
  - "Fixed checkboxVariants's disabled:opacity-50/disabled:cursor-not-allowed (CSS :disabled pseudo-class, which never matches Base UI Checkbox.Root's role=\"checkbox\" <span>) to data-[disabled]:opacity-50/data-[disabled]:cursor-not-allowed, matching the file's existing data-[checked]:* presence-based convention."

patterns-established:
  - "For Base UI form primitives rendering a non-native role=\"X\" <span>/composite element (Checkbox, likely Radio/Switch too), disabled-state Tailwind styling must target data-[disabled]:* — the :disabled pseudo-class only matches real native disabled elements, and these primitives' visible surface is not one."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "Checkbox has a real isLoading prop, visually grayed out the same way isDisabled already is, reporting aria-busy and inert to click/keyboard while loading"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#renders isLoading with the same grayed-out opacity as isDisabled, reports aria-busy, and does not toggle on click or keyboard Space"
        status: pass
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#reports aria-busy=false (not absent) when not loading"
        status: pass
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#composes isLoading and isDisabled together into the same grayed-out, inert state either alone produces"
        status: pass
    human_judgment: false
  - id: D2
    description: "Field.Root's disabled propagation to Checkbox.Root confirmed as a real DOM disabled property on the hidden native input, and checkboxVariants's disabled-selector bug fixed so isDisabled/isLoading actually render grayed out"
    verification:
      - kind: unit
        ref: "src/components/ui/checkbox/checkbox.test.tsx#propagates Field.Root's disabled prop to Checkbox.Root's hidden native input as a real DOM disabled property"
        status: pass
    human_judgment: false
  - id: D3
    description: "Checkbox's Loading story exists and is registered for the next visual-baseline generation pass, with zero new axe violations"
    verification:
      - kind: e2e
        ref: "pnpm test:a11y (Storybook + axe project) — 70 tests passed, including components-ui-checkbox--loading"
        status: pass
    human_judgment: false

duration: ~26min
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 23: Checkbox isLoading Summary

**Checkbox gets a real isLoading prop matching Button/TextField/IconButton/Dropdown's composition pattern — and along the way, fixes a dormant bug where isDisabled's own grayed-out opacity had never actually rendered.**

## Performance

- **Duration:** ~26 min (plus a ~8 min one-time `pnpm install` for this fresh worktree's `node_modules`, not part of the plan's own work)
- **Started:** 2026-08-17T10:12:00Z (approx.)
- **Completed:** 2026-08-17T10:36:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `isLoading?: boolean` to `Checkbox`'s `Props`, composing into `Field.Root`'s `disabled` prop (`disabled={isDisabled || isLoading}`) — the same single-propagation-point pattern `isDisabled` already used, no second `disabled` prop on `Checkbox.Root`.
- Added `aria-busy` (always rendered, `"true"` or `"false"`, never omitted) and an `isBusy` cva axis on `checkboxVariants` mirroring `text-field.tsx`'s naming (`cursor-progress`).
- Fixed a real, pre-existing bug the Task 1 investigation surfaced: `checkboxVariants`'s `disabled:opacity-50 disabled:cursor-not-allowed` targeted the CSS `:disabled` pseudo-class, which can never match Base UI's `Checkbox.Root` — it renders a `role="checkbox"` `<span>` (which only ever gets `data-disabled`/`aria-disabled`) plus a separate, visually-hidden native `<input type="checkbox">` sibling that receives the real `disabled` attribute. `isDisabled`'s own "grayed out" visual treatment had silently never worked. Fixed to `data-[disabled]:*`, matching the file's existing `data-[checked]:*` presence-based convention.
- Added a `Loading` story (`isLoading: true`, visual-only per D-25) and registered `components-ui-checkbox--loading` in `visual/primitives.visual.spec.ts` for the next baseline generation pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Investigate — confirm Field.Root's disabled propagation, record the isLoading composition decision** - `de042e8` (test)
2. **Task 2: Implement — isLoading prop, composing exactly as Task 1 confirmed** - `2f019cb` (feat, includes the disabled-selector bug fix)
3. **Task 3: Loading story and visual-regression baseline registration** - `b423964` (test)

**Plan metadata:** commit follows this SUMMARY (worktree mode — orchestrator handles STATE.md/ROADMAP.md).

## Files Created/Modified

- `src/components/ui/checkbox/checkbox.tsx` - `isLoading` prop, `isBusy` cva axis, `data-[disabled]:*` selector fix, `aria-busy`
- `src/components/ui/checkbox/checkbox.test.tsx` - hidden-input disabled-propagation test, four new isLoading tests
- `src/components/ui/checkbox/checkbox.stories.tsx` - `Loading` story
- `visual/primitives.visual.spec.ts` - `components-ui-checkbox--loading` registered, Checkbox story-count comment updated (eight → nine)

## Decisions Made

- `isLoading` composes into `Field.Root`'s existing `disabled` prop rather than a second prop on `Checkbox.Root` — matches the plan's decision and D-15's single-propagation-point pattern.
- No spinner glyph — matches the plan's decision; the tick box has no room for one and the grayed-out opacity is the intended "loading" look.
- Fixed the dormant `disabled:` → `data-[disabled]:` selector bug inline (Rule 1) rather than deferring, since it is the literal mechanism this plan's stated goal ("the same grayed-out visual treatment isDisabled already gets") depends on — deferring it would have shipped an `isLoading` that visually did nothing, silently matching an already-broken `isDisabled`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed checkboxVariants's dormant disabled-opacity CSS selector**
- **Found during:** Task 1 (investigation) — the planned "real DOM `disabled` property" assertion initially failed against the `role="checkbox"` `<span>` `getByRole` returns, leading to tracing Base UI's `Checkbox.Root` source (`node_modules/@base-ui/react/checkbox/root/CheckboxRoot.js`) to find it renders that span plus a separate hidden native `<input>`, and that the span's disabled state only ever surfaces as `data-disabled`/`aria-disabled`, never the DOM `disabled` attribute the CSS `:disabled` pseudo-class requires.
- **Issue:** `checkboxVariants`'s `disabled:opacity-50 disabled:cursor-not-allowed` base classes never actually applied — `isDisabled` checkboxes have never visually grayed out in this codebase, since Base UI v1.7.0's non-native checkbox implementation.
- **Fix:** Swapped to `data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed`, matching the file's own existing `data-[checked]:*` presence-based Tailwind convention. Confirmed via a real computed-style assertion (`getComputedStyle(...).opacity`) that both `isDisabled` and the new `isLoading` now genuinely render at 0.5 opacity.
- **Files modified:** `src/components/ui/checkbox/checkbox.tsx`
- **Verification:** `pnpm vitest run --project browser src/components/ui/checkbox/checkbox.test.tsx` (22/22 passing, including the opacity-equality assertions); `pnpm lint`; `pnpm exec tsc --noEmit`; `pnpm test:a11y` (70/70 passing).
- **Committed in:** `2f019cb` (Task 2 commit)

**2. [Rule 3 - Blocking] Fresh worktree missing generated dependencies and Next.js route types**
- **Found during:** Task 1/2 test runs and Task 3's `tsc --noEmit` verify step.
- **Issue:** This worktree's `node_modules` was not yet installed (first `pnpm vitest run` triggered pnpm's automatic dep-status-check install, ~8 min under concurrent system load from other parallel wave agents), and `.next/types` (Next.js's generated `LayoutProps<...>` ambient types, consumed by the pre-existing `app/layout.tsx`, untouched by this plan) did not exist yet, causing `tsc --noEmit` to fail with an unrelated `Cannot find name 'LayoutProps'` error.
- **Fix:** Let the automatic `pnpm install` complete; ran `pnpm exec next typegen` to generate `.next/types` (gitignored, non-code-modifying, standard Next.js codegen step). Both are one-time environment setup for this fresh worktree, not code changes.
- **Files modified:** none (generated artifacts only, `.next/` is gitignored)
- **Verification:** `pnpm exec tsc --noEmit` exits 0 afterward.
- **Committed in:** n/a (no file changes — environment setup only)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking/environment)
**Impact on plan:** The disabled-selector fix was necessary for the plan's own stated goal (isLoading visually matching isDisabled) to be true rather than coincidentally-equal-but-both-broken. No scope creep — both fixes are squarely within `checkbox.tsx`'s own mechanism or one-time environment setup.

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- GC-14 is closed. Checkbox now has `isLoading` visually and behaviorally consistent with Button/TextField/IconButton/Dropdown.
- `components-ui-checkbox--loading` is registered for visual-baseline generation but has no baseline PNG committed yet — same as every other primitive's stories, this is deferred to the phase's next "Visual baselines" CI dispatch (per the existing WINDOWS.md id 1 pattern from plan 01-06), not a new gap this plan introduced.
- The `data-[disabled]:*` fix likely generalizes to Switch (`src/components/ui/switch/switch.tsx`), which may share the same Base UI non-native-span-with-hidden-input shape — worth a quick check next time Switch's disabled visual is touched, but out of this plan's scope to verify or fix.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-17*

## Self-Check: PASSED

All created/modified files confirmed present on disk (`checkbox.tsx`, `checkbox.test.tsx`,
`checkbox.stories.tsx`, `visual/primitives.visual.spec.ts`, this SUMMARY.md) and all three task
commit hashes (`de042e8`, `2f019cb`, `b423964`) confirmed present in `git log --oneline --all`.
