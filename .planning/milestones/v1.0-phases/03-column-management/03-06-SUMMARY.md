---
phase: 03-column-management
plan: 06
subsystem: ui
tags: [storybook, vitest, tailwind, design-tokens, accessibility]

# Dependency graph
requires:
  - phase: 03-column-management
    provides: "plan 03-02's --color-accent-column-{1,2,3} tokens; plan 03-04's toColumnDotToken and the shipped toColumnCaption; plan 03-05's BoardView container and its board-view stories/test pair"
  - phase: 02-board-crud
    provides: "board-card.tsx's token-typography + truncate-beside-a-non-shrinking-sibling shape; delete-board-confirm's stories/test pair shape; createColumnFull/createColumnsFull/createTasksFull"
provides:
  - "ColumnHeader — the presentational per-column header carrying U-03's position-cycled decorative dot beside the shipped caption"
  - "column-header.{stories,test}.tsx — six named stories and eight composed-story cases covering dot cycling, caption composition, the zero-task column and the 32-character name"
  - "board-view.tsx renders one ColumnHeader per column, so 03-08/03-09/03-10 each add one affordance to a covered component instead of re-cutting the board's markup"
  - "board-view.stories.tsx's EvenlyCycledColumns — a four-column board staging the accent cycle wrapping at position 3"
affects: [03-08, 03-09, 03-10]

actuals:
  tokens: 9800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A caption split into a truncating half and a non-shrinking half by slicing the shipped caption function's own output, so the format stays owned by one function"
    - "A decorative aria-hidden span whose only variable is a whole literal utility class selected by a pure model function"
    - "A flex row nested inside the h2 as a <span>, so the 44px touch tier is the row's height rather than the heading's padding box"

key-files:
  created:
    - src/features/boards/components/column-header.tsx
    - src/features/boards/components/column-header.stories.tsx
    - src/features/boards/components/column-header.test.tsx
  modified:
    - src/features/boards/components/board-view.tsx
    - src/features/boards/components/board-view.stories.tsx
    - src/features/boards/components/board-view.test.tsx

key-decisions:
  - "The 44px tier sits on a <span className='flex min-h-11'> nested inside the h2, not on the h2 itself — Tailwind's border-box sizing would otherwise let the shipped pb-6 eat 24px of the 44px, leaving a 20px visible row and making the header shorter than UI-SPEC's stated height rather than taller"
  - "The count half is cut from toColumnCaption's own return value (caption.slice(column.name.length)) rather than re-formatted as ' (N)' — one call site, one format owner, and the header's full text is the caption by construction"
  - "The dot is size-4 (16px, the --space-4 tier); UI-SPEC gives the dot no size, and 16px is the nearest scale tier to the PDF's ~15px dot without reaching for the barred 12px"
  - "The section's tabIndex={0} stays, as the plan directs — its comment was reworded to name the exact condition that ends it (03-08's kebab) rather than restating why it exists"

patterns-established:
  - "Extract-then-expand for the column header: the file is created once with the piece that has a purpose today, so the three later affordance plans make small increments to a tested component"
  - "Dot-cycling asserted by reading the accent utility off the aria-hidden element, at the component level and again across a four-column board"

requirements-completed: []

