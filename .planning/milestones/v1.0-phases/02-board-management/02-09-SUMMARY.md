---
phase: 02-board-management
plan: 09
subsystem: boards
tags: [sidebar, layout, responsive, e2e, real-backend, accessibility]

requires:
  - phase: 02-board-management
    provides: "02-08's board data spine (Route Handler -> boardsApi -> loadBoards() -> RSC props) and the tracer sidebar this plan splits into chrome + BoardList."
provides:
  - "BOARD-06: sidebar collapse/expand, ephemeral React state (DEFAULTS.md C-009), reachable expand control at every viewport."
  - "Sidebar chrome (brand mark, pinned foot controls) split from BoardList (RSC-fed board list), so chrome paints immediately while the list streams behind Suspense/BoardListSkeleton."
  - "BoardList moved into the boards feature folder — the panel's board-list region is the only part of the panel that scrolls, independent of chrome."
  - "Recorded Task 1 decision: Option B (overlay-later) for sub-768px sidebar behaviour, deferred to plan 02-11 alongside the board-title trigger it depends on."
  - "Task 4 human sign-off evidence for all 8 checkpoint observations, re-verified against a freshly seeded 15-board account via headless Chrome DevTools MCP."
affects: [02-10, 02-11, 02-12, 02-13]

actuals:
  tokens: 8500
  tasks: 1
  commits: 1

tech-stack:
  added: [chrome-devtools-mcp CLI (dev-machine global install, browser verification tooling only — not a project dependency)]
  patterns:
    - "Sidebar panel pinned to h-dvh (not h-full) so the board-list region has a real height bound to scroll within, independent of the page's own growing ancestor chain (BUG A fix)."
    - "Chrome (brand mark + pinned foot controls) renders synchronously outside the Suspense boundary; only the async board-list fetch (SidebarBoards) sits inside it, so the panel shell never waits on data."

key-files:
  created: []
  modified:
    - src/components/layout/sidebar/sidebar.tsx
    - .planning/phases/02-board-management/02-UI-SPEC.md

key-decisions:
  - "Task 1 (sub-768px behaviour): Option B — PDF-faithful overlay, built in plan 02-11 alongside the board-title trigger it hangs from. Below 768px the fixed 300px panel stays as-is until 02-11 lands; this plan's collapse control is desktop-shaped in the interim, a disclosed and accepted consequence."
  - "BUG A (board list not scrolling independently, violating this plan's own must_have) — root cause was `h-full` on the nav panel resolving against an ancestor chain with no hard viewport bound. Fixed by pinning the panel to `h-dvh`. Re-verified headless: at a 600px viewport with 15 seeded boards, the board-list div overflows (scrollHeight 772 vs clientHeight 294) while the brand mark and pinned foot controls stay fixed in place before and after scrolling the list 300px."
  - "BUG B (real horizontal page overflow at 375px, expanded state only — scrollWidth 426 vs clientWidth 375) is the foreseeable, disclosed consequence of the Option B decision: the fixed-width desktop panel has no mobile-overlay treatment until 02-11 lands. Accepted as a temporary limitation, NOT fixed here. Re-verified unchanged: present in the expanded state, absent in the collapsed state (375 == 375), matching the prior finding exactly — not a new or worsened regression."
  - "8a (theme toggle lives inside the panel, disappears when collapsed): kept as-is per explicit user decision — matches 02-UI-SPEC as written, no code or spec change."
  - "8b (floating 'Show Sidebar' control keeps the accent colour): kept the accent (faithful to the design PDF) and amended 02-UI-SPEC's accent-reservation list to include it as entry 5 — implementation and spec now agree."

duration: ~50 minutes (Task 4 re-verification + acceptance criteria only; Tasks 1-3 executed in a prior session)
completed: 2026-08-22
status: complete
---

# Phase 02 Plan 09: Sidebar Chrome and Collapse Behaviour Summary

**BOARD-06 delivered — a collapsible sidebar with brand mark, independently-scrolling board list, and pinned foot controls, split from the boards feature's `BoardList`; Task 4's human sign-off re-verified all 8 checkpoint observations headlessly via Chrome DevTools MCP against a freshly seeded 15-board account, confirming the BUG A scroll fix holds and the BUG B mobile-overflow limitation is unchanged and still accepted.**

## Performance
- **Tasks:** 4 total (1 checkpoint:decision, 1 tracer, 1 auto/tdd, 1 checkpoint:human-verify)
- **Commits this session:** 1 (Task 4 sign-off SUMMARY; BUG A fix and 8b spec amendment were already committed in a prior session — `a344662`, `2cbbe76`)
- **Files modified this session:** 0 (verification-only; scratch files removed, no tracked files touched)

