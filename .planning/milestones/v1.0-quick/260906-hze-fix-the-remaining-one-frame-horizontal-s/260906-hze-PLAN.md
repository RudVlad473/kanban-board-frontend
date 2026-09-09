---
phase: quick-260906-hze
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QT-HZE-01, QT-HZE-02, QT-HZE-03]

files_modified:
  - e2e/boards-switch.e2e.spec.ts
  - app/(dashboard)/boards/(index)/page.tsx
  - app/(dashboard)/boards/(index)/loading.tsx
  - .planning/STATE.md

user_setup: []

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "During a client board switch, `<main>` never holds a `board-view-skeleton` element at the same time as a `board-columns-scroll` element, and the scroll container's height never drops below its pre-switch height."
    - "The e2e case proving it FAILS against the unfixed code (a recorded sample carrying both testids, the scroll container at roughly half its pre-switch height) and PASSES with the fix — falsified in that order, in that run, with both outputs quoted."
    - "Hard-loading `/boards` still has a board skeleton as its loading fallback: the file is moved, never deleted or emptied."
    - "`/boards` still redirects to the first board, and still renders the empty state for an account with none — `e2e/boards-list.e2e.spec.ts` green."
    - "BOARD-04's instant-paint case still passes: removing the `boards`-level boundary from above `[boardId]` did not turn the switch back into a blocking navigation."
  artifacts:
    - "e2e/boards-switch.e2e.spec.ts — a third `test.describe` covering the stacked board areas"
    - "app/(dashboard)/boards/(index)/loading.tsx — the moved fallback, carrying the decision record for why it is inside a route group"
    - "app/(dashboard)/boards/(index)/page.tsx — the moved `/boards` redirect page, unchanged in content"
  key_links:
    - "Next's `loading.js` wrapping rule IS the mechanism: a `loading.js` wraps `page.js` AND nested segments, so `boards/loading.tsx` covers `[boardId]`. A route group is Next's own documented way to scope it back to one route."
    - "The `MutationObserver` on `<main>` is the spec's only handle on the intermediate COMMITTED DOM state; a `requestAnimationFrame` sampler can miss the frame under load and go green with the bug present."
    - "`expect(skeleton).toHaveCount(0)` cannot pin this bug and must not be used for it — BOARD-04 in the same file already carries that assertion and passes today, with the defect present."
---

<objective>
For one frame during a client board switch, the dashboard `<main>` holds TWO board areas: the real
`board-columns-scroll` and a `board-view-skeleton` arriving through the `{children}` page slot. Both
are `flex-1`, so they split the height 50/50 — the scroll container goes 647px -> 324px -> 647px and
the horizontal scrollbar pinned to its bottom edge jumps ~323px up and back. That is the flicker.

The second board area is `app/(dashboard)/boards/loading.tsx`'s `BoardViewSkeleton`. It was written
for the `/boards` redirect route, but Next's `loading.js` wraps nested segments too, so it also
covers `[boardId]` and fires on every board-to-board switch.

Purpose: the layout's own documented invariant — `{children}` contributes no markup on a board
route — becomes true, using Next's own route-group scoping rather than a hand-rolled guard.
Output: a two-file move plus its decision record, pinned by an e2e case falsified against the
unfixed code first.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260906-hze-fix-the-remaining-one-frame-horizontal-s/260906-hze-FINDINGS.md
@.planning/STATE.md
@CLAUDE.md

@app/(dashboard)/layout.tsx
@app/(dashboard)/boards/loading.tsx
@app/(dashboard)/boards/page.tsx
@app/(dashboard)/boards/[boardId]/loading.tsx
@e2e/boards-switch.e2e.spec.ts
@e2e/seed.ts
</context>

<measured_facts>
Everything below was measured against the running app, read out of the repo, or quoted from Next's
own docs at planning time. Do not re-derive it; do not contradict it without measuring first.

1. FINDINGS.md is LOCKED. Its rAF sampler recorded, on one frame of a switch, `<main>` holding
   `div[board-columns-scroll] h324`, `div h0`, `div h1`, `div[board-view-skeleton] h324`, with the
   URL already at board B. Three consecutive frames read 647 -> 324 -> 647.

