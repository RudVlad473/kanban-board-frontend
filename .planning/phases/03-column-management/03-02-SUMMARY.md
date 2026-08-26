---
phase: 03-column-management
plan: 02
subsystem: ui
tags: [design-tokens, style-dictionary, dtcg, tailwind, css-custom-properties]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: The two-layer DTCG token pipeline (raw palette + per-theme semantic aliases), the `css-raw` transform group, and `tokens/style-dictionary.build.test.ts`'s `buildModeCss`/`buildFullCss` helpers
provides:
  - "`--color-accent-column-1|2|3` — the three decorative column-header dot accents, identical in both themes (U-03)"
  - "`--color-bg-column-add-from` / `--color-bg-column-add-to` — the ghost `+ New Column` gradient stops, theme-split"
  - "Pipeline assertions that all five tokens emit with the correct per-theme value"
affects: [03-column-management remaining plans, column-header rendering, ghost-column placeholder]

actuals:
  tokens: 6161
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decorative palette hues (cyan/violet/mint) live alongside the semantic greys in the raw layer, aliased through a new top-level `accent` semantic group"
    - "Gradient stops are stored pre-composited as flat hex, never as alpha, so the emitted value is directly assertable by a string match"

key-files:
  created: []
  modified:
    - tokens/color.tokens.json
    - tokens/color.light.tokens.json
    - tokens/color.dark.tokens.json
    - tokens/style-dictionary.build.test.ts
    - src/styles/tokens.css

key-decisions:
  - "Named the light gradient stops `blue.75` (#E9EFFA, top) and `blue.50` (#EEF3FC, bottom) rather than the plan's suggested 50/75 split, so the file's existing higher-number-is-darker invariant holds; the plan explicitly delegated raw key naming to the executor and the emitted custom-property names are unchanged."
  - "Recorded each new raw entry's PDF page and sampled pixel coordinate in its `$description` without restating the hex, so the value is falsifiable by re-rendering rather than self-referential."
  - "Used `#23242F` for the dark top stop as the plan's must-have and the UI-SPEC token table both specify, not the `#22232E` the UI-SPEC's evidence column notes as the raw sample."

patterns-established:
  - "Theme-identical semantic tokens are expressed as the same raw alias repeated in both theme files, not as a shared file — the pipeline has no third source and the duplication is what makes the identity assertable."

requirements-completed: []

coverage:
  - id: D1
    description: "The three column-dot accents emit as `--color-accent-column-1|2|3` with the identical hex in both the `@theme` and `.dark` scopes (U-03)"
    requirement: "COLUMN-03"
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#gives all three column-dot accents the identical hex in the @theme block and the .dark block (U-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two ghost-column gradient stops emit as `--color-bg-column-add-from`/`--color-bg-column-add-to` with distinct light and dark values under the same property names"
    requirement: "COLUMN-01"
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#resolves the two ghost-column gradient stops to a different hex per theme, unlike the column dots"
        status: pass
      - kind: other
        ref: "pnpm tokens:build && grep -n -- 'column-add' src/styles/tokens.css"
        status: pass
    human_judgment: false
  - id: D3
    description: "The five tokens are the only new color values introduced, and no existing token changed"
    verification:
      - kind: other
        ref: "git diff --stat 668afc8..HEAD — 5 files, 155 insertions, 0 deletions"
        status: pass
    human_judgment: false

# Metrics
duration: 15 min
completed: 2026-08-26
status: complete
---

# Phase 03 Plan 02: Column Tokens Summary

**Five UI-SPEC-authorized custom properties added through the existing two-layer DTCG pipeline — three theme-identical column-dot accents and two theme-split ghost-column gradient stops — each raw entry carrying the PDF page and pixel coordinate its value was sampled from.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-26T13:21:00Z (approx — worktree spawn)
- **Completed:** 2026-08-26T13:35:55Z
- **Tasks:** 2
- **Files modified:** 5 (4 sources + the tracked generated stylesheet)

## Accomplishments

