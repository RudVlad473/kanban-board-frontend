---
phase: 01-foundation-auth-preferences
plan: 37
subsystem: infra
tags: [eslint, eslint-plugin-boundaries, lib-restructure, module-layering, server-only, static-analysis]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "01-36's three-ring eslint-plugin-boundaries policy (lib-core/lib-server/lib-client) plus the transitional lib-legacy* scaffold, and the pure ring already moved into src/lib/core/"
provides:
  - "src/lib/server/ holding the whole server-only ring (session.ts, dal.ts, server-client.ts, session-cookie.ts + tests) and src/lib/client/ holding the browser/React-runtime ring (query-client.tsx), with every importer repointed"
  - "features/auth/ gains its fourth-and-fifth recognised per-feature file kinds: model.ts (resolveDisplayName, GC-26) and schemas.ts (the auth Zod schemas, GC-27), plus actions.ts (renamed off the api/auth- prefix) and action-state.ts (a plan-unlisted sibling file this round also had to relocate)"
  - "src/lib/ holds only its three ring folders (core/server/client) at its root — no orphan file, no flat api/ or validation/ folder — and eslint.config.mjs's transitional lib-legacy*/lib-legacy-api/lib-legacy-validation scaffold from 01-36 is fully removed, leaving only the strict ring-directional boundaries policy"
affects: ["01-38"]

# Actuals (#2632)
actuals:
  tokens: 10265
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The 01-36 ring-move mechanism (git mv preserving history, ring-element-before-legacy-element ordering, blanket transitional policy) repeated to completion — server/client rings and feature-local pure modules moved, then the transitional scaffold torn down once the last flat file left"
    - "A plan's read_first/file inventory can go stale between authoring and execution when an intervening checkpoint session splits a file the plan didn't know about (auth-action-state.ts, split out of auth-actions.ts during 01-33's own checkpoint fix) — the plan's own must_haves truth (folder fully emptied) is what caught the gap, not the file list"

key-files:
  created: []
  modified:
    - eslint.config.mjs
    - src/lib/server/session.ts (moved from src/lib/session.ts)
    - src/lib/server/session.test.ts (moved)
    - src/lib/server/dal.ts (moved from src/lib/dal.ts)
    - src/lib/server/server-client.ts (moved from src/lib/api/server-client.ts)
    - src/lib/server/server-client.integration.test.ts (moved)
    - src/lib/server/session-cookie.ts (moved from src/lib/api/session-cookie.ts)
    - src/lib/server/session-cookie.unit.test.ts (moved)
    - src/lib/client/query-client.tsx (moved from src/lib/query-client.tsx)
    - src/features/auth/model.ts (moved from src/lib/display-name.ts)
    - src/features/auth/model.unit.test.ts (moved)
    - src/features/auth/schemas.ts (moved from src/lib/validation/auth-schemas.ts)
    - src/features/auth/schemas.unit.test.ts (moved)
    - src/features/auth/actions.ts (moved from src/features/auth/api/auth-actions.ts)
    - src/features/auth/actions.unit.test.ts (moved)
    - src/features/auth/action-state.ts (moved from src/features/auth/api/auth-action-state.ts, deviation)
    - src/test-utils/actions-storybook-stub.ts (renamed from auth-actions-storybook-stub.ts)
    - proxy.ts, app/layout.tsx, app/(dashboard)/layout.tsx, .storybook/preview-annotations.tsx
    - src/test-utils/render-with-providers.tsx, src/test-utils/api-base-url.ts
    - src/features/auth/components/{sign-in-form,sign-up-form,sign-out-button}.tsx and their .test.tsx
    - vitest.config.ts, e2e/fixtures.ts, src/lib/core/api-contract/problem-detail.ts

