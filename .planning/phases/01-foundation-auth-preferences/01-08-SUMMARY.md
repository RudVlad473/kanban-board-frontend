---
phase: 01-foundation-auth-preferences
plan: 08
subsystem: ui
tags: [react, base-ui, tailwind, cva, tailwind-merge, vitest-browser, storybook, axe, design-tokens]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (01-07)
    provides: TextField/Checkbox primitives establishing the Base UI wrapper shape (cva variants,
      cn() className merge, Storybook visual-only stories, Vitest Browser Mode behaviour tests,
      shared danger-token error state) that this plan's Switch/Dropdown continue
provides:
  - Switch primitive (Base UI Switch.Root/Thumb, required `label` prop for icon-only accessible
    naming, reserved-accent checked track, 44x44px interactive floor at every size)
  - Dropdown compound component (Base UI Select composition wrapped as Root/Trigger/Content/Item,
    per D-19's fixed public shape — the surface every future selection consumer is written against)
affects: [01-09, 01-10, 01-11, 01-12, 01-13, 01-14, ui, testing]

# Actuals (#2632)
actuals:
  tokens: 7050
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Switch's visually smaller colored track is a plain nested <span> styled off the root's own
      data-checked/data-unchecked via Tailwind's group utility, since Base UI's state lives on
      Switch.Root, not on a nested element — the real 44x44 hit box is the root itself (matches
      IconButton's icon-vs-hit-box split)"
    - "Dropdown threads hasError from Root to Trigger via React context, since it is a sibling
      compound sub-component, not a prop Root can pass directly to Trigger's own JSX"
    - "Dropdown's Trigger wires Select.Value's rendered text to aria-labelledby explicitly — the
      combobox role takes its accessible name from author only, never from content, unlike button"
    - "No hand-rolled focus-management effect in Dropdown — zero useEffect touching
      document.activeElement; all focus trapping, roving tabindex and outside-click dismissal
      delegated to Base UI's Select composition (D-15)"

key-files:
  created:
    - src/components/ui/switch/switch.tsx
    - src/components/ui/switch/switch.test.tsx
    - src/components/ui/switch/switch.stories.tsx
    - src/components/ui/dropdown/dropdown.tsx
    - src/components/ui/dropdown/dropdown.test.tsx
    - src/components/ui/dropdown/dropdown.stories.tsx
  modified:
    - visual/primitives.visual.spec.ts
    - .planning/WINDOWS.md

key-decisions:
  - "Switch's iconOn/iconOff slots stay generic ReactNode props, not a hardcoded theme concept —
    plan 01-14's theme toggle is this primitive's first real consumer and passes sun/moon glyphs
    in from the outside"
  - "Dropdown exposes exactly Root/Trigger/Content/Item (no barrel file, D-26r) — consumers import
    Dropdown from this file path directly, mirroring Base UI's own Select composition model"

requirements-completed: [THEME-01]

coverage:
  - id: D1
    description: "A Switch is keyboard-operable (tab-reachable, toggles on Space), exposes its
      on/off state to assistive technology, and is a real controlled component — it does not
      self-toggle when the parent declines to update isChecked"
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "src/components/ui/switch/switch.test.tsx (6 behaviours: keyboard Space toggle,
          onCheckedChange firing/suppression, controlled-prop non-toggle, checked/unchecked AT
          state, 44x44 hit area at sm)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A Switch renders no visible text yet carries an accessible name via a required
      label prop, and the checked track uses the accent colour while the unchecked track does not"
    requirement: "THEME-01"
    verification:
      - kind: automated_ui
        ref: "pnpm vitest run --project storybook (Switch stories, 0 axe violations including the
          icon-only WithIcons variant)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dropdown is composed from named sub-components (Root/Trigger/Content/Item)
      rather than a list-of-options prop, and is fully keyboard-operable: opens on Enter or Space,
      Arrow Up/Down moves the active item, Enter selects and returns focus to the trigger, Escape
      closes without selecting and returns focus to the trigger"
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "src/components/ui/dropdown/dropdown.test.tsx (9 tests covering all 8 planned
          behaviours: closed-by-default, open on Space, open on Enter, Arrow nav + select + focus
          return, Escape + focus return, onValueChange fired once, selected-item AT state,
          danger border on hasError, isDisabled item skipped by nav and unclickable)"
        status: pass
    human_judgment: false
  - id: D4
    description: "axe-core reports no accessibility violation on any Switch or Dropdown story (14
      stories, 28 light/dark cases), and both primitives' Storybook build succeeds"
    verification:
      - kind: automated_ui
        ref: "pnpm vitest run --project storybook (44 tests total across 6 primitives, 0
          violations); pnpm build-storybook (succeeds)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual-regression baselines exist for every Switch and Dropdown story in both
      light and dark scope, and the CI visual job is green"
    verification:
      - kind: e2e
        ref: "visual/primitives.visual.spec.ts (28 new assertions defined; story IDs match
          switch.stories.tsx/dropdown.stories.tsx exports)"
        status: unknown
    human_judgment: true
    rationale: "Baselines are only ever generated in CI (ADR tech/0008) via the manual
      visual-baselines.yml workflow_dispatch, which requires this worktree's commits to be
      merged/pushed first — same limitation as plans 01-06/01-07 (WINDOWS.md ids 1/4, both fixed
      post-merge). Logged as WINDOWS.md id 5 (kind unrun-verify) with the exact post-merge
      follow-up command."