2. `board-screen.tsx`'s `key={board.id}` is NOT implicated and is out of scope. Do not revert,
   remove, move or alter it. Quick task `260905-r15` shipped it for a different, real defect.

3. `app/(dashboard)/layout.tsx`'s `<main className="flex min-h-0 flex-1 flex-col">` holds exactly
   three things: the layout's own `<Suspense fallback={<BoardViewSkeleton />}>` around `OpenBoard`
   (which renders `BoardScreen`), `<BoardPrefetcher />` (returns `<></>`), and `{children}`. Its own
   comment states the invariant this plan restores: children "contributes no markup on a board
   route".

4. The skeleton in fact 1 sits AFTER the board area and after two empty divs, so it is in the
   `{children}` position, not the layout's own fallback — a fallback would have replaced the board
   area and rendered first. `app/(dashboard)/boards/[boardId]/loading.tsx` returns `<></>` and cannot
   produce it. `app/(dashboard)/boards/loading.tsx` returns `<BoardViewSkeleton />` and is the only
   remaining source in that subtree.

5. Next 16 docs, `loading.mdx` ("Instant Loading States"): "loading.js wraps not-found.js, page.js,
   and nested layout.js files in a `<Suspense>` boundary." A `loading.js` therefore covers the
   nested segments below it — which is why a fallback authored for `/boards` appears on a
   `/boards/A` -> `/boards/B` switch.

6. Next 16 docs, `project-structure.mdx` ("Opting for loading skeletons on a specific route"): "To
   apply a loading skeleton via a `loading.js` file to a specific route, create a new route group
   (e.g. `/(overview)`) and then move your `loading.tsx` inside that route group... without
   affecting the URL path structure." That is the platform primitive this plan uses. The rejected
   alternatives are recorded in task 2.

7. `BoardView` returns a fragment and `DndContext` renders no DOM element, so
   `div[data-testid="board-columns-scroll"]` is a DIRECT child of `<main>`. `BoardViewSkeleton`'s
   root div is a direct child too. A `MutationObserver` with `{ childList: true }` on `<main>`
   therefore sees both appear and disappear.

8. `e2e/boards-switch.e2e.spec.ts`'s BOARD-04 case already asserts
   `await expect(skeleton).toHaveCount(0)` after every switch, and it passes today with this defect
   present — `toHaveCount` polls and is satisfied the moment the frame ends. Any assertion shaped
   like that is green in both directions and must not be used here.

9. That same file already carries `holdEveryRead(page)`, which delays every RSC request and Server
   Action POST by `SERVER_HOLD_MS` (3000). It is available as a window-widening instrument if the
   default path does not reproduce (task 1's ladder).

10. Geometry (from `260905-r15` fact 5): a column is `w-70` (280px), the row is `gap-6`/`p-6`, and
    five real columns is ~1848px of content — overflowing the `e2e` project's 1280px Desktop Chrome
    viewport, so the horizontal scrollbar genuinely exists.

11. `pnpm routes:check` fails on a literal `"/boards"` outside `src/lib/core/routing/routes.ts`. The
    spec must keep using `ROUTE` and `buildBoardDetailPath`, as it already does.

12. `pnpm coverage:check` requires a `// Covered by:` header on every file under `app/` and `src/`,
    naming a test file that exists. Both moved files keep a header; the loading file's changes (see
    task 2).

13. `pnpm comments:check` caps comment prose at 3 lines unless the block is preceded by a
    `comment-length-exempt:` line stating why. Both `loading.tsx` files already use that marker.

14. The `e2e` project builds and starts the real app (`pnpm build && next start` on `E2E_PORT`,
    default 4173) and dials the real nonprod backend. `pnpm test:e2e <path>` is the scoped
    invocation (`--project e2e` plus the path); a `--` separator is NOT needed and got the whole
    project run once before.

15. `.planning/config.json` has `use_worktrees: false` and `security_enforcement: false`. Work on
    the current branch (`gsd/phase-04-task-subtask-workflow`), create no worktree, and no threat
    model section is required — this change crosses no trust boundary.

16. Subagents in this project have NO `mcp__playwright__*` tools. Every live-app confirmation
    belongs to the orchestrator and is listed in `<orchestrator_checks>` below. Do not attempt one,
    and do not write a throwaway Node script to simulate one.
</measured_facts>