key-decisions:
  - "Moved src/features/auth/api/auth-action-state.ts -> src/features/auth/action-state.ts even though the plan's file list never named it — this sibling file was split out of auth-actions.ts during 01-33's own checkpoint session (a '\"use server\" module can only export async functions' fix) after this plan was authored, and it was the only remaining occupant of src/features/auth/api/ once actions.ts and actions.unit.test.ts moved. The plan's own must_haves truth ('src/features/auth/api/ ... fully emptied') and Task 3's verify gate (test ! -e src/features/auth/api) are both unsatisfiable without moving it too, so this was applied as a Rule 1/2 deviation (blocking-issue / plan-cannot-complete-its-own-truths), not an architectural decision — same mechanical git-mv-and-repoint pattern as every other file in this plan, just one the plan's read_first list missed."
  - "proxy.ts (repo root, not under src/app/scripts/.storybook) imports @/lib/session — missed by the plan's own verify grep pattern (scoped to src app scripts .storybook, the same blind spot 01-36 hit for two e2e specs' relative imports). Caught immediately by pnpm build's Turbopack module-not-found error in Task 1's own verify gate, fixed before commit."
  - "Fixed several stale plain-prose path references in doc comments (problem-detail.ts, api-base-url.ts, actions.unit.test.ts, sign-in-form.tsx, sign-up-form.tsx, e2e/fixtures.ts, vitest.config.ts) that the plan's exact-match verify greps wouldn't have caught (quoted-import-only patterns) but would have left misleading pointers to now-nonexistent paths."

patterns-established:
  - "eslint.config.mjs's section-7 boundaries policy is now the strict three-ring end state with no transitional scaffold — any future lib/ restructure should introduce its own transitional elements/policies rather than reusing these instructions as a template that already assumes a settled ring layout."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "The server ring (session.ts, dal.ts, server-client.ts, session-cookie.ts + tests) lives under src/lib/server/ and the client ring (query-client.tsx) under src/lib/client/, with every importer across src/app/proxy.ts/.storybook/test-utils repointed and the boundaries policy from 01-36 enforcing ring directionality"
    verification:
      - kind: other
        ref: "pnpm build && pnpm lint && pnpm exec tsc --noEmit — exit 0 (Turbopack's module-not-found on proxy.ts's stale import caught in Task 1, fixed before commit)"
        status: pass
      - kind: unit
        ref: "pnpm vitest run --project browser --project unit --project storybook --project node — 399/399 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "resolveDisplayName lives at features/auth/model.ts (GC-26) and the auth Zod schemas at features/auth/schemas.ts (GC-27), both consumed only from within the auth feature, with every importer (auth-actions, sign-in-form, sign-up-form) repointed to the @/features/auth/* alias and no assertion changed in either moved test"
    verification:
      - kind: other
        ref: "pnpm build && pnpm lint && pnpm exec tsc --noEmit — exit 0"
        status: pass
      - kind: unit
        ref: "pnpm vitest run --project browser --project unit --project node — 327/327 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "The auth server-function module is features/auth/actions.ts (renamed off api/auth-), its sibling action-state.ts moved alongside it (deviation), the three emptied folders (features/auth/api/, lib/api/, lib/validation/) and src/lib/'s orphan .gitkeep are gone, src/lib/ holds only its three ring folders, and eslint.config.mjs's transitional lib-legacy*/lib-legacy-api/lib-legacy-validation scaffold is fully removed leaving only the strict ring policy"
    verification:
      - kind: other
        ref: "pnpm build && pnpm lint && pnpm exec tsc --noEmit — exit 0; grep -c lib-legacy eslint.config.mjs — 0"
        status: pass
      - kind: unit
        ref: "pnpm test (full Vitest suite) — 405/405 passed (one real-backend integration test flaked on a 5000ms timeout under concurrent-project resource contention on the first run, confirmed as a flake by an isolated rerun and a clean full-suite rerun)"
        status: pass
      - kind: e2e
        ref: "pnpm exec playwright test --project e2e — 8/8 passed (sign-up, sign-in, sign-out, route-guard scenarios against real nonprod)"
        status: pass
    human_judgment: false

duration: 34min
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 37: Server/Client Ring Move + Auth Feature-File Naming Summary

**Moved `src/lib/`'s server-only ring (`session.ts`, `dal.ts`, `server-client.ts`, `session-cookie.ts`) into `lib/server/`, the browser ring (`query-client.tsx`) into `lib/client/`, the auth-only pure modules into `features/auth/model.ts`/`schemas.ts`, renamed `auth-actions.ts` to `actions.ts`, and removed the transitional `lib-legacy*` eslint scaffold plan 01-36 introduced — completing GC-25/GC-26/GC-27/GC-28's round-4 gap closure.**

## Performance

- **Duration:** ~34 min
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 33 (16 moved/renamed via `git mv`, 17 importer/doc-comment repoints; one deletion — `src/lib/.gitkeep`)

