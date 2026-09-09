---
phase: 01-foundation-auth-preferences
plan: 09
subsystem: ui
tags: [react, base-ui, tailwind, cva, tailwind-merge, vitest-browser, storybook, axe, design-tokens, playwright-visual]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (01-08)
    provides: Switch/Dropdown primitives establishing the sixth wrapper shape this plan's Modal
      continues, plus the compound-component and axe-clean conventions carried through
provides:
  - Modal compound component (Base UI Dialog composition wrapped as Root/Trigger/Content/Title/
    Description/Footer/Close) — the seventh and final design-system primitive
  - Human sign-off on the complete seven-primitive library against the Figma design-system page
  - Native-CSS-ellipsis truncation pattern for single-line text inputs (TextField), replacing the
    earlier DOM-overlay approach
  - Mobile-first CSS + dual mobile/desktop Storybook story coverage retrofitted onto all 7
    primitives (ADR tech/0010)
  - describeForEachDevice dual-viewport test-utility convention, applied to every primitive's
    whole test suite (ADR tech/0014)
  - Shared ClassNameProp trait type in src/types/ (ADR tech/0013)
  - Arrow-function-const style enforced project-wide (ADR tech/0015)
affects: [01-10, 01-11, 01-12, 01-13, 01-14, 01-15, ui, testing]

# Actuals (#2632)
actuals:
  tokens: n/a — spanned many executor sessions across checkpoint-review remediation; not tracked
    as a single run
  tasks: 2
  commits: 29

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TextField overflow truncation uses Tailwind's native `truncate` utility (overflow-hidden +
      text-overflow:ellipsis + whitespace-nowrap) directly on the input element, not a DOM overlay
      span — the ellipsis renders inside the input's own content box so it can never bleed over
      the border. `focus:text-clip` disables the ellipsis glyph specifically while focused, since
      text-overflow:ellipsis and native caret-follow scrolling render incorrectly together across
      browser engines when both are active — this was found and fixed as a live bug during
      checkpoint review, not designed in from the start."
    - "Firefox does not paint text-overflow:ellipsis on <input> elements at all (Mozilla Bugzilla
      #15154, WontFix, 20+ years open) — text still clips correctly at the border there, just
      without the \"…\" cue. Accepted as a known, permanent cross-browser cosmetic gap rather than
      reintroducing a DOM overlay just for Firefox parity."
    - "Dropdown's own trailing-edge overflow indicator (a DOM overlay span, not native ellipsis)
      was deliberately left untouched — it was already reviewed and approved, and the fix scope
      was kept to the flagged TextField bug only."
    - "Mobile-first CSS + dual mobile/desktop Storybook stories (ADR tech/0010), retrofitted onto
      all 7 primitives during checkpoint review, not just Modal."
    - "describeForEachDevice (src/test-utils/) now wraps every primitive's entire behavioural test
      suite, not just hand-picked assertions (ADR tech/0014)."
    - "Every function in the codebase is `export const foo = () => {}`, never a `function`
      declaration, enforced via eslint-plugin-prefer-arrow-functions + func-style (ADR tech/0015)."