<reproducibility_honesty>
Which layer can actually hold a one-frame layout collapse:

- **jsdom (`unit` project): NO.** No App Router segment tree, no real layout engine, no scrollbars.
- **Real-Chromium component tests (`browser` project): NO.** It renders components directly; it
  cannot mount an App Router `loading.js` boundary or perform a segment navigation. The bug is a
  router behaviour driven by a file's LOCATION, and no importable module expresses it.
- **A structural assertion** (e.g. "no `loading.tsx` exists at `app/(dashboard)/boards/`): REJECTED.
  It tests the shape of the fix rather than the behaviour — a self-referential oracle that would
  pass against a broken app and fail against a correct one written differently.
- **e2e (`playwright --project e2e`, real built app, real navigation): YES.** This is the layer
  FINDINGS itself measured on, and the only one where the mechanism exists at all.

Within e2e, the instrument matters. A `requestAnimationFrame` sampler (what FINDINGS used
interactively) can miss the frame under CI load, and a missed frame is a GREEN with the bug present
— failure in the dangerous direction. A `MutationObserver` on `<main>` observes the COMMITTED
intermediate DOM state rather than a sampled paint, and `getBoundingClientRect()` called inside the
observer callback forces a synchronous layout, so the collapsed height is measured rather than
raced for.

One residual limit, to be stated in the spec's own header and in the summary rather than papered
over: the case is deterministic GIVEN the switch suspends. If a future router change stopped the
`[boardId]` segment suspending at all, no sample would be recorded and the case would go quietly
weak. The vacuity guards in task 1 (at least one sample, at least one sample with the board area
present) catch a broken instrument, not that scenario.
</reproducibility_honesty>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: RED — pin the stacked board areas with an e2e case that fails today</name>
  <files>e2e/boards-switch.e2e.spec.ts</files>
  <behavior>
    - During a board-to-board switch, no committed DOM state has `<main>` holding a
      `board-view-skeleton` while a `board-columns-scroll` is present.
    - In every committed state where the board area is present, its height is at least 90% of the
      height measured before the switch (today: 324 against a 647 baseline, ~50%).
    - The instrument ran: at least one sample was recorded, and at least one recorded sample has the
      board area present. Without both, the two assertions above pass vacuously.
  </behavior>
  <action>
    Append a THIRD `test.describe` to `e2e/boards-switch.e2e.spec.ts`. Do not touch the existing
    BOARD-04 describe, the scroll-offset describe, their helpers or their constants — but you may
    reuse `holdEveryRead` and `SERVER_HOLD_MS` from the file's top if the ladder below needs them.
    Name the describe for the behaviour, e.g. "a board switch never stacks two board areas".

    Arrange the same way the scroll-offset case already does: one `seedAccount()`, a
    `randomUUID().slice(0, 8)` suffix, board A with five `seedColumn` calls, then board B with five,
    each call sequential (`seed.ts` derives `position` from call order). Five per board is
    deliberate (fact 10) — the horizontal scrollbar must genuinely exist, or the case pins a height
    change with no scrollbar attached to it. Sign in with the four steps the file already uses, then
    `page.goto(buildBoardDetailPath(boardA.id))` and wait for A's first column heading (the
    `/^name \(0\)$/i` shape the file uses).

    Declare a `Sample` type in the spec: `{ skeleton: boolean; board: boolean; height: number }`.

    Measure the baseline BEFORE the switch: `page.getByTestId("board-columns-scroll").evaluate((el)
    => Math.round(el.getBoundingClientRect().height))`. Assert it is greater than 200, so a
    collapsed or unlaid-out baseline cannot make the comparison trivially satisfiable.

    Install the recorder in one `page.evaluate`, immediately before the click: query
    `document.querySelector("main")`, create a `MutationObserver` whose callback reads
    `main.querySelector('[data-testid="board-view-skeleton"]')` and
    `main.querySelector('[data-testid="board-columns-scroll"]')`, builds a `Sample` (height from
    `getBoundingClientRect().height`, rounded; 0 when the board area is absent), and pushes it onto
    an array only when it differs from the last pushed entry. Observe `main` with
    `{ childList: true }` — both elements are direct children (fact 7). Store the array on `window`,
    declaring the property through a `declare global { interface Window { ... } }` block in the spec
    so no `any` is needed; if that fights the lint config, use `page.exposeFunction` to push each
    sample into a Node-side array instead and poll until it stops growing before asserting.

    Act: click board B's sidebar link, wait for B's first column heading to be visible, then
    `await page.waitForLoadState("networkidle")` so the switch's own revalidation has landed and any
    later commit has been recorded too. Read the array back with `page.evaluate` and disconnect the
    observer in the same call.

    Assert, in this order:
    - `expect(samples.length).toBeGreaterThan(0)` and `expect(samples.some((s) => s.board)).toBe(true)`
      — the vacuity guards. A silently-uninstalled observer must fail here, not pass everything.
    - `expect(samples.filter((s) => s.skeleton && s.board)).toEqual([])` — the mechanism. Filtering
      into an array rather than asserting a boolean is deliberate: the failure output then prints the
      offending samples, including their heights.
    - `expect(samples.filter((s) => s.board && s.height < baseline * 0.9)).toEqual([])` — the
      user-visible symptom, the collapse that moves the scrollbar.

    Do NOT add the fix in this task. Do NOT reach for `expect(skeleton).toHaveCount(0)` anywhere in
    the new case — fact 8 records that exact assertion passing today with the defect present.

    Ladder, if the first RED run does NOT fail:
    1. Re-run once (the router cache is cold on the first visit to B; a second run in the same
       worker is not a different code path, but a genuinely flaky reproduction is worth knowing
       about before building on it).
    2. Add `await holdEveryRead(page)` immediately before the click (fact 9). Holding the RSC
       response for 3s widens the suspension window from one frame to seconds, so the stacked state
       is unmissable. Keep every assertion identical; the hold only widens the window, it does not
       weaken what is asserted. Note in the spec header that the hold is there to make the frame
       observable, not to simulate slowness.
    3. If it still does not fail, STOP. Do not weaken the assertions, do not substitute a structural
       or snapshot test, do not ship the fix untested. Report exactly what was run, what was
       recorded, and that the mechanism did not reproduce at the only layer that has it — the
       orchestrator decides from there.

    Finally, add a short header comment above the new describe recording what the case asserts and,
    as a segregated falsifiable note, the one thing it deliberately does NOT hold (the residual limit
    in `<reproducibility_honesty>`). Use the `comment-length-exempt:` marker with a stated reason if
    it exceeds three prose lines, matching the file's existing style.
  </action>
  <verify>
    <automated>pnpm test:e2e e2e/boards-switch.e2e.spec.ts</automated>
  </verify>
  <done>
    The new case FAILS, and the failure is one of the two `toEqual([])` assertions printing a sample
    that carries both testids and/or a board height at roughly half the baseline — not a seeding
    error, not a missing heading, not a timeout on a testid. Quote the failing assertion and the
    printed sample array in the summary, with the actual heights. The two pre-existing cases in the
    file still pass in that same run. Record which rung of the ladder was needed. Commit as
    `test(quick-260906-hze): RED — pin that a board switch never stacks two board areas` with the
    failing state recorded in the message.
  </done>
