---
phase: quick-260908-g4p
plan: 01
subsystem: api
tags: [tanstack-query, cache-keys, refactor]

requires: []
provides:
  - QUERY_KEY (src/lib/core/query-keys/query-keys.ts) as the single declaration for both board-family cache keys
  - keys:check gate wired into pnpm verify, gates:check and CI
affects: [260908-g5y, 260908-g61, 260908-g5z, 260908-g63]

actuals:
  tokens: 5973
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "QUERY_KEY as-const object mirrors mutation-keys.ts's MUTATION_KEY shape — the query-cache half of the same declaration pattern"

key-files:
  created:
    - src/lib/core/query-keys/query-keys.ts
    - scripts/check-query-keys.mjs
    - scripts/check-query-keys.unit.test.mjs
  modified:
    - src/lib/core/query-keys/board-query-key.ts
    - src/components/layout/board-query-defaults/board-query-defaults.tsx
    - src/features/boards/queries/boards-query.ts
    - src/features/boards/server/dehydrate-boards.ts
    - src/features/boards/hooks/use-create-board.ts
    - src/features/boards/hooks/use-rename-board.ts
    - src/features/boards/hooks/use-delete-board.ts
    - scripts/verify.mjs
    - .github/workflows/ci.yml
    - package.json

key-decisions:
  - "QK_BASE anchor is 6d633c457b6d0c76fc31654b5322e203d50a3a50 (HEAD at plan start), not main — main is 542 commits away and already carries 12 board-key lines on an untouched tree"
  - "keys:check blanks // and /* */ comments before matching so the nine files carrying the singular board key only in load-bearing prose (docs/adr/tech/0030) survive the gate"
  - "keys:check scopes to src/**, app/** only — e2e/ is excluded because it holds no QueryClient and e2e/seed.ts:52 builds a CLI argv array shaped exactly like a key"

patterns-established:
  - "keys:check follows check-routes.mjs's shape (pure findViolations({source}) + runCli via globRealFiles) but adds a comment-blanking pass check-routes.mjs does not need"

requirements-completed: [QK-01]

coverage:
  - id: D1
    description: "QUERY_KEY declared once in src/lib/core/query-keys/query-keys.ts, both members as-const array literals; buildBoardQueryKey and setQueryDefaults route through it"
    requirement: "QK-01"
    verification:
      - kind: unit
        ref: "src/lib/core/query-keys/board-query-key.unit.test.ts (2 tests)"
        status: pass
      - kind: unit
        ref: "src/components/layout/board-view/board-view.test.tsx (236 tests, browser project)"
        status: pass
    human_judgment: false
  - id: D2
    description: "BOARDS_QUERY_KEY and BOARD_QUERY_KEY_PREFIX fully retired; every emitted key array byte-identical to before"
    requirement: "QK-01"
    verification:
      - kind: other
        ref: "rg -n 'BOARDS_QUERY_KEY|BOARD_QUERY_KEY_PREFIX' src/ app/ e2e/ — empty"
        status: pass
      - kind: other
        ref: "key-string identity diff against QK_BASE 6d633c4 — both sides exactly {\"board\", \"boards\"}"
        status: pass
    human_judgment: false
  - id: D3
    description: "keys:check gate added and wired into package.json, verify.mjs and ci.yml; falsified in both directions"
    requirement: "QK-01"
    verification:
      - kind: unit
        ref: "scripts/check-query-keys.unit.test.mjs (6 tests, --project node)"
        status: pass
      - kind: other
        ref: "verify chain: pnpm keys:check clean, then a deliberately reintroduced literal in boards-query.ts made node scripts/check-query-keys.mjs exit 1, then git checkout restore made it exit 0 again, then gates:check passed — printed BOTH DIRECTIONS CONFIRMED"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-09-08
status: complete
---

# Quick Task 260908-g4p: Consolidate every TanStack Query cache key Summary

**Collapsed `["boards"]` and `["board"]` — previously declared in `boards-query.ts` and duplicated inside `board-query-key.ts` itself — into one `QUERY_KEY` object in `src/lib/core/query-keys/query-keys.ts`, mirroring the shipped `MUTATION_KEY` pattern, and added a `keys:check` gate (wired into `pnpm verify`, `gates:check` and CI) that fails on any raw board-key literal reintroduced in code while ignoring the same literal inside a prose comment.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 10 modified, 3 created (13 total)
- **Commits:** 3 task commits (cd8acef, 03616f3, 5904e1d)

## QK_BASE

