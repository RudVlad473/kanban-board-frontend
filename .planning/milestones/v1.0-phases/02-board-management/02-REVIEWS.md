---
phase: 2
reviewers: [claude]
reviewed_at: 2026-08-20T10:47:51.234Z
plans_reviewed: [02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md, 02-04-PLAN.md, 02-05-PLAN.md, 02-06-PLAN.md, 02-07-PLAN.md, 02-08-PLAN.md, 02-09-PLAN.md, 02-10-PLAN.md, 02-11-PLAN.md, 02-12-PLAN.md, 02-13-PLAN.md]
models:
  claude: "unknown"
model_sources:
  claude: "unknown"
---

# Cross-AI Plan Review — Phase 2

**Reviewer availability note:** Gemini and Antigravity CLIs were detected on this host but both
failed to produce a review for this run — Gemini's free "Code Assist for individuals" tier is no
longer supported (Google now requires migrating to Antigravity), and Antigravity (`agy`) hit a
tool-permission prompt mid-session (attempting a `Select-String` search over the prompt file) that
could not be approved non-interactively; the gsd-review workflow deliberately does not pass a
permission-bypass flag to work around this. Per user direction, this review proceeds with a single
explicitly-requested `claude` reviewer lane instead. Because the reviewer is the same vendor as the
plans' own authoring/execution context, treat this review as a rigorous self-check rather than a
fully independent cross-AI review — no consensus synthesis is possible with a single reviewer.

## Claude Review

# Cross-AI Plan Review: Phase 2 (Board Management)

## Summary

This is an unusually thorough plan set — each plan reads its own dependencies, threat-models itself, and cites concrete file:line evidence. The architecture (Route Handler BFF wrapping `externalApi`, `userId` always server-derived, TanStack Query for boards) is well-supported by real ADRs and existing code (`src/features/theme/actions.ts`, `src/lib/server/session.ts`). The prerequisite cleanup (02-01..02-05) is low-risk mechanical refactoring with good test coverage. The board-management plans (02-08..02-13) build a coherent tracer→breadth sequence and correctly identify the two genuinely hard problems (client-orchestrated multi-step create, first optimistic mutation). My verification below focuses on claims I could check against the actual repo/installed packages, not just the plans' own assertions.

## Strengths

- **`docs/api/kanban-board-openapi.json` verified directly**: `UpdateBoardRequestDTO.required = ["version"]` and `SaveBoardRequestDTO.required = ["name"]` (no version) — confirmed at lines 1042-1056 and 1210-1221. Plan 02-12's Pitfall-1 concern (rename must carry `version`) is real and correctly mitigated by `updateBoardBodySchema` requiring it server-side (Task 1, `app/api/boards/[boardId]/route.ts`).
- **`session.ts` pattern match is accurate**: `src/lib/server/session.ts:82-161`'s `createSessionService` factory (`{ create, verify, verifyToken, destroy }`) is a real, exact analog for the PC-03 `themeCookie`/`upstreamCookie` factory reshape — the plans' "mirror this shape" instruction is well-grounded, not hand-waved.
- **02-07's self-correction of its own upstream research is a genuine strength**: 02-RESEARCH.md's Pitfall 3 asserts "Base UI does not currently ship a public `Menu` primitive." I verified this directly — `node_modules/@base-ui/react/menu/` exists with `root`, `trigger`, `item`, `positioner`, `popup`, `submenu-root`, etc. (installed version 1.7.0, confirmed via `package.json`). Plan 02-07's Task 1 checkpoint explicitly catches this error before commit ("Fact 2 — that same pitfall contains an error... Confirm with `ls node_modules/@base-ui/react/menu`") and defaults to the correct choice (Option A, build a real `Menu` primitive). This is exactly the kind of verify-before-build discipline the review criteria are looking for, and it actually happened here rather than being asserted.
- **Toast module-scope-singleton avoidance is correct and verified**: `node_modules/@base-ui/react/toast/` ships both `createToastManager` and `useToastManager` as separate exports. Plan 02-07 deliberately avoids `createToastManager()` at module scope (correctly citing the SSR cross-request-leak hazard `query-client.tsx` already documents) and standardizes on `useToastManager()` reached from within components — this is checkable and correct given the installed API surface.
- **`userId` access-control discipline is consistent across every Route Handler plan.** Every plan (02-08 through 02-13) repeats the same acceptance-criteria pattern: grep for `record.id` as the only `userId` site, plus an explicit test case that sends a client-supplied `userId` and asserts it's ignored. This is the single most security-critical property in the phase (given the OpenAPI contract's oddity of `userId` being a required query param) and it's enforced mechanically, not just by convention, in every plan that touches a Route Handler.
- **02-06 (backend probe) correctly defers the two genuinely unverifiable facts** (list ordering, cross-account access control) to a blocking human checkpoint rather than letting downstream plans assume an answer — this matches the actual gap in 02-RESEARCH.md's Assumptions Log (A1/A2 truly could not be checked without live backend access).

## Concerns