# Metrics
duration: n/a (recovered — see Issues Encountered)
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 8: Switch & Dropdown Primitives Summary

**Switch and Dropdown primitives wrapping @base-ui/react's Switch and Select compositions — the
fifth and sixth design-system primitives, unblocking the theme toggle and fixing the compound API
every future selection surface is written against.**

## Performance

- **Duration:** n/a — this plan's code was written and tested by an executor session that was
  interrupted before it could commit or return a result (see Issues Encountered). This SUMMARY
  covers the recovery, verification and commit of that work, not its original authoring time.
- **Completed:** 2026-08-11
- **Tasks:** 2 (Task 1 Switch, Task 2 Dropdown)
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- `Switch` primitive: Base UI `Switch.Root`/`Switch.Thumb` composition, six behaviours covered
  (keyboard Space toggle, `onCheckedChange` firing/suppression, controlled-prop non-toggle,
  checked/unchecked assistive-tech state, 44x44px hit area at every size including `sm`), seven
  Storybook stories, axe-clean, `bg-bg-primary` reserved for the checked track only
- `Dropdown` compound component: Base UI `Select` composition wrapped as
  `Root`/`Trigger`/`Content`/`Item`, nine tests covering all eight planned behaviours (open on
  Enter/Space, Arrow navigation, Enter-select with focus return, Escape with focus return,
  `onValueChange` firing once, selected-item AT state, `hasError` danger border matching
  TextField/Checkbox, disabled-item skip), seven Storybook stories, axe-clean, zero hand-rolled
  focus-management code
- `visual/primitives.visual.spec.ts` now carries 14 new stories (28 light/dark assertions) on top
  of the existing 30 from Button/IconButton/TextField/Checkbox

## Task Commits

Each task was committed atomically:

1. **Task 1: Switch primitive** — `9219379` (feat)
2. **Task 2: Dropdown compound component** — `04f668b` (feat)

**Plan metadata:** committed alongside this SUMMARY (see final commit below)

## Files Created/Modified

- `src/components/ui/switch/switch.tsx` - Switch primitive (Base UI Switch wrap, cva size axis, group-data-driven track styling)
- `src/components/ui/switch/switch.test.tsx` - 6 browser-mode behaviour tests
- `src/components/ui/switch/switch.stories.tsx` - 7 visual-only stories
- `src/components/ui/dropdown/dropdown.tsx` - Dropdown compound component (Base UI Select wrap, context-threaded hasError)
- `src/components/ui/dropdown/dropdown.test.tsx` - 9 browser-mode behaviour tests
- `src/components/ui/dropdown/dropdown.stories.tsx` - 7 visual-only stories
- `visual/primitives.visual.spec.ts` - Switch's 7 + Dropdown's 7 stories appended (28 assertions)
- `.planning/WINDOWS.md` - new id 5 (unrun-verify) logging the not-yet-dispatched visual-baselines follow-up for these 14 stories