`6d633c457b6d0c76fc31654b5322e203d50a3a50` — captured via `git rev-parse HEAD` before Task 1's first edit, exactly the plan's starting SHA reported by the orchestrator. Anchored per the plan's explicit instruction: `main` sits 542 commits behind this branch and already carries 12 board-key lines on an untouched tree, so a `main`-anchored diff cannot isolate this refactor's own moves.

## Accomplishments

- `src/lib/core/query-keys/query-keys.ts` created: `QUERY_KEY = { BOARDS: ["boards"], BOARD: ["board"] } as const satisfies Record<string, readonly unknown[]>` — a plain `as const` object, never a `enum` (ADR tech/0012 forbids enums project-wide, and an enum cannot hold an array value regardless).
- `buildBoardQueryKey` rebuilt to spread `QUERY_KEY.BOARD` ahead of `boardId`; name, parameter and `readonly unknown[]` return type unchanged, so its ~30 `buildBoardQueryKey`-calling sites needed zero edits.
- `BOARD_QUERY_KEY_PREFIX` (declared in `board-query-key.ts`) and `BOARDS_QUERY_KEY` (declared in `boards-query.ts`) both fully retired. Their five importers — `board-query-defaults.tsx`, `dehydrate-boards.ts`, `use-create-board.ts`, `use-rename-board.ts`, `use-delete-board.ts` — now import `QUERY_KEY` from `@/lib/core/query-keys/query-keys`.
- Both retired constants' doc comments were real information and were moved, not dropped: the "sidebar and header both read this" comment now sits on `QUERY_KEY.BOARDS`; the "what `setQueryDefaults` is registered against" comment now sits on `QUERY_KEY.BOARD`.
- `scripts/check-query-keys.mjs` added: a pure `findQueryKeyViolations({ source })` plus a `runCli`, in the shape of `check-no-play-functions.mjs`. Blanks `//` and `/* */` comments (preserving newlines, so reported line numbers stay accurate) before matching a bracketed `["board"]`/`["boards"]`-shaped literal, scoped to `src/**` and `app/**` only, with `query-keys.ts` itself excluded by absolute path.
- Wired in one commit: `package.json`'s `keys:check` alias (beside `routes:check`), `scripts/verify.mjs`'s `VERIFY_STEPS` (immediately after `routes`), and `.github/workflows/ci.yml`'s `quality` job (immediately after "Route declaration check").

## Task Commits

Each task was committed atomically:

1. **Task 1: Declare QUERY_KEY and route the board key family through it** — `cd8acef` (feat)
2. **Task 2: Retire BOARDS_QUERY_KEY across its four importers** — `03616f3` (refactor)
3. **Task 3: Add the keys:check gate and wire it into verify, gates:check and CI together** — `5904e1d` (feat, tdd)

No separate plan-metadata commit was made — `commit_docs` behavior for this quick task follows the orchestrator's own final-commit step, run after this SUMMARY is written.

## Files Created/Modified

- `src/lib/core/query-keys/query-keys.ts` — new, the single `QUERY_KEY` declaration
- `src/lib/core/query-keys/board-query-key.ts` — `buildBoardQueryKey` spreads `QUERY_KEY.BOARD`; `BOARD_QUERY_KEY_PREFIX` deleted
- `src/components/layout/board-query-defaults/board-query-defaults.tsx` — imports and registers `QUERY_KEY.BOARD`
- `src/features/boards/queries/boards-query.ts` — `BOARDS_QUERY_KEY` deleted, `queryOptions` points at `QUERY_KEY.BOARDS`
- `src/features/boards/server/dehydrate-boards.ts`, `use-create-board.ts`, `use-rename-board.ts`, `use-delete-board.ts` — import `QUERY_KEY` instead of `BOARDS_QUERY_KEY`
- `scripts/check-query-keys.mjs` — new gate script
- `scripts/check-query-keys.unit.test.mjs` — new, 6 tests (RED before implementation existed, GREEN after)
- `scripts/verify.mjs`, `.github/workflows/ci.yml`, `package.json` — `keys:check` wired into all three

## Decisions Made

- Followed the plan's `<planner_findings>` verbatim on the call-site list — re-derived with `rg -n 'BOARDS_QUERY_KEY|BOARD_QUERY_KEY_PREFIX' src/ app/ e2e/` at Task 1 start and it matched the plan's stated five importers exactly; no drift found.
- Import ordering: `sed`-based symbol replacement placed the new `@/lib/core/query-keys/query-keys` import out of the project's alphabetical-by-path ESLint order in four files (`use-create-board.ts`, `use-rename-board.ts`, `use-delete-board.ts`). Reordered manually before running gates; `eslint --fix` in the pre-commit hook made no further changes, confirming the manual ordering was already correct.
- Did not touch `scripts/check-ci-gate-coverage.mjs`, per the plan's explicit instruction — it derives coverage from `VERIFY_STEPS[].ciCommand` at run time and needed no edit.