coverage:
  - id: D1
    description: "U-03 holds: a column's dot carries the accent for position % 3, cycling back to the first at position 3"
    requirement: "COLUMN-02"
    verification:
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > carries the first column accent on the dot of a column at position 0"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > carries the second column accent at position 1"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > carries the third column accent at position 2"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > cycles back to the first column accent at position 3"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > cycles the column header dots across the three accents and repeats on the fourth"
        status: pass
    human_judgment: false
  - id: D2
    description: "The dot is decorative: it contributes nothing to the header's accessible name, which reads exactly what toColumnCaption composes"
    verification:
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > reads as the composed caption alone, with the dot contributing no accessible text"
        status: pass
      - kind: a11y
        ref: "pnpm test:a11y — 159 passed across 28 files, no axe violation and no contrast finding on the three accents"
        status: pass
    human_judgment: false
  - id: D3
    description: "UI-SPEC empty/column-with-0-tasks: a zero-task column shows its dot and its (0) caption over an empty body, with no per-column empty copy and no add-a-task control"
    verification:
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > renders a zero count and no add-a-task control for a column holding no tasks"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > renders a zero count and no task cards for a column holding no tasks"
        status: pass
    human_judgment: false
  - id: D4
    description: "UI-SPEC overflow/long-column-name: a 32-character name truncates while the (N) count renders in full as a separate non-shrinking element"
    verification:
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > truncates a 32-character name while rendering the count in full beside it"
        status: pass
    human_judgment: false
    rationale: "Asserted against real layout — getComputedStyle's textOverflow plus scrollWidth/clientWidth in real Chromium, not a class-name check. Whether the truncation READS correctly at 280px in both themes is a visual judgement; see Outstanding."
  - id: D5
    description: "The heading keeps the board-column-{id} id, so each column section's aria-labelledby still resolves to its own header"
    verification:
      - kind: browser
        ref: "src/features/boards/components/column-header.test.tsx#ColumnHeader > keeps the id the column section's aria-labelledby points at"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > keeps every column section labelled by its own header"
        status: pass
    human_judgment: false
  - id: D6
    description: "The ghost column is still the last child of the horizontal scroll row, after every column header"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > keeps the ghost column last in the scroll row, after every column header"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > renders the ghost column as the last child of the horizontal scroll row"
        status: pass
    human_judgment: false
  - id: D7
    description: "T-03-23/T-03-24/T-03-25: no class name is assembled from a backend value, the column name is rendered as escaped text with no title/aria-label built by concatenation, and a pathological name cannot push the count out of the header"
    verification:
      - kind: other
        ref: "toColumnDotToken selects one of three whole literals by position % 3; the name is a text child only — grep for dangerouslySetInnerHTML/title=/aria-label= in column-header.tsx returns nothing; D4's truncation case is T-03-25's assertion"
        status: pass
    human_judgment: false
  - id: D8
    description: "The dot never becomes a carrier of column meaning, state or status (the plan's one minted prohibition)"
    verification:
      - kind: other
        ref: "Judgment: the dot's only input is position, it is aria-hidden, and it renders no text — nothing in this plan can encode state in it"
        status: pass
    human_judgment: true
    rationale: "A prohibition on FUTURE work as much as on this plan's. It holds today by construction; it stays holding only if 03-08/03-09/03-10 resist reaching for hue to signal pending/conflict state."

# Metrics
duration: 12min
completed: 2026-08-26
status: complete
---

# Phase 3 Plan 06: ColumnHeader and the Position-Cycled Dot Summary

**The column header is now its own tested component carrying U-03's `position % 3` accent dot, so the three affordances still to come (kebab/rename, delete, drag handle) each extend a covered file instead of re-cutting `board-view.tsx`'s markup three more times.**

## Performance

- **Duration:** 12 min
- **Tasks:** 2
- **Files created/modified:** 6
- **Commits:** 2

## Accomplishments

- **The three column-accent tokens plan 03-02 added are in live use for the first time.** `toColumnDotToken({ position })` selects one of three whole literal utilities; nothing is assembled by interpolation, so Tailwind's source scanner sees all three spelled out (T-03-23).
- **The dot cycle is asserted twice, at two levels** — per-position on the component, and across a four-column board where the wrap at position 3 is what the assertion is actually about. The board-level case reads the accent utility off each of the four dots in DOM order and compares the whole array, so a mis-ordered or mis-derived hue fails rather than a single spot check passing.
- **The caption is not re-derived.** `toColumnCaption` is called exactly once and the count half is `caption.slice(column.name.length)`. The header's full text is therefore the caption by construction rather than by two implementations agreeing — and the name half can truncate without the count ever doing so.
- **Truncation is proved against real layout, not against a class name.** The 32-character case reads `getComputedStyle(name).textOverflow === "ellipsis"` and `scrollWidth > clientWidth` in real Chromium at the shipped 280px width, then asserts the count element is *not* overflowing.
- **`board-view.tsx` lost the heading markup rather than duplicating it** — `grep -c 'font-heading-s'` returns 0 there, and the section kept its `key`, `aria-labelledby`, width, overflow classes and focus ring untouched.
- **No axe regression:** `pnpm test:a11y` is 159 passed across 28 files. The six new stories add no violation, and the decorative dot raises no contrast finding — which is the point of `aria-hidden` on it.