- Seven raw palette entries added to `tokens/color.tokens.json`: `cyan.400` / `violet.400` / `mint.400` (the three dots), `blue.75` / `blue.50` (light gradient stops), `grey.750` / `grey.775` (dark gradient stops). Each `$description` names the PDF page (`p3` light, `p13` dark) and the sampled coordinate, plus what the value is for — never the hex itself.
- A new top-level `accent` semantic group in both theme files, aliasing the **same three** raw entries so U-03's "identical in both themes" fact is structural, not incidental.
- `bg.column-add-from` / `bg.column-add-to` added to the existing `bg` group in each theme file, pointing at the light and dark stop pairs respectively.
- Two new cases in `tokens/style-dictionary.build.test.ts` that pin the *facts* (theme-identical vs. theme-split), not merely the presence of the properties.

## Task Commits

1. **Task 1: Add the five tokens through the raw + semantic two-layer DTCG structure** — `991a175` (feat)
2. **Task 2: Assert the five tokens in the pipeline build test, both themes** — `ea79a68` (test)

_Task 2 is `tdd="true"` but produced a single `test(...)` commit: the plan deliberately sequences implementation (Task 1) before assertions (Task 2), so a conventional RED gate was not available. The non-vacuity check below stands in for it — see TDD Gate Compliance._

## Files Created/Modified

- `tokens/color.tokens.json` — seven new raw palette entries with evidence-carrying `$description`s
- `tokens/color.light.tokens.json` — new `accent` group (3 aliases) + 2 `bg` gradient-stop aliases
- `tokens/color.dark.tokens.json` — same `accent` group aliasing the same raw entries, + 2 dark gradient-stop aliases
- `tokens/style-dictionary.build.test.ts` — 2 new pipeline cases
- `src/styles/tokens.css` — regenerated (tracked artefact); +12 declarations per theme block

## Verification Performed

| Check | Result |
|-------|--------|
| `pnpm tokens:build` | exit 0 |
| `grep -c -- '--color-accent-column-1: #49C4E5' src/styles/tokens.css` | `2` (also `2` each for `-2: #8471F2` and `-3: #67E2AE`) |
| `--color-bg-column-add-from` | `#E9EFFA` in `@theme` (line 32), `#23242F` in `.dark` (line 111) |
| `--color-bg-column-add-to` | `#EEF3FC` in `@theme` (line 33), `#21222D` in `.dark` (line 112) |
| `pnpm exec vitest run --project tokens` | 8 passed (was 6 — the two new cases) |
| Non-vacuity: repoint `bg.column-add-to` dark alias to `{color.grey.700}` | 1 failed, 7 passed — assertion is real; alias restored and re-verified green |
| `pnpm format:check` | exit 0 |
| `pnpm comments:check` | exit 0 |
| `pnpm exec eslint tokens/` | clean |
| `git diff --stat <base>..HEAD` | exactly the 5 files above, 155 insertions, 0 deletions |

## TDD Gate Compliance

Task 2 carries `tdd="true"`, but the plan orders implementation (Task 1) ahead of assertions (Task 2), so the git log shows `feat(03-02)` → `test(03-02)` rather than the canonical RED → GREEN sequence. No RED gate commit exists and none was possible without contradicting the plan's own task order.

The plan anticipated this and substituted a non-vacuity acceptance criterion, which was executed: repointing `color.bg.column-add-to`'s dark alias from `{color.grey.775}` to `{color.grey.700}` made `pnpm exec vitest run --project tokens` fail on exactly the new case, proving the assertion is not tautological. The alias was restored via an editor round-trip (no `git checkout`/`git clean`) and the suite re-run green; `git diff` confirms no `grey.700` alias survives.

## Decisions Made