- **HIGH — `useDeleteBoard`'s non-optimistic design and `onSuccess` cache write interact ambiguously with in-flight `useBoardFull` queries.** Plan 02-13 Task 2 calls `removeQueries({ queryKey: boardQueryKeys.full(boardId) })` on success, but nothing in Task 2 or Task 3 addresses what happens if a `useBoardFull(boardId)` query is *actively fetching* at the moment of deletion (e.g., user has the board's tab prefetched or React Query refetch-on-focus fires mid-delete). `removeQueries` cancels registered observers but a fetch already in flight can still resolve and call `setQueryData` after removal, silently repopulating a "deleted" board's cache entry. The plan doesn't specify `cancelQueries` before `removeQueries`, unlike the rename mutation which correctly calls `cancelQueries` in `onMutate`.
- **MEDIUM — Plan 02-10's `useCreateBoardColumns` (the D-04 retry mutation) is asserted to share "one implementation" with the initial sequential loop in `useCreateBoard`, but no task actually specifies what happens if the retry's own subset of columns *also* partially fails.** The plan says "raises the same toast again with the still-failing names" but doesn't specify whether retry state stacks (does a second failed retry toast replace or add to the first?), and no behavior bullet in Task 2 tests a retry-of-a-retry. Given D-04 is this phase's most detailed failure-mode decision, a second-order partial failure during retry is a plausible real scenario (flaky network) that's untested.
- **MEDIUM — 02-07's Menu primitive decision checkpoint (Task 1) is `gate="blocking-human"` but plans 02-09 through 02-13 are written assuming Option A (the new `Menu` primitive) with no fallback instructions actually spelled out for Option B beyond "if Option B, apply Pitfall 3's workarounds."** If the developer picks Option B, essentially every downstream plan's read_first/action sections referencing `Menu.Root`/`Menu.Item` need re-deriving on the fly during execution rather than having a pre-written alternate path — this is a real re-planning cost the phase doesn't budget for.
- **LOW — Plan 02-06's probe script (Task 1) risks violating its own two-concurrent-session budget.** The script creates account A, then account B, and must sign in as B twice (once for the `userId=B` legit call, once for the `userId=A` IDOR attempt, plus a `DELETE` attempt) — that's potentially 3 authenticated actions from one sign-up session depending on how many separate `request.post` sign-in calls are needed versus reusing one cookie. The plan says "Do not reuse one account across both roles and do not sign the same account in more than twice," which is a correct constraint, but nothing enforces it beyond prose — a scripting mistake here would produce a cryptic 401 that looks like a different bug (same failure mode `e2e/fixtures.ts`'s own comment warns about for e2e specs, but this script isn't using that established fixture pattern at all).
- **LOW — 02-11's `useEffect`-forbidding acceptance criterion is a blunt instrument.** `grep -cE 'useEffect'` returning 0 for both page files is used as proof the redirect is server-side, but this also forbids any legitimate client-side `useEffect` a later revision might need in these Server Components (which shouldn't have any `useEffect` anyway since they're Server Components) — low risk, but the grep is checking a tautology (a Server Component can't have `useEffect` at all) rather than actually verifying the redirect fires before data reaches the browser.

## Suggestions

- Add an explicit `onMutate: () => queryClient.cancelQueries({ queryKey: boardQueryKeys.full(boardId) })`-equivalent step (or at minimum a `cancelQueries` before the `removeQueries` call) to `useDeleteBoard` in plan 02-13 Task 2, and add a behavior bullet asserting an in-flight full-board fetch that resolves after the delete does not repopulate the cache.
- In plan 02-10, add one behavior bullet to Task 2 or 02-13's retry test explicitly covering "retry itself partially fails" — even just asserting the toast updates to reflect the new (smaller) failed-name set rather than being silently overwritten or duplicated.
- Since 02-07's Menu-vs-Dropdown decision gates nine downstream plans' concrete code shape, consider moving that checkpoint even earlier (before 02-06) or writing a short concrete Option-B code sketch analogous to what exists for Option A, so a developer choosing B doesn't have to improvise architecture mid-execution.

## Risk Assessment

**LOW-to-MEDIUM.** The phase's structure (prerequisite cleanup → backend probe → tracer → breadth) correctly sequences the highest-uncertainty items first, and the plans are unusually well-grounded in actual file reads rather than assumed patterns. The two concrete correctness gaps I found (delete/full-board race, retry-of-retry) are narrow, testable, and don't threaten the phase's success criteria — they're the kind of thing a code reviewer would catch during 02-13's or 02-10's actual execution, not architectural flaws.

---

## Consensus Summary

Only one reviewer lane (`claude`) produced output this run, so there is no cross-model consensus
to synthesize — the findings above are a single reviewer's assessment, not agreement across
independent systems. Treat the Concerns section as the actionable output of this run.

### Agreed Strengths
N/A — single-reviewer run.

### Agreed Concerns
N/A — single-reviewer run. See the Concerns list above (one HIGH, two MEDIUM, two LOW) for the
`claude` lane's individual findings.

### Divergent Views
N/A — single-reviewer run.