## Decisions Made

- **Switch's track is a plain nested `<span>`, not a Base UI-stateful element:** Base UI's
  `checked`/`unchecked` data attributes live on `Switch.Root`, so the track (which needs to react
  to that state for its background colour) is styled via Tailwind's `group`/`group-data-[checked]`
  pattern rather than reading state into a second Base UI-aware component.
- **Dropdown's `hasError` is threaded via React context, not a prop drilled through children:**
  `Trigger` is a sibling of `Root` (both instantiated as `Root`'s children by the consumer), so
  `Root` cannot pass `hasError` to `Trigger` as a direct prop — a `DropdownContext` carries it
  instead, scoped to one `Dropdown.Root` instance.
- **`Dropdown.Trigger` wires `Select.Value`'s id to `aria-labelledby` explicitly:** the ARIA
  `combobox` role takes its accessible name from `author` only (unlike `button`, which can use
  its own text content), so without this wiring the trigger would render visible text but expose
  no accessible name at all.

## Deviations from Plan

None — plan executed exactly as written. Both primitives match every prop shape, styling token,
and behaviour the plan's `<action>`/`<behavior>` blocks specify.

## Issues Encountered

- **This plan's original executor session was interrupted before completing.** Its worktree
  (`.claude/worktrees/agent-adf5dfcd5ac8adb79`, branch `worktree-agent-adf5dfcd5ac8adb79`) was
  left locked (stale PID, `lock_owner_unknown` on `worktree.reap-orphans`) with both primitives
  fully written, TypeScript-clean, lint-clean, and passing every behaviour test — but nothing
  committed, and Task 2's stories not yet appended to `visual/primitives.visual.spec.ts`. This
  session recovered it: re-verified `tsc --noEmit`, `pnpm lint`, both primitives' browser-mode
  test suites (6/6 Switch, 9/9 Dropdown), the full `storybook` project (44/44, 0 axe violations
  across all 6 primitives), and `pnpm build-storybook`, before appending the missing Dropdown
  story IDs and committing each task atomically. No code changes were needed — the recovered work
  was correct as found.
- The visual-regression baseline capture step in Task 2's action ("dispatch the visual-baselines
  workflow, commit the returned artifact, confirm the CI visual job passes") could not be
  completed inside this isolated worktree — same limitation as plans 01-06/01-07 (no push/merge
  access from within the worktree). Logged as `WINDOWS.md` id 5 (kind `unrun-verify`) with the
  exact follow-up command for after merge.

## Known Stubs

None. Every behaviour this plan's `<behavior>` blocks specify is real, tested, and passing — no
placeholder data, no hardcoded empty states, no unwired props.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Switch` and `Dropdown` exist in the exact shape (Base UI wrapped, cva-driven where applicable,
  semantic-token-only, className-mergeable, behaviour-tested, axe-clean) that plan 01-09 (Modal,
  the final primitive) continues.
- Plan 01-14's theme toggle can now build directly on `Switch`'s `iconOn`/`iconOff` slots and its
  proven controlled-prop revert-on-failure behaviour.
- The board selector, column actions, and task-status surfaces in later phases can now be written
  against `Dropdown`'s locked-in compound API (`Root`/`Trigger`/`Content`/`Item`) instead of an
  options-array prop.
- **Blocker for `/gsd-ship` (or any `windows_enforce`-gated step):** four open `.planning/WINDOWS.md`
  entries — CI's visual job needs `visual-baselines.yml` dispatched once this worktree's code lands
  on `master` (id 5, new), the token pipeline's font-weight naming collision (id 2, pre-existing,
  out of this plan's scope), and the Node `/tmp` path-resolution tooling gotcha (id 3,
  pre-existing, environmental). None block this plan's own correctness.

## Self-Check: PASSED

All claimed files verified present on disk; both commit hashes (`9219379`, `04f668b`) verified
present in `git log --oneline --all`; all test/lint/build commands re-run and confirmed passing
during this recovery, not merely assumed from the interrupted session.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-11*