- **`blue.75` = `#E9EFFA` (top stop), `blue.50` = `#EEF3FC` (bottom stop)** — the plan's artifact list suggested `blue.50`/`blue.75` in the opposite assignment, but `color.tokens.json`'s grey ladder is strictly higher-number-is-darker (`100` = `#F4F7FD` … `900` = `#000112`), and `#EEF3FC` is the lighter of the two. The plan explicitly delegated raw key naming ("exact key names are the executor's choice within the file's existing `<hue>.<step>` convention"); the fixed contract — the five emitted custom-property names — is unchanged.
- **`grey.750` = `#23242F` (top), `grey.775` = `#21222D` (bottom)** — same invariant, and both sit between `grey.700` (`#2B2C37`) and `grey.800` (`#20212C`) as their step numbers imply.
- **New decorative hues placed after `grey`, before `white`** in the raw file; the `accent` semantic group placed first in each theme file, ahead of `bg`. Purely ordering; affects only the declaration order inside the generated blocks.
- **`#23242F` chosen for the dark top stop**, matching the UI-SPEC token table and the plan's must-have truth, rather than the `#22232E` the UI-SPEC's own evidence column records as the raw p13 sample. The table is the authoritative contract every later plan renders against, and the two differ by one unit per channel.

## Deviations from Plan

None — plan executed as written. The `blue.50`/`blue.75` assignment above is within the naming latitude the plan explicitly granted, not a deviation from it.

## Issues Encountered

Two pre-existing, out-of-scope failures were observed while running the plan's verification commands. Neither is caused by this plan (its entire diff is 5 token/CSS files), and per the executor scope boundary neither was fixed:

1. **`pnpm lint` exits 1** — 3 × `@typescript-eslint/no-unsafe-assignment` in `app/(dashboard)/boards/[boardId]/page.tsx` (lines 41, 61, 62). That file is byte-identical to the plan's base commit `668afc8` and was last touched by `56ada39` (phase 02-16). The plan's per-task acceptance criterion "`pnpm lint` exits 0" therefore cannot be satisfied from this plan's changes; `pnpm exec eslint tokens/` — the scoped equivalent — is clean.
2. **3 real-backend integration test files fail** under `pnpm test` — `delete-board.integration.test.ts`, `fetch-board-full.integration.test.ts`, `rename-board.integration.test.ts`, all failing in setup at `signUp` (`expect(response.ok).toBe(true)` → `false`) against the deployed nonprod backend. An environment/backend condition, unrelated to tokens. The plan's own scoped command (`--project tokens`) is fully green.

`deferred-items.md` was deliberately **not** created: this plan runs in wave 1 alongside sibling worktree agents, and a new shared file written from multiple branches produces an add/add conflict at merge. Both items are recorded here instead.

**Note on the plan's `pnpm test -- --project tokens` invocation:** under pnpm v11 the `--` form does not forward the flag — it runs the entire suite (936 tests, ~3.5 min). `pnpm exec vitest run --project tokens` was used instead and is what the results above reflect.

## Requirements

`requirements.ready-ids` reports **0/2** of `COLUMN-01`, `COLUMN-03` ready: both IDs are also declared by sibling plans in this phase that have no SUMMARY yet. `REQUIREMENTS.md` was therefore left untouched, and `requirements-completed` is empty. The IDs become markable when the last declaring plan in phase 03 finishes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Every later plan in phase 03 can now render the U-03 dots and the U-01 ghost column against real, tested custom properties in both themes:

- `--color-accent-column-1` / `-2` / `-3` — `bg-accent-column-1` etc. in Tailwind; must be `aria-hidden="true"` (purely decorative, per UI-SPEC § Color)
- `--color-bg-column-add-from` / `--color-bg-column-add-to` — usable as `bg-[linear-gradient(180deg,var(--color-bg-column-add-from)_0%,var(--color-bg-column-add-to)_100%)]`, and **must not** be layered over anything other than `--color-bg-app` (the stops are pre-composited against it)

No blockers. The `position % 3` mapping these three dots are assigned by (U-03) belongs in `features/boards/model.ts` and is another plan's work.

## Self-Check: PASSED

- `tokens/color.tokens.json`, `tokens/color.light.tokens.json`, `tokens/color.dark.tokens.json`, `tokens/style-dictionary.build.test.ts`, `src/styles/tokens.css` — all present on disk
- `991a175` and `ea79a68` both resolve in `git log`
- All five custom properties confirmed present in the generated stylesheet with the per-theme values above

---
*Phase: 03-column-management*
*Completed: 2026-08-26*