</task>

<task type="auto">
  <name>Task 2: GREEN — scope the /boards loading fallback to /boards with a route group</name>
  <files>app/(dashboard)/boards/(index)/page.tsx, app/(dashboard)/boards/(index)/loading.tsx</files>
  <action>
    Move both files into a new route group with `git mv`, preserving history:
    `app/(dashboard)/boards/page.tsx` -> `app/(dashboard)/boards/(index)/page.tsx`, and
    `app/(dashboard)/boards/loading.tsx` -> `app/(dashboard)/boards/(index)/loading.tsx`. A route
    group does not affect the URL, so `/boards` still resolves to the moved page, and the fallback
    now covers only that page instead of the whole `[boardId]` subtree below it (facts 5 and 6).
    Leave `app/(dashboard)/boards/[boardId]/` exactly where it is.

    `page.tsx` moves unchanged — no edits to its body, imports or header.

    Change two things in the moved `loading.tsx`, and nothing else:
    - Its coverage pointer becomes `// Covered by: \`e2e/boards-switch.e2e.spec.ts\``. That spec is
      what now pins this file's LOCATION, which is the only load-bearing thing about it; the current
      "nothing to test" pointer stops being true the moment task 1's case exists.
    - Its decision record gains the fact that makes the route group load-bearing, so a future reader
      cannot flatten the group away as redundant nesting: a `loading.js` at the `boards` level covers
      the nested `[boardId]` segment as well, so this skeleton rendered INSIDE the dashboard layout's
      `<main>` beside the board it was never meant to cover — two `flex-1` children splitting the
      height, the board's scroll container measured at 324px against 647px, and the horizontal
      scrollbar jumping with it (measured 2026-09-06). State the date and the measurement, so the
      claim is falsifiable. Keep the existing paragraph about reusing the board skeleton for this
      route. Use the `comment-length-exempt:` marker with a stated reason (fact 13).

    Do NOT touch `app/(dashboard)/boards/[boardId]/loading.tsx` — its record is about its own
    emptiness and stays true. Do NOT add a cross-reference between the two loading files: each states
    its own fact, and a "same as the sibling" pointer is the kind that goes stale first and silently.
    Do NOT edit `app/(dashboard)/layout.tsx`; its `{children}` invariant comment becomes TRUE under
    this fix rather than stale, and the note about what enforces it belongs on the file that could be
    deleted, not on the one that depends on it.

    Rejected alternatives, recorded here so they are not re-litigated at execution time and not
    re-derived by a future reader:
    - Emptying `boards/loading.tsx` to `<></>` in place. One line, but it deletes the `/boards`
      loading state outright — and `/boards` is the post-sign-in redirect target, where a real
      backend round trip is user-visible. Kept as the CONTINGENCY below, not the first choice.
    - Deleting the file. Same cost as above plus it removes the boundary entirely.
    - A client component in the fallback that reads `usePathname()` and renders the skeleton only
      when no board id is in the URL. It would work (FINDINGS shows the URL is already board B's on
      the offending frame), but it is exactly the hand-rolled mechanism CLAUDE.md forbids when the
      platform ships one — and Next ships this one (fact 6).
    - Anything touching `key={board.id}`, the query cache, `initialData`, or the invalidate-on-switch
      effect. Out of scope (fact 2) and governed by `docs/adr/tech/0030`.

    Then re-run task 1's case. If it now PASSES, the hypothesis in fact 4 is confirmed by the
    transition itself — that RED-to-GREEN pair is the proof, and no further browser work is needed
    from you.

    If it still FAILS, STOP. Do not start deleting other files hunting for the skeleton. Report that
    the RED case is unchanged by the move, which falsifies fact 4, and hand back to the orchestrator
    with the recorded samples.

    CONTINGENCY, and only if the run below shows BOARD-04's instant-paint case newly failing (i.e.
    removing the `boards`-level boundary from above `[boardId]` made the switch block on the RSC
    payload again): revert the `loading.tsx` half of the move only — leave the page in `(index)` —
    and instead make `app/(dashboard)/boards/loading.tsx` return `<></>` in place, with its record
    rewritten to say the file is kept for its boundary and deliberately renders nothing, plus the
    cost being accepted (no loading state on `/boards` itself). Re-run everything. Record in the
    summary WHICH branch shipped and why; do not present the contingency as the plan's first choice.

    Regenerate route types before linting — `pnpm build` (or `pnpm exec next typegen`) must run after
    a page moves, or `pnpm lint` reports `no-unsafe-assignment` against a stale generated
    `PageProps<>` in a file you never touched.
  </action>
  <verify>
    <automated>pnpm test:e2e e2e/boards-switch.e2e.spec.ts</automated>
    <automated>pnpm test:e2e e2e/boards-list.e2e.spec.ts e2e/boards-detail.e2e.spec.ts</automated>
    <automated>pnpm build</automated>
    <automated>pnpm lint</automated>
    <automated>pnpm comments:check</automated>
    <automated>pnpm coverage:check</automated>
    <automated>pnpm routes:check</automated>
    <automated>pnpm tsx:check</automated>
  </verify>
  <done>
    The new case PASSES, and BOARD-04's instant-paint case and the scroll-offset case both still pass
    in the same run — so scoping the boundary did not turn the switch into a blocking navigation and
    did not reintroduce a skeleton. `boards-list` (the `/boards` redirect and the zero-board empty
    state) and `boards-detail` are green, so the moved page still serves `/boards` at the same URL.
    `pnpm build`, `pnpm lint` and all four check scripts exit 0. Task 1's RED output and this task's
    GREEN output are both quoted in the summary, in that order. Commit as
    `fix(quick-260906-hze): scope the /boards loading fallback to /boards so a switch stops stacking
    two board areas`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Prove it holds, gate, and hand the live checks to the orchestrator</name>
  <files>.planning/STATE.md</files>
  <action>
    Stability first: re-run the new case alone under repetition, `pnpm test:e2e
    e2e/boards-switch.e2e.spec.ts --repeat-each=3 --workers=2`. Project memory records that a
    default-worker green proves nothing about contention. Report the pass count and any `flaky`
    entry — a case that is consistently flaky is a defect to fix here, not a number to accept.

    Then run the repo's own gate rather than a hand-picked subset: `pnpm verify`, the same 20-gate
    run `.husky/pre-push` will make (~5-6 min). `e2e` runs last and dials the real nonprod backend,
    so `NONPROD_RESET_TOKEN` must be present — if the preflight refuses in the first second, run
    `pnpm secrets:decrypt` and retry rather than working around it.

    Update `.planning/STATE.md`: a `260906-hze` row in the Quick Tasks Completed table, and a short
    Session Continuity entry recording (a) the root cause in one sentence, (b) both falsification
    directions with the observed heights, (c) which branch shipped if the contingency was used, and
    (d) the two things this task does NOT close, verbatim in substance: the combined
    vertical+horizontal scrollbar the user reports is NOT reproduced and NOT claimed fixed
    (FINDINGS records the mechanism as plausible but unconfirmed), and the live-app confirmation is
    the orchestrator's, not this task's.

    Leave nothing seeded behind. The suite's own `globalTeardown` deletes what the runs seeded. If
    you seed an account by hand for any reason, clean it with `pnpm e2e:cleanup --users <id>` and
    NEVER a bare `pnpm e2e:cleanup` — that deletes accounts the orchestrator may be holding.
    Confirm `ls .e2e-seeded-users/` is empty before calling this done.

    Push with `git push` (fast-forward only). If it cannot fast-forward, stop and surface it — never
    force-push. If the pre-push hook refuses, fix the named gate; do not reach for `--no-verify`.
    Then block on CI: `gh run list --limit 1 --json databaseId --jq '.[0].databaseId'` for the id,
    then `gh run watch <id> --exit-status`. Report every job's conclusion by name.

    Do NOT attempt any browser verification yourself (fact 16). Write the `<orchestrator_checks>`
    list below into the summary verbatim as the handoff, marked as unrun.
  </action>
  <verify>
    <automated>pnpm test:e2e e2e/boards-switch.e2e.spec.ts --repeat-each=3 --workers=2</automated>
    <automated>pnpm verify</automated>
    <automated>gh run list --limit 1 --json databaseId --jq '.[0].databaseId'</automated>
  </verify>
  <done>
    The new case passes 3/3 under `--repeat-each=3 --workers=2` with zero `flaky`, `pnpm verify`
    exits 0, the branch is pushed, and `gh run watch --exit-status` returned 0 with each job's
    conclusion read back by name (`quality`, `secrets`, `e2e`, `visual`). A red or still-queued job
    means this task is NOT done. `.planning/STATE.md` is updated and committed, `.e2e-seeded-users/`
    is empty, and the summary carries the orchestrator handoff list marked unrun.
  </done>