## Accomplishments
- The server-only ring (`session.ts`, `session.test.ts`, `dal.ts`, `server-client.ts`, `server-client.integration.test.ts`, `session-cookie.ts`, `session-cookie.unit.test.ts`) now lives under `src/lib/server/`; the browser/React-runtime ring (`query-client.tsx`) lives under `src/lib/client/`. Every importer across `src/`, `app/`, `proxy.ts`, `.storybook/`, and `src/test-utils/` repointed; `vitest.config.ts`'s `node` project `include` glob names the relocated `session.test.ts`.
- `resolveDisplayName` (the auth domain's pure display-name derivation) now lives at `src/features/auth/model.ts` — the fourth recognised per-feature file kind (GC-26). The auth Zod schemas now live at `src/features/auth/schemas.ts` (GC-27), forced by GC-28's strict-disallow default leaving no home for an unmatched flat file.
- The auth server-function module is renamed `src/features/auth/actions.ts` (off its `api/auth-` prefix); its `AuthActionState`/`AUTH_ACTION_IDLE` sibling — split out during 01-33's checkpoint session, after this plan was authored — moved alongside it to `src/features/auth/action-state.ts`, so `src/features/auth/api/` is genuinely empty and removable.
- Three emptied folders (`src/features/auth/api/`, `src/lib/api/`, `src/lib/validation/`) and `src/lib/`'s stray `.gitkeep` orphan are all gone; `src/lib/` at its root holds only `core/`, `server/`, `client/`.
- `eslint.config.mjs`'s transitional `lib-legacy`/`lib-legacy-api`/`lib-legacy-validation` boundaries elements and their blanket permissive policies (introduced by 01-36 to keep lint green mid-move) are fully removed, leaving only the strict three-ring `lib-core`/`lib-server`/`lib-client` directional policy — verified by a `grep -c lib-legacy eslint.config.mjs` returning 0.
- Full gate green after all three tasks: `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`, the full Vitest suite (`pnpm test`, 405/405), and Playwright's `e2e` project (8/8, real sign-up/sign-in/sign-out/route-guard flows against live nonprod).

## Task Commits

Each task was committed atomically:

1. **Task 1: Move the server ring and the client ring** - `3630882` (feat)
2. **Task 2: Move the auth-only pure modules into the feature — model.ts and schemas.ts** - `36e257f` (feat)
3. **Task 3: Rename auth-actions to actions.ts, delete the three emptied folders, and remove the transitional legacy eslint scaffold** - `d10d5bc` (feat)

_No plan-metadata commit in this worktree — the orchestrator writes STATE.md/ROADMAP.md/REQUIREMENTS.md after the wave merges._

## Files Created/Modified
- `src/lib/server/{session,dal,server-client,session-cookie}.ts` + tests - moved from `src/lib/` and `src/lib/api/` (git mv, history preserved)
- `src/lib/client/query-client.tsx` - moved from `src/lib/query-client.tsx`
- `src/features/auth/model.ts`, `model.unit.test.ts` - moved from `src/lib/display-name.ts` + test (GC-26)
- `src/features/auth/schemas.ts`, `schemas.unit.test.ts` - moved from `src/lib/validation/auth-schemas.ts` + test (GC-27)
- `src/features/auth/actions.ts`, `actions.unit.test.ts` - moved from `src/features/auth/api/auth-actions.ts` + test (GC-27)
- `src/features/auth/action-state.ts` - moved from `src/features/auth/api/auth-action-state.ts` (deviation — see below)
- `src/test-utils/actions-storybook-stub.ts` - renamed from `auth-actions-storybook-stub.ts`, matching the renamed module it stands in for
- `proxy.ts` - repoints `@/lib/session` -> `@/lib/server/session` (missed by the plan's own verify grep scope, caught by `pnpm build`)
- `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `.storybook/preview-annotations.tsx`, `src/test-utils/render-with-providers.tsx` - repointed to `@/lib/client/query-client` / `@/lib/server/dal`
- `src/features/auth/components/{sign-in-form,sign-up-form,sign-out-button}.tsx` + their `.test.tsx` - repointed to `@/features/auth/{actions,action-state,schemas}`
- `eslint.config.mjs` - three transitional `lib-legacy*` elements and policies removed, section-7 comment rewritten to describe only the strict end-state ring policy
- `vitest.config.ts` - node-project `include` glob repointed to `src/lib/server/session.test.ts`; storybook-project alias repointed to `@/features/auth/actions` / `actions-storybook-stub.ts`
- `e2e/fixtures.ts`, `src/lib/core/api-contract/problem-detail.ts` - stale doc-comment path references fixed

## Decisions Made
- Moved `src/features/auth/api/auth-action-state.ts` (a file the plan's read_first/file list never named, because it was split out of `auth-actions.ts` during 01-33's own checkpoint session after this plan was authored) to `src/features/auth/action-state.ts` alongside `actions.ts` — required for the plan's own must_haves truth that `src/features/auth/api/` is "fully emptied" and for Task 3's verify gate (`test ! -e src/features/auth/api`), both of which are unsatisfiable while this file remains. Applied as a Rule 1/2 deviation (blocking issue), following the exact same git-mv-and-repoint mechanism the plan already applies to its sibling files, dropping the redundant `auth-` prefix per GC-27's own naming convention.
- Used `@/features/auth/model` / `@/features/auth/schemas` / `@/features/auth/action-state` path-alias imports (not relative `./model` etc.) in `auth-actions.ts`/`actions.ts` per CONVENTIONS.md D-26q ("no relative imports") — the plan's own decisions section only says the move "becomes an intra-feature import," without specifying alias-vs-relative, so the project's blanket no-relative-imports convention governed. `actions.unit.test.ts`'s pre-existing relative imports of its own co-located sibling files (`./action-state`, `./actions`) were left as relative — pre-existing style in that file, not something Task 3's action list asked to change, and eslint's `import-x/order` rule (the only import-shape rule actually configured) does not forbid relative imports.
- Left one purely historical, past-tense doc-comment mention of the pre-rename filename in `vitest.setup.unit.ts` ("found writing `actions.unit.test.ts`, then named `auth-actions.unit.test.ts`") rather than scrubbing it entirely — it narrates when a bug was discovered, not a live path claim, so updating it was optional polish rather than a correctness fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/2 - Blocking/Missing] `src/features/auth/api/auth-action-state.ts` was not in the plan's move list but had to move for the plan's own truths to hold**
- **Found during:** Task 3, confirming `src/features/auth/api/` was empty before removal
- **Issue:** The plan's Task 3 only lists `auth-actions.ts` and `auth-actions.unit.test.ts` as movable out of `src/features/auth/api/`. A third file, `auth-action-state.ts` (holding `AuthActionState`/`AUTH_ACTION_IDLE`), was split out of `auth-actions.ts` during 01-33's own checkpoint session — after this plan was authored — because a `"use server"` module can only export async functions. Six component/test files import it directly. Left in place, `src/features/auth/api/` would not be empty, contradicting the plan's own must_haves truth and failing Task 3's `test ! -e src/features/auth/api` verify check.
- **Fix:** `git mv src/features/auth/api/auth-action-state.ts src/features/auth/action-state.ts` (dropping the redundant `auth-` prefix, matching `actions.ts`/`model.ts`/`schemas.ts`'s naming), then repointed all seven importers (`actions.ts` itself, `sign-in-form.tsx`/`.test.tsx`, `sign-out-button.tsx`/`.test.tsx`, `sign-up-form.tsx`/`.test.tsx`, and `actions.unit.test.ts`'s own relative import).
- **Files modified:** `src/features/auth/action-state.ts` (moved), `src/features/auth/actions.ts`, `src/features/auth/actions.unit.test.ts`, `src/features/auth/components/{sign-in-form,sign-out-button,sign-up-form}.tsx` and their `.test.tsx`
- **Verification:** `pnpm build`/`lint`/`tsc --noEmit`/`pnpm test`/`pnpm exec playwright test --project e2e` all exit 0; `test ! -e src/features/auth/api` passes.
- **Committed in:** `d10d5bc` (Task 3 commit)

**2. [Rule 1 - Bug] `proxy.ts` (repo root) imports `@/lib/session`, missed by the plan's own verify-grep scope**
- **Found during:** Task 1, `pnpm build`'s Turbopack step
- **Issue:** `proxy.ts` sits at the repo root, outside the plan's verify grep's `src app scripts .storybook` scope (the same class of blind spot 01-36 hit for two e2e specs' relative imports). `pnpm build` failed with `Module not found: Can't resolve '@/lib/session'`.
- **Fix:** Repointed to `@/lib/server/session`. Ran a repo-wide grep afterward (not scoped to the plan's four directories) to confirm no other root-level or e2e/visual importer was missed — none found.
- **Files modified:** `proxy.ts`
- **Verification:** `pnpm build` exits 0 after the fix.
- **Committed in:** `3630882` (Task 1 commit)

**3. [Rule 1 - Bug] Stale plain-prose path references in doc comments across several files**
- **Found during:** Tasks 1-3, via repo-wide greps for the old path strings beyond the plan's quoted-import-only verify pattern
- **Issue:** `problem-detail.ts`, `api-base-url.ts`, `actions.unit.test.ts`, `server-client.integration.test.ts`, `sign-in-form.tsx`, `sign-up-form.tsx`, `e2e/fixtures.ts`, and `vitest.config.ts` each carried a doc comment pointing at a pre-move file path (e.g. `src/lib/session.ts`, `src/lib/validation/auth-schemas.ts`) in plain prose, not a quoted import string — invisible to the plan's own verify greps but misleading to a future reader.
- **Fix:** Updated each to the new path.
- **Files modified:** listed above
- **Verification:** manual grep confirmed no remaining plain-prose references to a pre-move path (excluding one deliberately-left historical narrative note in `vitest.setup.unit.ts` — see Decisions Made).
- **Committed in:** `3630882`, `36e257f`, `d10d5bc` (spread across all three task commits, alongside the task each file's move belonged to)

---

**Total deviations:** 3 auto-fixed (1 blocking/missing-file, 1 bug, 1 bug/doc-accuracy)
**Impact on plan:** All three were necessary for correctness — #1 for the plan's own stated must_haves and verify gate to be satisfiable at all, #2 for the build to pass, #3 for doc accuracy only (no functional risk). No scope creep, no architectural change.

## Issues Encountered
- The real-backend integration test (`server-client.integration.test.ts`) timed out at its 5000ms limit on the first full-suite run in both Task 1 and Task 3's verify passes — a live network round-trip against nonprod under concurrent-project resource contention (the same flake class STATE.md's 01-33/01-36 sessions already documented), not a regression. Confirmed by re-running the `node` project alone (passed) and by a subsequent clean full-suite run (405/405, including this test).
- One `pnpm test` run (Task 3, second attempt) produced 7 unrelated browser-project timeouts (Modal focus-trap, Button click, form field-validation screenshots) under the same resource-contention pattern; a clean rerun immediately after came back 33/33 files, 405/405 tests passed with no changes made in between — confirmed as system load, not a regression from this plan's moves.

## User Setup Required
None - no external service configuration required. Local `pnpm build`/`pnpm exec tsc --noEmit` runs used the same pre-existing documented workaround as 01-36 (inline, non-persisted `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` shell env vars, never written to `.env.local`) for the pre-existing local-build gap noted in STATE.md.

## Next Phase Readiness
- GC-25 (server/client rings), GC-26 (`model.ts`), GC-27 (feature-file naming) and GC-28's enforcement (the strict three-ring boundaries policy with the transitional scaffold now fully removed) are all in place. `src/lib/` is exactly three disjoint rings; `src/features/auth/` holds `model.ts`, `schemas.ts`, `actions.ts`, and `action-state.ts`.
- Plan 01-38 (GC-30's documentation) is next — it should account for `action-state.ts` as a fifth per-feature file kind alongside `model.ts`/`actions.ts`/`schemas.ts`/`api.ts`/`types.ts`/`hooks/`/`components/` when it documents the final `features/<domain>/` shape in CONVENTIONS.md, since this plan discovered it wasn't in the original design doc's file inventory.
- No blockers for 01-38.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*

## Self-Check: PASSED

All moved/created files verified present on disk (src/lib/server/session.ts,
src/lib/client/query-client.tsx, src/features/auth/model.ts,
src/features/auth/schemas.ts, src/features/auth/actions.ts,
src/features/auth/action-state.ts, src/test-utils/actions-storybook-stub.ts).
All three now-empty folders confirmed gone (src/features/auth/api,
src/lib/api, src/lib/validation). All three task commits (3630882, 36e257f,
d10d5bc) verified present in `git log`.