key-files:
  created:
    - src/components/ui/modal/modal.tsx
    - src/components/ui/modal/modal.test.tsx
    - src/components/ui/modal/modal.stories.tsx
    - src/hooks/use-overflow-indicator.ts
    - src/hooks/use-overflow-indicator.test.tsx
    - src/lib/viewport-breakpoints.ts
    - src/test-utils/describe-for-each-device.ts
    - src/types/props.ts
  modified:
    - visual/primitives.visual.spec.ts (Modal's 5 stories + dual-viewport coverage for all 7
      primitives)
    - src/components/ui/{button,icon-button,checkbox,switch,text-field,dropdown}/* (mobile-first
      retrofit, ClassNameProp adoption, describeForEachDevice retrofit, arrow-function-const style)
    - .storybook/{main.ts,preview.ts,vitest.setup.ts} (mobile/desktop viewport configuration)
    - eslint.config.mjs (multiline-comment-style rule, prefer-arrow-functions + func-style)
    - .planning/WINDOWS.md (id 6 opened then fixed; ids 1/4/5 pre-existing, already fixed)
    - visual/__screenshots__/** (284 baseline PNGs — full 7-primitive library × light/dark ×
      mobile/desktop, replacing the prior 88-file set)

key-decisions:
  - "ADR tech/0010: mobile-first CSS + dual mobile/desktop Storybook story coverage, retrofitted
    onto all 7 primitives before continuing past this plan — user chose the largest-scope option
    when the mobile gap was raised during checkpoint review."
  - "ADR tech/0011: visual-regression baselines scoped to components/ui/ primitives only — feature
    components get behavioural/axe coverage but no CI screenshot baselines until a separate
    decision extends scope. Plans 01-12/01-14 amended accordingly."
  - "ADR tech/0012: enum-like constants declared as `const X = { KEY: \"KEY\" } as const` with a
    derived type, never TypeScript's native `enum`."
  - "ADR tech/0013: new src/types/ placement-rule destination; ClassNameProp extracted and
    retrofitted across 14 inline `{ className?: string }` occurrences."
  - "ADR tech/0014: every primitive's whole test suite runs at both viewports via
    describeForEachDevice, not just hand-picked assertions; new src/test-utils/ placement rule."
  - "ADR tech/0015: every function is an arrow-const, never a `function` declaration/expression,
    autofix-enforced."
  - "TextField's overflow indicator was rebuilt twice during checkpoint review after human-found
    bugs: round 9 replaced the DOM-overlay indicator (which bled over the input's border) with
    native CSS truncation; round 10 fixed a focus/caret-scroll rendering glitch in that native
    approach (`focus:text-clip`) and surfaced the Firefox no-ellipsis limitation as an accepted,
    unfixable-in-CSS gap rather than reverting to the overlay."
  - "SEED-001: animation library (Framer Motion) deferred to Phase 2+ polish — unrelated idea
    raised mid-session, not part of this plan's scope."

requirements-completed: [AUTH-01, AUTH-02, THEME-01]

coverage:
  - id: D1
    description: "A Modal traps focus while open, closes on Escape, and returns focus to whatever
      opened it; its content is inert to assistive technology while closed and announced as a
      dialog with an accessible name taken from its title."
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/modal/modal.test.tsx (open, focus trap, Escape, focus return,
          backdrop dismissal)"
        status: pass
      - kind: human
        ref: "Task 2 checkpoint — keyboard-only pass (Tab inside, cannot Tab out, Escape returns
          focus) confirmed by the user in Storybook"
        status: pass
    human_judgment: true
  - id: D2
    description: "All seven primitives — Button, IconButton, TextField, Checkbox, Switch,
      Dropdown, Modal — exist with a co-located browser-mode test (at both viewports), visual-only
      stories, an axe-clean result, and a visual-regression baseline in both mode scopes."
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "pnpm test:browser — 124/124 passing across 8 files (7 primitives + the overflow-
          indicator hook)"
        status: pass
      - kind: automated_ui
        ref: "pnpm test:a11y (Storybook/axe) — 50/50 passing, 0 violations"
        status: pass
      - kind: e2e
        ref: "Visual baselines workflow run 31583094912 (master) — 284 baseline PNGs generated
          and committed for all 7 primitives × light/dark × mobile/desktop"
        status: pass
    human_judgment: false
  - id: D3
    description: "A human compared the rendered primitives against the Figma design-system page
      and confirmed colour/theme, measured radius and shadow, button label size, error states, and
      keyboard-only operation read correctly — including two real bugs found and fixed during
      review (TextField overflow-indicator border bleed, then a focus/caret-scroll ellipsis
      glitch)."
    requirement: "THEME-01"
    verification:
      - kind: human
        ref: "Task 2 checkpoint (01-09-PLAN.md) — 10 rounds of review across this and prior
          sessions; final review confirmed \"satisfactory\""
        status: pass
    human_judgment: true
  - id: D4
    description: "No feature code consumed a primitive before all seven existed — the whole
      library was built ahead of the auth and theme work."
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "git history — no auth/theme feature files created before this plan's Modal commit"
        status: pass
    human_judgment: false

# Metrics
duration: n/a — spanned multiple checkpoint-review sessions with a human-verify gate between
  rounds, not a single continuous execution
completed: 2026-08-12
status: complete
---

# Phase 1 Plan 9: Modal Primitive & Design-System Library Sign-off Summary

**Modal — the seventh and final design-system primitive — plus a 10-round human checkpoint-review
loop that closes out the entire seven-primitive library: two real bugs found and fixed in
TextField's overflow handling, a mobile-first retrofit across all 7 primitives, and six new ADRs
recording conventions the review surfaced.**

## Performance

- **Duration:** n/a — this plan ran as a long checkpoint-review loop across multiple sessions, not
  a single continuous execution. Task 1 (Modal) was straightforward; Task 2 (the human-verify
  checkpoint) took 10 rounds of fix-and-re-review before sign-off.
- **Completed:** 2026-08-12
- **Tasks:** 2 (Task 1 Modal, Task 2 design-system sign-off)
- **Commits:** 29 (rebased onto master at merge; see `git log 7b41f4d..3e43f5d` for the full list)

## Accomplishments

- `Modal` compound component: Base UI `Dialog` composition wrapped as
  `Root`/`Trigger`/`Content`/`Title`/`Description`/`Footer`/`Close`, focus trapping, scroll
  locking, focus restoration and accessible naming all delegated to Base UI, zero hand-rolled
  focus-management code.
- Full seven-primitive design-system library (Button, IconButton, TextField, Checkbox, Switch,
  Dropdown, Modal) signed off by the user against the Figma design-system page — colour/theme,
  measured radius/shadow, button label size, error states, and keyboard-only operation all
  confirmed.
- Two real TextField bugs found and fixed during review:
  1. The overflow indicator (a DOM-overlay `<span>`) bled over the input's own border — replaced
     with native CSS `truncate`.
  2. That native-CSS replacement then went blank with a stray "…" while focused, due to a
     cross-browser conflict between `text-overflow:ellipsis` and native caret-follow scrolling —
     fixed with `focus:text-clip`. Separately confirmed Firefox never paints the ellipsis glyph on
     `<input>` at all (Mozilla Bugzilla #15154, WontFix) and got explicit user sign-off to accept
     that as a permanent, CSS-unfixable cosmetic gap.
- Mobile-first CSS + dual mobile/desktop Storybook story coverage retrofitted onto all 7
  primitives (ADR tech/0010), driven by Playwright for visual capture rather than duplicated
  story exports.
- `describeForEachDevice` dual-viewport test utility built and applied to every primitive's entire
  test suite, not just hand-picked assertions (ADR tech/0014).
- Shared `ClassNameProp` trait type extracted to `src/types/`, retrofitted across 14 call sites
  (ADR tech/0013).
- Arrow-function-const style enforced project-wide via ESLint autofix (ADR tech/0015).
- 284 visual-regression baseline PNGs generated via the `visual-baselines.yml` CI workflow
  (run `31583094912`) and committed — full coverage for all 7 primitives × light/dark ×
  mobile/desktop.

## Task Commits

Task 1 (Modal) and Task 2 (checkpoint remediation) were executed across many atomic commits,
rebased onto master at merge time. Key commits (see `git log 7b41f4d..3e43f5d --oneline` for the
complete 29-commit list):

1. **Task 1: Modal compound component** — `d5e1bf7` (feat)
2. Bug fixes found during checkpoint review — `6a560c2`, `2f95079`, `8730adf`, `b729688`,
   `776ccd3`, `b31e11f`
3. Mobile-first retrofit (ADR tech/0010) — `da64d2e` through `2acd295`/`d557616`/`537ac46`
4. Test/lint convention commits (ADRs 0013/0014/0015) — `9d84820`, `77b6c94`, `13aa204`,
   `177fa9e`, `f6311be`
5. TextField overflow-indicator fixes (round 9, round 10) — `e8d4e4e`, `3e43f5d`

**Plan metadata + SUMMARY:** committed alongside STATE.md/ROADMAP.md updates (see final commit
below)

## Files Created/Modified

See `key-files` in frontmatter above — 8 new files, plus mobile-first/convention retrofits
touching all 6 previously-shipped primitives, Storybook config, ESLint config, and 284 new/
replaced visual baseline PNGs.

## Decisions Made

See `key-decisions` in frontmatter above — 6 new ADRs (tech/0010–0015), the visual-regression
scope decision, and the TextField overflow-indicator rebuild.

## Deviations from Plan

- **Scope grew substantially beyond the plan's original Task 2 checkpoint.** What the plan
  specified as a straightforward human sign-off turned into 10 rounds of fix-and-re-review: 7
  visual/behavioural bugs across Button, Checkbox, Modal, Dropdown, and TextField; a full
  mobile-first retrofit; and 6 new standing conventions (ADRs 0010–0015). Each round was scoped
  to what the human actually flagged — no speculative unrequested changes (e.g. Dropdown's own
  overflow indicator was left untouched despite a structurally similar pattern to TextField's,
  since it was not flagged and was already approved).
- **TextField's overflow-indicator implementation changed direction twice mid-review** (DOM
  overlay → native CSS ellipsis → native CSS ellipsis with a focus-state fix), each time in
  response to a real bug the human found in Storybook, not a deviation initiated by the executor.

## Issues Encountered

- **Firefox's `text-overflow: ellipsis` limitation on `<input>` elements** (Mozilla Bugzilla
  #15154) is not fixable in CSS and was explicitly accepted by the user as a permanent gap rather
  than reintroducing DOM-overlay complexity. Documented in `tech-stack.patterns` above for any
  future primitive that needs single-line truncation.
- **A stray `node scripts/serve-static.mjs` process** from one round's Playwright-based visual
  repro was left running after that session ended, blocking worktree directory removal at merge
  time (`Filename too long` / file-in-use errors on Windows). Killed manually before cleanup could
  complete; no code impact, but a reminder that background dev-server processes spawned during
  verification need explicit teardown, not just a report that they were killed.
- **`git worktree remove` failed on Windows with "Filename too long"** even after the process
  above was killed, due to deeply nested `node_modules` paths exceeding `MAX_PATH`. Worked around
  via a `robocopy /MIR` against an empty directory (a standard Windows long-path workaround) before
  `Remove-Item`.

## Known Stubs

None. Every behaviour this plan's `<behavior>` blocks specify is real, tested, and passing.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The complete seven-primitive design-system library exists, is signed off, and is ready for
  feature work to consume — no auth, mock-backend, or theme code was written against any primitive
  before this plan closed.
- Wave 10 (mock backend, `01-10`) is unblocked.
- `.planning/WINDOWS.md` id 6 (Modal visual-baselines) is fixed; open items are id 2 (font-weight
  token pipeline collision) and id 3 (Node `/tmp` path-resolution gotcha), both pre-existing,
  environmental, and out of this plan's scope.
- One still-open side item (not blocking): a documented-but-unfixed guardrail gap in
  `visual-baselines.yml` (no branch restriction, no diff-before-commit review step) — tracked in
  `.planning/todos/pending/2026-08-11-guard-visual-baselines-dispatch-against-corrupting-screensho.md`,
  left pending by explicit user choice during this session.

## Self-Check: PASSED

All claimed files verified present on disk; commit range `7b41f4d..3e43f5d` verified present in
`git log --oneline`; `tsc --noEmit`, `pnpm lint`, `pnpm format:check`, `pnpm test:browser`
(124/124), `pnpm test:unit` (4/4), `pnpm test:a11y` (50/50, 0 violations), and
`pnpm build-storybook` all re-run and confirmed passing on the rebased tree immediately before the
fast-forward merge to master — not merely assumed from earlier rounds. Visual-baselines workflow
run `31583094912` confirmed `completed`/`success` via `gh run view` before downloading and
committing its artifact.

## Addendum — 02.1-11 comment-length sweep (backfilled rationale)

Two implementation decisions from this plan's checkpoint-review round were carried in `modal.tsx`/
`dropdown.tsx`'s own inline comments rather than narrated here at the time; backfilled now so both
files' comments can point at this SUMMARY instead of restating them in full:

- **Silhouette/scroll split (Modal's `Dialog.Popup`, Dropdown's `Select.Popup`):** the rounded/
  shadowed silhouette and the scrollable region are deliberately on two different elements in both
  primitives. Putting `overflow-y-auto` directly on the rounded/shadowed element let the native
  scrollbar and the scrolled content's edge render outside the rounded corners once content
  actually scrolled (Modal's `LongContent` story surfaced this). Dropdown's `Select.Popup` carries
  `role="listbox"`, which per ARIA requires its children to be `option` roles directly — wrapping
  the options in a plain scroll `<div>` between the listbox and its items would violate that (axe
  `aria-required-children`), so Dropdown's listbox itself stays the scrollable element while a
  plain outer `<div>` (no ARIA role) owns the silhouette; Modal has no such role constraint on
  `Dialog.Popup`, so its outer element owns both silhouette and clip, with an inner `div` scrolling.
- **Dropdown item corner rounding (`first:`/`last:`):** the popup insets its items by `p-1` (4px)
  from its own `rounded-md` (24px) edge — small enough that a square-cornered highlight on the
  first/last item still visibly pokes past that large a corner radius. Scoping the rounded
  highlight to `first:`/`last:` keeps the fix to the item actually touching the popup's curve;
  middle items' highlights stay square, matching the popup's own straight side edges.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-12*