</task>

</tasks>

<orchestrator_checks>
Subagents have no `mcp__playwright__*` tools (fact 16), so these belong to the orchestrator, after
the executor reports. Each names what would confirm or refute it.

1. **The flicker itself.** Drive the running app headless, switch boards several times, and re-run
   FINDINGS' own per-frame rAF sampler over `<main>`'s children. Confirms: no frame with two board
   areas, and the scroll container's height constant across the switch. Refutes: any frame still
   reading ~half height — in which case there is a second source and FINDINGS' fact 4 was incomplete.

2. **The `/boards` loading state, which the fix is shaped to preserve.** Hard-load `/boards` (the
   post-sign-in redirect target) with the network throttled, and confirm the board skeleton still
   paints while the redirect resolves. This is the one thing the chosen fix buys over the cheaper
   one-line alternative, and no automated test asserts it — the skeleton's visibility is
   timing-dependent, which is exactly why the fix preserves it structurally instead of relying on a
   test to catch its loss.

3. **A predicted side effect, NOT measured — treat as a hypothesis.** A hard load of `/boards/<id>`
   may also have been stacking two skeletons (the layout's own Suspense fallback plus the
   `boards`-level one) during streaming. Throttle the network, hard-load a board URL, and count
   `[data-testid="board-view-skeleton"]` elements: one after the fix, and if two were visible before
   it, that is a second symptom closed. If only one was ever visible, nothing is wrong — the
   prediction was simply not borne out.

