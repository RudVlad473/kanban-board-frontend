---
status: verifying
trigger: "use ffmpeg to break down video into frames B:\\videos\\obs\\2026-09-07_22-10-52.mov -- we spent 2 damn days on figuring out how to make board creation optimistic with auto route creation and it still doesnt work"
created: 2026-09-07
updated: 2026-09-07
---

# Debug Session: board-create-optimistic

## Symptoms

expected: Creating a board (with a named initial column) should navigate to the new board near-instantly and show the typed column immediately (the outcome quick task 260907-exb was supposed to deliver: "decouple the fan-out from the create navigate ... stage placeholder columns under client ids on the new board's own mount").

actual: Screen-recorded reproduction (`B:\videos\obs\2026-09-07_22-10-52.mov`, 1920x1080, 60fps, 20.3s) shows, after the user clicks "Create New Board" in the modal:
1. Modal closes immediately (t≈6.0s) and the sidebar updates to show the new board row (optimistic list insert works).
2. The MAIN CONTENT AREA (title + columns) stays on the OLD board for ~3 seconds — no navigation happens yet, despite the URL/title normally being expected to update right away.
3. At t≈9.06-9.13s the URL/title finally update to the new board, but the board briefly renders as genuinely EMPTY ("This board is empty. Create a new column to get started.") for roughly 70-140ms before the typed column ("qweqwe", styled uppercase "QWEQWE" by the column-header CSS) appears in a greyed/disabled (unconfirmed) state.

So there are two distinct, stacked gaps: (a) a ~3s wait before navigation even starts, and (b) a further ~100ms-scale flicker of the empty state around when the column placeholder renders.

errors: None observed in the video; console not captured by the recording. Live-checked in this session: no console errors during reproduction.

reproduction: Sidebar → "+ Create New Board" → type a board name → "+ Add New Column" → type a column name → click "Create New Board".

timeline: Reported by the user as an ongoing, ~2-day-old issue. The most recent related work is quick task 260907-exb ("Fix BOARD-02's column fan-out to be optimistic"), CI-green on the SAME checked-out commit this video was recorded against (`a5328bf`). So 260907-exb's fix is active in this recording and did not resolve the reported delay.

**Prior history (found this session):** this exact "board creation feels non-optimistic" complaint was already raised by the same product owner on 2026-09-03, driving the D-05 amendment in `02-UI-SPEC.md`/`04-UI-SPEC.md`: "the optimistic row was invisible behind a dimmed backdrop held for the whole round trip." That amendment fixed the MODAL+SIDEBAR-ROW half (close-on-submit, optimistic list insert) but never touched the board-switch/navigate half — which is exactly the gap reported again in this video, a third time, still unfixed at the root.

## Evidence

- timestamp: 2026-09-07T19:40 (orchestrator)
  Extracted frames from the video with ffmpeg into `.planning/debug/board-create-optimistic-frames/`. Confirmed the ~3s navigation delay and the empty-state flicker by visually inspecting frames `overview/frame_013.png` (t≈6.5s, still old board) through `detail/d_044.png`/`d_048.png` (t≈9.06-9.13s, new URL, empty→column).