## Task Commits

1. **Task 1: ColumnHeader with the position-cycled decorative dot** — `da7a15b` (feat)
2. **Task 2: Render ColumnHeader from the board container** — `9e1bda4` (feat)

## Files Created/Modified

- `src/features/boards/components/column-header.tsx` — the presentational header: `sticky top-0 bg-bg-app pb-6` heading, a nested 44px flex row holding the `aria-hidden` dot, the truncating name and the non-shrinking count
- `src/features/boards/components/column-header.stories.tsx` — `Default`, `SecondPosition`, `ThirdPosition`, `FourthPositionCyclesBack`, `NoTasks`, `LongColumnName`, under a `w-70` decorator so truncation is reachable
- `src/features/boards/components/column-header.test.tsx` — eight composed-story cases (16 across both devices)
- `src/features/boards/components/board-view.tsx` — the inline `h2` block replaced by `<ColumnHeader column={column} />`; `toColumnCaption` import dropped
- `src/features/boards/components/board-view.stories.tsx` — new `EvenlyCycledColumns` story
- `src/features/boards/components/board-view.test.tsx` — three new cases (dot cycle, per-section labelling, ghost column after every header)

## Decisions Made

- **The 44px tier went on a `<span className="flex min-h-11">` nested inside the `h2`, not on the `h2` itself.** Tailwind sizes border-box, so `min-h-11` on the heading would have been eaten 24px-deep by the shipped `pb-6`, leaving a ~20px visible row — the opposite of UI-SPEC's "the column header row's min-height is 44px". A `<span>` (not a `<div>`) because `h2`'s content model is phrasing content. When 03-08 puts a 44px kebab in this row it exceeds the floor rather than fighting the padding.
- **The count half is sliced off the caption rather than re-formatted.** `caption.slice(column.name.length)` yields `" (4)"` from the function that owns the format. Writing `` ` (${String(count)})` `` inline would have been a second source of truth for the format, which is exactly what the plan's "do not re-derive" line bars.
- **The dot is `size-4` (16px).** UI-SPEC specifies the dot's colours and its decorative status but not its diameter; the PDF's dot measures ~15px, and 16px is the nearest tier on the 4px scale. 12px was available and deliberately not used — UI-SPEC bars new `--space-3` usage.
- **The section's `tabIndex={0}` stays**, per the plan's explicit instruction. Its comment was reworded to name the condition that ends it (03-08's kebab) instead of only restating why it exists, so the next reader is told when to remove it rather than having to re-derive that from RESEARCH Pitfall 10.

## Deviations from Plan

None affecting behaviour — the plan executed as written. Two acceptance criteria are worded in a way that cannot literally hold; both are wording artifacts of the same kind plan 03-05 recorded for `verifySession`.

### Acceptance-criterion wording artifacts (no code change)

- **`grep -c 'toColumnDotToken' column-header.tsx` returns 2, not the criterion's 1**, and likewise **`grep -c 'toColumnCaption'` returns 2.** Both symbols appear on the `import` line and on their single call site, and `grep -c` counts matching *lines*. The substantive half of each criterion — "used once, the format/mapping is not re-derived" — holds exactly: one call site each, verified by `grep -n`. Making the count literally 1 would require not importing the function, which is the opposite of what the criterion is protecting.
- The other four greps hold verbatim: `aria-hidden="true"` → 1, `truncate` → 1, `font-(bold|medium|semibold)` → 0, and in `board-view.tsx` `ColumnHeader` → 2, `font-heading-s` → 0, `aria-labelledby` → 1.

## TDD Gate Compliance

Both tasks are `tdd="true"`; both RED gates were **run and observed failing** before the implementing code existed.

| Task | RED failures observed | GREEN result |
|------|----------------------|--------------|
| 1 | Suite failed to import, 0 tests collected — `./column-header` did not exist | 16 passed |
| 2 | 4 failed / 22 passed — the dot-cycle case and the header-before-ghost case, at both devices | 26 passed |

**No separate `test(...)` commit exists**, for the structural reason plans 03-04 and 03-05 already recorded: the repo's `husky` pre-commit hook runs type-aware `eslint --fix` over staged files, and a test importing a not-yet-existing export produces 40+ `no-unsafe-*` errors. Committing RED would require `--no-verify`, which this executor is forbidden to pass. Each task therefore landed as one `feat(...)` commit containing the already-failing test plus the code that turns it green, with the RED evidence recorded above and in each commit body.

**One honest qualification on Task 2's RED.** Its third case — "keeps every column section labelled by its own header" — passed before the change as well as after. That is inherent to what it asserts: it is the *unchanged-behaviour* guard the plan asked for ("the section's accessible name is unchanged"), so a test that went red would have meant the assertion was wrong, not that the guard was working. The two cases that genuinely could not pass before the refactor did go red.

## Verification Run

| Gate | Result |
|------|--------|
| `pnpm test` (all five Vitest projects) | 1026 passed / 81 files |
| `pnpm test:a11y` | 159 passed / 28 files, no axe violation |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint`, `pnpm format:check` | clean |
| `pnpm tsx:check`, `stories:check`, `renders:check`, `comments:check` | all pass |
| `pnpm build` | compiles, all 8 routes prerender |

Baseline for comparison: plan 03-05 finished at 997 tests / 79 files and 151 a11y tests.

## Outstanding — needs human eyes

**Not verified through the running app.** This project's `CLAUDE.md` requires driving UI changes through the dev server with the headless Playwright MCP before reporting them. **No Playwright MCP tools resolve in this executor's tool set** (neither `mcp__playwright__*` nor the plugin variant), so this was impossible here rather than skipped, and writing a throwaway browser script instead is what the same instruction forbids. Everything above is test-, type- and build-level evidence, gathered in real Chromium via Browser Mode but not against the running app. These are the visual judgements nothing here has looked at:

1. **The three dot hues against PDF p3/p13** at both themes, and whether 16px reads as the PDF's dot beside 12px uppercase text. Storybook's `ColumnHeader` `Default`/`SecondPosition`/`ThirdPosition` and `BoardView` `EvenlyCycledColumns` are the places to look.
2. **The header row's proportions** — the 44px row above `pb-6`, the 4px dot-to-caption gap, and whether the sticky header still reads correctly with rows scrolling under it now that the row is taller than the bare caption was.
3. **The truncation at 280px** with a real 32-character name: that the ellipsis lands on the name and the `(N)` stays fully legible at the right, in both themes.

## Known Stubs

None. No placeholder value, no dead control, and no skipped test was introduced — the zero-task column deliberately renders *no* add-a-task affordance, which is an omission the tests assert rather than a stub.

## Next Phase Readiness

- **`column-header.tsx` is the file 03-08, 03-09 and 03-10 each extend.** The kebab (03-08) goes in as a sibling of the caption row inside the `h2`'s flex row; the rename/delete menu items follow it; the drag handle wraps the caption half.
- **The section's `tabIndex={0}` is 03-08's to remove**, in the same commit that introduces the kebab — its in-code comment now says so explicitly. Removing it before then reopens axe's `scrollable-region-focusable` on every column.
- **`ColumnHeader` takes only `column` today.** The later plans will widen `Props`; because it calls no hook and owns no state, they can keep driving it with real functions rather than module mocks (ADR tech/0020).
- No new dependency, nothing installed, no token added — the five tokens this phase is authorised to add all landed in 03-02.

## Self-Check: PASSED

All 3 created files and 3 modified files exist on disk; both task commits (`da7a15b`, `9e1bda4`) resolve in `git log`; `git diff --diff-filter=D` across both commits reports no deletions; the working tree is clean.

---

_Phase: 03-column-management_
_Completed: 2026-08-26_