4. **The combined vertical + horizontal scrollbar the user reports.** NOT reproduced in FINDINGS,
   NOT claimed fixed by this plan. To confirm or refute: after the fix, switch boards repeatedly at
   several viewport heights (1080, 800, 700) and at browser zoom levels above 100%, sampling
   `document.scrollingElement.scrollHeight - clientHeight` and `<main>`'s own overflow per frame. A
   vertical scrollbar appearing at any of them is a separate defect needing its own findings run —
   the plausible mechanism FINDINGS names (two stacked `flex-1` board areas overflowing `<main>`)
   is removed by this fix, so a recurrence means a different cause, not an incomplete fix.
</orchestrator_checks>

<verification>
- The new e2e case was run against the unfixed code and FAILED on a recorded sample carrying both
  testids and/or a halved board height, then against the fix and PASSED. Both outputs quoted, in
  that order, with the actual numbers. A case that passes both ways is covering something adjacent
  to the bug, not the bug.
- The case's vacuity guards are present and were exercised: at least one sample recorded, at least
  one with the board area present. Without them, a silently uninstalled observer reads as a fix.
- No assertion of the `expect(skeleton).toHaveCount(0)` shape is used for this defect (fact 8).
- BOARD-04's instant-paint case and the scroll-offset case both still pass in the same file — the
  boundary move neither blocked the navigation nor reintroduced a skeleton.