## Accomplishments
- Split the tracer sidebar into `Sidebar` (chrome: brand mark, pinned foot controls, collapse state) and `BoardList` (RSC-fed board list, moved into the boards feature folder), so the panel shell paints immediately while the list streams in behind `Suspense`/`BoardListSkeleton`.
- Recorded Task 1's decision: Option B (overlay-later) for sub-768px behaviour — the PDF-faithful overlay lands in plan 02-11 alongside the board-title trigger it depends on, not duplicated here.
- Fixed BUG A: the nav panel's `h-full` never gave the board-list region a real height bound (resolved against an ancestor chain that grows to fit content), letting the pinned foot controls slide below the fold at short viewport heights. Pinned to `h-dvh` instead.
- Resolved both Task 4 checkpoint decisions: 8a (theme toggle inside the panel, kept as-is) and 8b (floating Show Sidebar control keeps the accent colour; 02-UI-SPEC's accent-reservation list amended to include it).
- Re-verified all 8 checkpoint observations in this session via headless Chrome DevTools MCP against the real dev server and a freshly seeded 15-board account (see Verification Evidence below).

## Task Commits
1. **Task 1: Decide sub-768px behaviour** — checkpoint:decision, resolved as Option B (overlay-later), recorded above.
2. **Task 2: End-to-end "hide and show the sidebar"** — `4e276a4` feat(02-09): split sidebar chrome from BoardList, wire collapse/expand (BOARD-06).
3. **Task 3: Responsive/e2e coverage** — `26b4f08` test(02-09): prove BOARD-06 responsive/e2e behavior for the Option B decision.
4. **Task 4: Sign off the sidebar chrome and collapse behaviour** — checkpoint:human-verify.
   - `a344662` fix(02-09): make sidebar board list scroll independently (BUG A fix), landed during a prior session's Task 4 review cycle.
   - `2cbbe76` docs(02-09): add Show Sidebar control to accent-reservation list (8b), landed during a prior session's Task 4 review cycle.
   - This session: re-verified all 8 checkpoint observations from a clean headless browser session, ran the full acceptance-criteria suite, removed two leftover scratch verification scripts, and closed out the checkpoint with this SUMMARY.

## Verification Evidence (Task 4, this session)

Signed in against the real deployed nonprod backend with a freshly seeded throwaway account (15 boards, seeded via `e2e/seed.sh`), driven headlessly through `chrome-devtools-mcp` (Chrome DevTools MCP CLI) against `http://localhost:3000`.

1. **Chrome layout** — confirmed: `nav[aria-label="Boards"]` contains the brand mark ("kanban") at top, the board list caption + 15 board links in the middle, and the theme toggle plus "Hide Sidebar" pinned at the foot.
2. **Independent scroll (BUG A re-verify)** — at a 1280x600 viewport: the board-list `div.overflow-y-auto` overflows (`scrollHeight` 772 vs `clientHeight` 294); after programmatically scrolling that div 300px, the brand mark (`top: 24`) and the pinned foot controls (`bottom: 576`, within a 600px viewport) stayed exactly in place. Confirmed both by DOM measurement and screenshot. **BUG A fix holds.**
3. **Hide/Show Sidebar round trip** — clicking "Hide Sidebar" collapsed the panel; `main`'s width grew from 980px to the full 1280px viewport width; the floating "Show Sidebar" control (accent-colored) appeared at the bottom-left and, when clicked, restored the full panel.
4. **Collapse state not persisted** — collapsed the sidebar, then reloaded the page: the sidebar returned expanded ("Hide Sidebar" visible again, not "Show Sidebar"). Correct per DEFAULTS.md C-009, not a bug.
5. **First-paint chrome / no jump** — confirmed architecturally via source: `app/(dashboard)/layout.tsx` renders `Sidebar` (chrome) synchronously and wraps only `SidebarBoards` (the async `loadBoards()` call) in `<Suspense fallback={<BoardListSkeleton />}>`, so the brand mark and pinned foot controls never wait on the list fetch. `BoardListSkeleton` reserves the same layout footprint (heading text + `flex-1 overflow-y-auto` region with fixed-height skeleton rows) as the real `BoardList`. Could not capture the transient fallback frame live in this headless session — the real nonprod backend resolved `loadBoards()` server-side faster than the network throttle could act on the already-streamed HTML — but `pnpm test:browser -- sidebar` deterministically exercises `BoardListSkeleton` at the component level regardless of network timing.
6. **375px viewport (BUG B, expected/accepted)** — expanded state: `document.documentElement.scrollWidth` (426) exceeds `clientWidth` (375), a 51px horizontal overflow — this IS the known, disclosed BUG B limitation from the Option B decision (mobile overlay deferred to plan 02-11), confirmed present and **unchanged**, not worsened. Collapsed state at 375px: no overflow (`scrollWidth` == `clientWidth` == 375) — the fixed-width panel is what causes the overflow, so removing it removes the overflow too. **This is expected and accepted, not a regression or a new failure.**
7. **Both themes** — toggled dark mode: sidebar chrome (brand mark, board list, pinned controls), header, and main content all rendered with correct dark-theme contrast; toggled back to light without issue.
8. **8a/8b decisions** — 8a: theme toggle stays inside the panel and disappears when collapsed, kept as-is per user decision (matches 02-UI-SPEC as written). 8b: floating Show Sidebar control keeps the accent colour; confirmed 02-UI-SPEC's accent-reservation list now includes it as entry 5 (`2cbbe76`), matching the rendered control.

## Acceptance Criteria (this session, all exit 0)
- `pnpm test:browser -- sidebar` — 360/360 tests passed (clean run; an earlier run in this session hit 2 unrelated `text-field.test.tsx` flakes under full-suite load, confirmed pre-existing and non-reproducible by re-running that file in isolation, 32/32 passed — out of scope per the plan's own files).
- `pnpm test:a11y` — 97/97 tests passed, zero axe violations across the Sidebar and BoardList stories.
- `pnpm test:e2e -- boards-list` — 10/10 e2e specs passed against the real deployed nonprod backend, including `BOARD-01: sidebar board list`.
- `grep -c 'test(' e2e/boards-list.e2e.spec.ts` → 1; `grep -c 'seedAccount(' e2e/boards-list.e2e.spec.ts` → 1; `grep -c '// Arrange'` → 1; `grep -c '// Act'` → 3.
- `pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm routes:check`, `pnpm comments:check` — all exit 0.
  - Note: `pnpm routes:check` initially failed with `EISDIR` on a stray `__screenshots__/text-field.test.tsx` directory left behind by the earlier flaky visual-regression run (a gitignored, untracked build artifact — `src/**/__screenshots__/` per `.gitignore`). Removed and re-ran clean; not a code issue.

## Decisions & Deviations
See `key-decisions` in frontmatter for the full Task 1/BUG A/BUG B/8a/8b record. No new deviations from Rules 1-4 in this session — Task 4 was verification-only against already-committed fixes.

### Session/environment notes (not app deviations)
- This session executed inside a git worktree (`worktree-agent-a9bbbbb3770f1724c`) that was empty at spawn time; the two Task 4 fix commits (`a344662`, `2cbbe76`) already existed on a sibling worktree's branch (`worktree-agent-a738a127deda3ab5a`) at the exact same base commit (`877a8ad`), so they were brought in via a `git merge --ff-only` from within this worktree rather than by operating on the sibling worktree's filesystem directly (a hard sandbox guard refuses git operations that target another worktree's checkout).
- `.env.local` and `node_modules` were reconstructed from scratch in this worktree (copied env values, ran `pnpm install`) since a fresh worktree has neither.
- A throwaway 15-board account was freshly seeded via `e2e/seed.sh` for this session's checkpoint re-verification (the original account/credentials from the prior session were not recorded anywhere retrievable).
- Two leftover scratch verification scripts (`debug-sidebar.tmp.mjs`, `verify-sidebar.tmp.mjs`) were found untracked in the sibling worktree and deleted per updated project convention (browser verification must go through Chrome DevTools MCP / Playwright MCP tooling, not throwaway Node scripts). `chrome-devtools-mcp` CLI was installed globally (`pnpm add -g`) to perform this session's headless verification.

## Next Phase Readiness
- BOARD-06 is complete and signed off; the sidebar chrome/list split is the shape every later board plan (02-10 through 02-13) hangs mutation UI on.
- Plan 02-11 must implement the Option B mobile overlay (sub-768px) alongside the board-title trigger it depends on — this is a known, tracked follow-up, not an open bug.
- No blockers for 02-10.

## Self-Check: PASSED
- FOUND: `.planning/phases/02-board-management/02-09-SUMMARY.md`
- FOUND commit `a344662` (BUG A fix)
- FOUND commit `2cbbe76` (8b spec amendment)
- FOUND commit `4e276a4` (Task 2 tracer)
- FOUND commit `26b4f08` (Task 3 responsive/e2e coverage)