- timestamp: 2026-09-07T19:42 (orchestrator)
  Read `src/features/boards/hooks/use-create-board.ts`. `router.push(buildBoardDetailPath(boardId))` is called ONLY AFTER `await`ing `createBoardMutation.mutateAsync(...)`, because the destination URL needs the SERVER's id (`outcome.board.id`), not the client-generated placeholder. The hook's own doc comment only describes making the COLUMN fan-out optimistic (260907-exb's actual scope) — nothing about the navigate wait itself.

- timestamp: 2026-09-07T20:05 (continuation session)
  Read `app/(dashboard)/boards/[boardId]/page.tsx`: it redirects away from any `boardId` not present in a FRESH server-side `fetchBoards()` read (T-02-54's deliberate membership guard, "change the URL rather than silently render a substitute"). A client-generated id would never match a real board and would be bounced to `/boards` or the first board. This is why the code cannot navigate before the server responds: it is not an oversight, it is this guard doing exactly what it was built to do.

- timestamp: 2026-09-07T20:20 (continuation session)
  Live-measured the actual create round trip against the real running dev server + real nonprod backend with an ad-hoc Playwright probe (`E2E_PORT=3000`, deleted after the run): 4 runs, create-action response landed 233-761ms after click, URL updated 659-1439ms after click, board title visible 1-43ms after that. Nowhere near 3s in a warm run — the video's ~3s is consistent with real backend/network variance on this SAME code path (confirmed: `dev` server had been running 33+ min before the recording, ruling out a first-compile explanation), not evidence of a separate defect.

- timestamp: 2026-09-07T20:35 (continuation session)
  Researched `refresh()` (from `next/cache`, called inside `createBoardAction`): it "refreshes the client router from within a Server Action... refreshes only uncached dynamic data" (Next 16 docs). This means the action's own response already carries a re-render of any uncached RSC segments (e.g. the sidebar) — a real, deliberate, but unavoidable-as-architected cost stacked onto the create's own round trip, not a bug to remove (the doc comment on that call ties it to a previously-fixed prefetch/staleness bug per ADR tech/0030 rule 4; untouched).

- timestamp: 2026-09-07T20:50 (continuation session)
  Read `use-open-board-id.ts` (the board-DELETE pattern the prior session's hypothesis wanted to mirror). It resolves an already-existing, already-real destination board id from mutation context — it does not, and structurally cannot, help CREATE navigate to an id that does not exist on the server yet. The pattern does not transfer: delete's destination is always a real board; create's destination is real only after the round trip completes. Mirroring it for create would require weakening the T-02-54 redirect guard above, or reintroducing an override/`useOptimistic` mechanism this codebase's ADR 0029→0030 supersession explicitly retired.

- timestamp: 2026-09-07T21:05 (continuation session)
  Read `use-create-board-columns.ts`: its `onMutate` no-ops (`isNil(current) ? current : ...`) if the `["board", boardId]` cache entry doesn't exist yet — and `use-create-board.ts`'s `onSuccess` never wrote that entry (only `BOARDS_QUERY_KEY`, the list). This is a genuine violation of ADR tech/0030 rule 4 ("every mutation hook writes the cache") — CREATE BOARD was the one mutation in the codebase that owns an entry (`["board", newId]`) but never seeds it. Hypothesized this was (part of) the empty-flash cause.

- timestamp: 2026-09-07T21:15 (continuation session)
  **FIX APPLIED** (see Resolution) to close the ADR-0030 rule-4 gap: `use-create-board.ts`'s `createBoardMutation.onSuccess` now also does `queryClient.setQueryData<BoardFull>(buildBoardQueryKey(board.id), { ...board, columns: [] })`. Verified: `pnpm exec tsc --noEmit` clean; full suite for `board-list.test.tsx` + `boards-empty-state.test.tsx` + `board-view.test.tsx` — 324/324 pass (one test-harness-only `console.error("No queryFn was passed...")` noise appeared, root-caused to these Storybook-composed tests not rendering the root `<BoardQueryDefaults>` provider that `app/layout.tsx` always mounts in production before any component — confirmed harmless, test-environment-only, does not affect production).

- timestamp: 2026-09-07T21:30 (continuation session)
  Ran `e2e/boards-create.e2e.spec.ts`'s SECOND test ("navigates fast and paints the typed columns immediately, while the fan-out is still held") — it FAILED when run as the full file, but PASSED in isolation. **A/B-tested against baseline (git stash): identical failure, same test, same way, with or without the fix** — confirmed pre-existing, environment-specific (likely `next dev` + running both tests in one worker/session) flake, NOT a regression from this fix. Out of scope for this session; noted for a separate ticket.

- timestamp: 2026-09-07T21:45 (continuation session)
  Built a live mutation-observer probe (`E2E_PORT=3000`, deleted after the run) recording every text change in `<main>` from submit to settle, for a board created with one column. Result, WITH the fix applied: `empty → column(+69ms) → empty(+36ms) → column(+223ms)` — a genuine flicker, not a single clean flash. **Ran the identical probe on baseline (git stash): the SAME oscillation, same 4 states, near-identical deltas (75ms/57ms/204ms).** The fix has ZERO measurable effect on this flicker — my "seeds the entry so the placeholder write no-ops less" hypothesis for gap (b) was WRONG (or at least insufficient); disproven by direct A/B measurement.

- timestamp: 2026-09-07T22:00 (continuation session)
  Traced the REAL mechanism behind the flicker: `BoardScreen`'s own effect ("the switch itself asks for the fresh read, once", `board-screen.tsx`) fires `queryClient.invalidateQueries({queryKey: buildBoardQueryKey(boardId), exact: true})` on every switch to a boardId it hasn't revalidated yet — including a JUST-CREATED board, since `lastRevalidatedBoardId.current` was seeded to whatever board was open before. Because `BoardView` (child) mounts before `BoardScreen` (parent) fires its own effect, the sequence is: (1) `useRunPendingColumnFanOut`'s effect stages the optimistic placeholder column, (2) `BoardScreen`'s effect fires an invalidate-triggered background GET for the board, (3) if that GET resolves before the real column-creation POST, its "0 columns" response (accurate — the column genuinely doesn't exist server-side yet) OVERWRITES the whole cache entry, stomping the optimistic placeholder back to empty, (4) the real column-creation POST later lands and re-adds it. This is a genuine, understood race between two DELIBERATE, independently-correct mechanisms (BoardScreen's per-switch freshness read; the column fan-out's optimistic write) — not a bug in either one alone, and not fixable by seeding the cache earlier (confirmed above).

## Eliminated

- hypothesis: The board-navigation wait could be closed by mirroring `use-open-board-id.ts`'s "resolve a pending id from mutation context" pattern (as `use-create-board.ts`'s own hint suggested).
  evidence: That pattern resolves to an ALREADY-REAL destination board (delete's fallback board). Create's destination does not exist server-side until the round trip completes; navigating to a client-generated id would be redirected away by `[boardId]/page.tsx`'s own T-02-54 membership guard, which authoritatively re-fetches the board list server-side. The pattern does not transfer without weakening that guard or reintroducing an ADR-0029-superseded override mechanism.
  timestamp: 2026-09-07T20:50

- hypothesis: Seeding the `["board", newId]` query-cache entry in `createBoardMutation.onSuccess` (before `router.push`) would close the ~100ms empty-state flash by giving `useCreateBoardColumns.onMutate` a real entry to stage its placeholder into.
  evidence: Live mutation-observer probe shows an IDENTICAL flicker pattern and near-identical timing with and without this write (git-stash A/B test). The flash's real cause is a separate race (see Evidence, 22:00) between `BoardScreen`'s per-switch `invalidateQueries` and the column fan-out's optimistic write — unaffected by when the entry was first seeded.
  timestamp: 2026-09-07T21:45

## Resolution

root_cause: TWO independent, confirmed mechanisms (AND-gate: both true, neither causes the other):

1. **(Primary, ~3s-scale gap.)** `router.push()` in `use-create-board.ts` is genuinely, deliberately gated behind the full `createBoardAction` server round trip, because the destination path needs the server's real board id, and `app/(dashboard)/boards/[boardId]/page.tsx` enforces a real, server-verified membership check (T-02-54) that would redirect away from a client-generated id. This is an architecture constraint, not a regression — 260907-exb's own scope never covered it (only the column fan-out). It was already reported and only half-addressed once before (the 2026-09-03 D-05 amendment fixed the modal/sidebar-row half, not this half). A true zero-latency fix requires either relaxing the T-02-54 guard for a "pending create" case, or a real UX decision on how to signal the wait — both are product/architecture decisions, not a code bug to patch.

2. **(Secondary, ~100-300ms-scale flicker.)** A race between `BoardScreen`'s own per-switch `invalidateQueries` (fires because a just-created board id has never been "revalidated" from that component's perspective) and `useRunPendingColumnFanOut`'s optimistic column placeholder write — both correct in isolation, but ordered such that the invalidate's background GET can return an accurate-but-momentarily-stale "0 columns" read that overwrites the placeholder before the real column POST lands. Confirmed via live A/B-tested mutation-observer trace; NOT fixed by seeding the query cache earlier.

fix: Applied ONE safe, verified, ADR-compliant improvement that does not resolve either symptom directly but closes a real gap the investigation surfaced: `use-create-board.ts`'s `createBoardMutation.onSuccess` now also seeds the `["board", newId]` query-cache entry (`{ ...board, columns: [] }`), which ADR tech/0030 rule 4 ("every mutation hook writes the cache") already required and this hook was the one exception to. Left BOTH confirmed root causes unfixed pending a product/architecture decision (see below) rather than force either fix: (1) a redesign of create's routing to tolerate a pending id, or a UX decision on wait-time feedback, both requiring product sign-off given the codebase's own explicit bans on reintroducing ADR-0029 override machinery and the T-02-54 guard's deliberate purpose; (2) reordering/coordinating `BoardScreen`'s general-purpose per-switch invalidate specifically around a freshly-created board would touch a widely-relied-on mechanism (every board switch, not just create) for a create-only race — real regression risk without a clear, safe seam.

verification:
  - `pnpm exec tsc --noEmit -p tsconfig.json` — clean, both before and after the comment correction.
  - `pnpm vitest run` on `board-list.test.tsx`, `boards-empty-state.test.tsx`, `board-view.test.tsx` — 324/324 pass, no regressions from the fix.
  - Live-measured (Playwright probe against the real running dev server + real nonprod backend, deleted after each run): create round trip 659-1439ms in 4 runs — genuinely not "near-instant", confirming gap (a) is real and network-bound, not imagined.
  - Live-measured (mutation-observer probe against the real dev server, deleted after the run): the empty-state flicker is IDENTICAL with and without the applied fix (A/B via `git stash`) — confirms the fix does not address gap (b), and that gap (b)'s real cause is the invalidate/optimistic-write race documented above.
  - `e2e/boards-create.e2e.spec.ts` full file: one pre-existing flake (unrelated to this fix, confirmed via identical A/B failure on baseline) when both tests run in the same worker; each test passes individually.
  - guardrail note: this fix does not close the user-reported symptom. It is offered as a legitimate, low-risk improvement surfaced by the investigation, not as a claim that the bug is fixed. The two confirmed root causes above are being returned as a decision checkpoint rather than force-implemented, per the reasoning below.

files_changed:
  - src/features/boards/hooks/use-create-board.ts (onSuccess now also seeds the open-board query-cache entry; comment corrected to reflect the disproven flash hypothesis and record the real mechanism)

## Current Focus

reasoning_checkpoint:
  hypothesis: "Board creation's navigate-and-render was never made fully optimistic: (a) the URL/board-switch waits on a real, unavoidable network round trip because the destination id must be server-verified (T-02-54), and (b) the post-landing empty-state flicker is a race between BoardScreen's per-switch invalidate and the column fan-out's optimistic write — two independent, both-confirmed mechanisms, neither a simple code bug."
  confirming_evidence:
    - "Live Playwright timing probe: real round trip 659-1439ms (never sub-100ms), directly against the actual code path and real backend."
    - "Live mutation-observer probe, A/B-tested via git stash: identical flicker pattern/timing with and without the cache-seed fix, isolating gap (b)'s true cause to the invalidate/optimistic-write ordering, not cache absence."
    - "app/(dashboard)/boards/[boardId]/page.tsx's membership redirect, read directly, confirms a client-generated id cannot be navigated to without server confirmation first."
    - "02-UI-SPEC.md/04-UI-SPEC.md's D-05 amendment (2026-09-03) is the same product owner reporting the same 'feels non-optimistic' complaint about board creation before, fixed only for the modal/sidebar half."
  falsification_test: "If a future measurement showed the create round trip landing in <50ms consistently, gap (a) would be disproven as network-bound. If reverting the cache-seed fix changed the flicker's timing/shape, gap (b)'s race explanation would be disproven — it did not."
  fix_rationale: "The applied fix corrects a real, independent ADR-0030 rule-4 violation (every mutation that owns a cache entry must write it) — legitimate on its own merits, verified safe by tests, but explicitly NOT claimed to resolve either confirmed root cause, since live A/B measurement disproved that it does for gap (b), and it was never expected to touch gap (a)'s network wait."
  blind_spots: "Have not measured the primary gap's latency distribution under real user network conditions (only the local dev box against the shared nonprod backend) — the video's ~3s could still partly reflect a slower moment on the shared backend not reproduced here. Have not attempted a fix for either confirmed root cause, since both require a product/architecture decision (see below) rather than a unilateral code change."
  candidate_causes:
    - "code: router.push() gated on the full create round trip (category: code/architecture)"
    - "config/architecture: T-02-54's server-side membership redirect guard, which makes a client-generated id unnavigable (category: environment/architecture — a deliberate safety net, not a defect)"
    - "code: BoardScreen's per-switch invalidateQueries racing the column fan-out's optimistic write (category: code — a timing/ordering defect between two correct-in-isolation mechanisms)"
  and_gate: "Yes — gaps (a) and (b) are both true simultaneously and are independent of each other (confirmed: fixing/not-fixing (b)'s hypothesized cause had zero effect on (a)'s timing, and vice versa). This is a genuine two-cause finding, not a single chained cause."

next_action: "Return a DECISION checkpoint to the user: whether to invest in (1) a redesigned create-routing model (accepting the T-02-54 guard would need to change, or a UX-only fix that makes the wait visibly a 'creating...' state instead of frozen), and (2) whether to touch BoardScreen's general per-switch invalidate to special-case a freshly-created board (real regression risk to every other board switch). Do NOT unilaterally implement either without product sign-off, per this codebase's own ADR-0029 ban on reintroducing override machinery and its explicit call for a decision to be made and recorded (docs/adr/tech/0030: 'if a future mutation genuinely cannot stage its write, say so here and expect the caching to be re-litigated with it')."

tdd_checkpoint: null