- `boards-list.e2e.spec.ts` green: `/boards` still redirects to the first board and still renders
  the empty state for an account with none, at the same URL, from inside the route group.
- The moved `loading.tsx`'s decision record states the measurement and its date, so it is
  falsifiable rather than a "be careful here" note; `pnpm comments:check` and `pnpm coverage:check`
  both exit 0 on it.
- `pnpm verify` green locally; CI green on all four jobs, conclusions read back per job.
</verification>

<success_criteria>
- No committed DOM state during a board switch has `<main>` holding a `board-view-skeleton` beside a
  `board-columns-scroll`, and the scroll container never drops below 90% of its pre-switch height.
- `/boards` keeps its loading fallback, its redirect, and its empty state, at the same URL.
- The fix is a file move plus one decision record — no new component, no pathname guard, no effect,
  and nothing touched in `board-screen.tsx`, the query cache, or either `[boardId]` file.
- The summary states plainly what is NOT closed: the vertical+horizontal scrollbar report, and every
  live-app confirmation, both handed to the orchestrator as unrun.
</success_criteria>

<output>
Create `.planning/quick/260906-hze-fix-the-remaining-one-frame-horizontal-s/260906-hze-SUMMARY.md` when done
</output>

<amendment date="2026-09-06" authority="user sign-off after the two-way plan review">
**Task 1's ladder starts at rung 2, not rung 1.** Apply the read-hold BEFORE the first RED run.

Both independent reviewers needed a delayed read to reproduce deterministically: Codex delayed RSC
and `next-action` requests by 3s and observed `{ board: true, height: 324, skeleton: true }` against
a 647px baseline; Gemini independently reached for this file's own `holdEveryRead(page)`. Starting at
rung 1 therefore risks a first run that does not reproduce, which reads as "the mechanism is absent"
when it is only "the window was one frame wide".

Everything else in task 1 is unchanged — same assertions, same vacuity guards, same forbidden
`toHaveCount(0)` shape. The hold widens the observation window; it does not weaken what is asserted,
and the spec header must say so.

Rung 3 still applies: if the case does NOT fail even with the hold, STOP and report. Do not weaken
the assertions.
</amendment>