## Deviations from Plan

None — plan executed exactly as written, including the deliberately-non-obvious verification instructions the plan called out (`--project node` not `--project unit` for the new test file; `QK_BASE` anchored to the plan's own start SHA rather than `main`).

## Verification — full plan `<verification>` section, run in order

1. `pnpm exec tsc --noEmit` — clean, exit 0.
2. `rg -n 'BOARDS_QUERY_KEY|BOARD_QUERY_KEY_PREFIX' src/ app/ e2e/` — no matches (rg exit 1).
3. `rg -n 'QUERY_KEY\.' src/ | wc -l` — **17** hits; every file using `QUERY_KEY.` imports it from `@/lib/core/query-keys/query-keys` (confirmed for all 7 files: `board-query-key.ts`, `board-query-defaults.tsx`, `dehydrate-boards.ts`, `use-delete-board.ts`, `use-create-board.ts`, `use-rename-board.ts`, `boards-query.ts`).
4. **Key-string identity diff, anchored to `QK_BASE`:** `diff` of the sorted `'board...'` string sets on the removed vs. added sides of `git diff 6d633c4..HEAD -- src/` — **exit 0, identical sets**. Both sides are exactly `"board"` and `"boards"`, nothing more, nothing less.
5. `pnpm exec vitest run --project unit` — **386/386 passed** (23 files). `pnpm exec vitest run --project browser src/components/layout/board-view/board-view.test.tsx` — **236/236 passed**. `pnpm exec vitest run --project node scripts/check-query-keys.unit.test.mjs` — **6/6 passed**.
6. `node scripts/check-query-keys.mjs && node scripts/check-routes.mjs && node scripts/check-ci-gate-coverage.mjs && node scripts/check-coverage-pointers.mjs && node scripts/check-comment-length.mjs` — all five passed (`keys:check passed`, `routes:check passed`, `gates:check passed`, `coverage:check passed — 166 source files scanned`, `comments:check passed`).
7. `pnpm lint` — clean, exit 0.

The e2e suite was deliberately NOT run, per the plan's explicit instruction — this is a compile-level refactor with no runtime surface, and e2e dials the shared real nonprod backend.

## Gate falsified in both directions (Task 3's `<verify>`)

Ran the plan's exact command chain. Output, condensed:

```
$ node scripts/check-query-keys.mjs
keys:check passed — no board query-key literal found outside its declaration file.
$ printf '\nconst STRAY = ["boards"] as const;\n' >> src/features/boards/queries/boards-query.ts
$ node scripts/check-query-keys.mjs
keys:check failed — a raw board query-key literal was found outside its declaration file:
  src/features/boards/queries/boards-query.ts:33
Import QUERY_KEY from '@/lib/core/query-keys/query-keys' (or the relative equivalent) instead.
$ git checkout -- src/features/boards/queries/boards-query.ts
$ node scripts/check-query-keys.mjs
keys:check passed — no board query-key literal found outside its declaration file.
$ node scripts/check-ci-gate-coverage.mjs
gates:check passed — every .github/workflows/ci.yml job is scanned or a documented exception.
BOTH DIRECTIONS CONFIRMED
```

**Both directions were actually observed, not assumed:** the PASSING direction ran twice (clean tree before the injection, restored tree after), and the FAILING direction was checked once — exit code 1, with the correct file and line number (`boards-query.ts:33`) named in the gate's own error output. `git status --short src/features/boards/queries/boards-query.ts` was empty after the restore, confirming no stray diff survived. `pnpm keys:check` itself was also run directly (separately from the raw `node` invocations above) and passed, confirming `package.json`'s alias string resolves.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. This is a pure identifier consolidation.

## Next Phase Readiness

`260908-g5y`, `260908-g61`, `260908-g5z` and `260908-g63` — in that order — are now unblocked. They can be authored and executed against the final import names (`QUERY_KEY`, `@/lib/core/query-keys/query-keys`) rather than needing stale-symbol instructions for `BOARDS_QUERY_KEY`/`BOARD_QUERY_KEY_PREFIX`, which no longer exist anywhere in the tree.

No blockers. All gates, all named unit/browser tests, `tsc`, and `pnpm lint` are green at `HEAD` (`5904e1d`). Not pushed — per the orchestrator's instruction, pushing is deferred to the batch-level step after all five sequenced quick tasks settle.

---
*Quick task: 260908-g4p*
*Completed: 2026-09-08*
