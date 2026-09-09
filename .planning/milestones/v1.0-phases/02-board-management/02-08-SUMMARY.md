---
phase: 02-board-management
plan: 08
subsystem: boards
tags: [route-handler, tanstack-query, sidebar, e2e, real-backend]

requires:
  - phase: 02-board-management
    provides: "02-06's resolved backend facts (list order, id format, error shape, access control) and 02-07's Toast/Menu primitives (not consumed by this plan directly, but merged ahead of it)"
provides:
  - "First live Route Handler + TanStack Query call site in the app: GET /api/boards deriving userId from verifySession() only, never from the request."
  - "Board data spine every later board plan reuses: EXTERNAL_PATH, Board/isBoard/isBoardArray, boardsApi.list, boardQueryKeys, useBoards()."
  - "First real board UI: a 300px sidebar column in the dashboard shell listing the signed-in user's boards, with loading/error/populated/selected/empty states."
  - "e2e fixture helper createFixtureBoard, seeding boards against the real backend via the sign-up session's own cookie (no extra sign-in, preserving the 2-concurrent-session budget)."
affects: [02-09, 02-10, 02-11, 02-12, 02-13]

actuals:
  tokens: 72000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Route Handler pattern: verifySession() first, 401 on no session, userId always taken from the session record, upstream error widened through unknown before inspection, isBoardArray gates the response before it reaches the client (02-RESEARCH.md Pattern 1)."
    - "Client API wrapper import boundary: src/features/boards/api/boards-api.ts imports nothing from src/lib/server/, keeping externalApi's server-only guard from reaching a client bundle through an indirect chain."
    - "e2e fixtures reuse the sign-up response's own session cookie for authenticated setup calls (createFixtureBoard) instead of a separate sign-in, to not burn the account's 2-concurrent-session cap before a human/checkpoint reviewer gets a slot."

key-files:
  created:
    - src/lib/core/api-contract/external-paths.ts
    - app/api/boards/route.ts
    - app/api/boards/route.test.ts
    - src/features/boards/types.ts
    - src/features/boards/types.unit.test.ts
    - src/features/boards/api/boards-api.ts
    - src/features/boards/hooks/use-boards.ts
    - src/features/boards/hooks/use-boards.unit.test.ts
    - src/components/layout/sidebar/sidebar.tsx
    - src/components/layout/sidebar/sidebar.test.tsx
    - src/components/layout/sidebar/sidebar.stories.tsx
    - e2e/boards-list.e2e.spec.ts
    - src/test-utils/use-boards-storybook-stub.ts
  modified:
    - app/(dashboard)/layout.tsx
    - app/page.tsx
    - e2e/fixtures.ts
    - eslint.config.mjs
    - scripts/check-routes.mjs
    - src/components/layout/error-fallback/error-fallback.tsx
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-up-form.tsx
    - vitest.config.ts

key-decisions:
  - "Sidebar board links use real next/link Link (not a plain <a> copied from the auth-forms precedent) — a plain <a> caused a full-page reload on every board-row click, caught by the user directly using the app (not visible in any screenshot/DOM snapshot)."
  - "eslint.config.mjs hardened with no-restricted-syntax banning every raw <a> JSX element regardless of href shape (escalating past @next/next/no-html-link-for-pages, which only fires on a static string-literal href and missed this bug's href={boardDetail(id)} shape), plus no-img-element escalated to error — closing the whole bug class, not just this instance."
  - "Board list ordering: reverse the fetched GET /boards array client-side for newest-first (backend returns creation-order/oldest-first)."
  - "Checkpoint closed as APPROVED-AS-IS by explicit user instruction, NOT after implementing fixes. The user confirmed the UI/UX itself (\"im satisfied with ui right now\") and separately gave a substantial batch of code-review comments, then explicitly said: do not implement them now, fold all of them into a new phase 2.1 instead. See '2.1 deferred scope' below — this is a deliberate deferral, not an oversight or a skipped review."

duration: n/a (spanned two sessions; checkpoint paused for user review)
completed: 2026-08-21
status: complete
---

# Phase 02 Plan 08: Boards Tracer Slice Summary

**The first end-to-end path from the real deployed backend to a rendered UI: `GET /api/boards` through a session-derived Route Handler, a typed client wrapper, a `useBoards()` TanStack Query hook, into a real sidebar — proved by an e2e spec against the real backend. Checkpoint approved as-is; the user's code-review feedback was explicitly deferred to phase 2.1 rather than implemented here.**

## Performance
- **Tasks:** 3 (2 auto/tdd, 1 checkpoint:human-verify)
- **Commits:** 4
- **Files modified:** 22 (13 created, 9 modified)

## Accomplishments
- `GET /api/boards` Route Handler: derives `userId` exclusively from `verifySession()`, returns 401 with no board data when unauthenticated, maps upstream failures to an authored 502 (never forwarding upstream error text), and validates the upstream body with `isBoardArray` before it reaches the client.
- `Board`/`isBoard`/`isBoardArray` runtime guards in `src/features/boards/types.ts`, required because `BoardResponseDTO` declares no `required` array in the OpenAPI contract.
- `boardsApi.list()` + `boardQueryKeys` client wrapper, importing nothing from `src/lib/server/` so the `server-only` boundary can't leak into a client bundle.
- `useBoards()` TanStack Query hook and a real `Sidebar` layout component: a 300px panel with skeleton/error/populated/selected/empty states, wired into `app/(dashboard)/layout.tsx`.
- `e2e/fixtures.ts` extended with `createFixtureBoard`, seeding against the real backend via the sign-up session's own cookie; `e2e/boards-list.e2e.spec.ts` proves two seeded boards render in the sidebar against the real deployed nonprod backend.
- Two real bugs found and fixed during the human checkpoint's review cycle (full-page-reload regression from a copied `<a>`; the `no-restricted-syntax` lint rule now bans every raw `<a>` regardless of `href` shape, closing the bug class rather than just this instance — see `feedback_lint_hardening_after_bugs.md`).

## Task Commits
1. **Task 1: End-to-end tracer slice** — `8ec4cdd`
2. **Task 2: Per-layer tests and stories** — `69a16fb`
3. **Task 3: Sign off the sidebar in a real browser** — checkpoint:human-verify. UI/UX approved by the user; two follow-up fix commits landed during the review cycle: `3988639` (restore real client-side navigation) and `a205d32` (lint-hardening against the raw-`<a>`/no-img-element failure class). Formal "approved" was given together with a large batch of code-review comments and an explicit instruction to defer all of them to phase 2.1 (see below) — that combined response is this plan's checkpoint closure.

## Files Created/Modified
See `key-files` in frontmatter above for the full list; the load-bearing new files are `app/api/boards/route.ts`, `src/features/boards/types.ts`, `src/features/boards/api/boards-api.ts`, `src/features/boards/hooks/use-boards.ts`, and `src/components/layout/sidebar/sidebar.tsx`.

## Decisions & Deviations
See `key-decisions` in frontmatter. No deviations beyond the two checkpoint-review fix commits (full-page-reload bug, lint hardening), both already folded into the merged commits above.

### 2.1 deferred scope (not implemented in this plan — captured for phase 2.1)

The user's checkpoint-closing message raised code-review feedback spanning well beyond plan 02-08's own files — testing strategy, architecture, and code-quality conventions across the whole project. Per explicit instruction ("dont implement them right now... fold all of the above into 2.1"), none of it was implemented here. Full items carried into Phase 2.1 scoping:

- Reconsider whether board/sidebar data-fetching should use React Server Components instead of the current Client Component + Route Handler + TanStack Query path (re-examine against ADR tech/0002's TanStack Query decision).
- Project-wide no-mocking testing policy (mocks currently still used in places, e.g. `next/link` mocked in `sidebar.test.tsx` instead of avoided) — ban mocking outside Storybook; e2e tests cover only real business-logic happy paths (no validation/copy assertions); component tests import Storybook stories for shallow copy/validation coverage; hook tests use React Testing Library instead of Vitest Browser Mode (e.g. re-evaluate `use-boards.unit.test.ts`... — flagged pattern applies to hook tests generally, e.g. a hypothetical `use-overflow-indicator`); seeding migrated from TS fixture helpers to a curl-based CLI.
- E2E tests must follow an Arrange-Act-Assert commenting convention.
- Introduce a typed, reusable cookie client; retire the ad hoc `themeCookie`/`upstreamCookie` shape in favor of it; `session.ts` should consume the same client instead of its own bespoke cookie implementation.
- Introduce an abstract class (TypeScript pattern TBD) to standardize mock/test entity creation, replacing ad hoc per-test fixtures.
- Replace scattered exported `const` test-config values (e.g. `E2E_SESSION_SECRET`, `E2E_EXTERNAL_API_BASE_URL`, `E2E_PORT`, `E2E_BASE_URL`) with a single enum-based grouping.
- Reconsider `isBoard`/`isBoardArray`'s placement in a `types` folder and whether they're the right shape/location.
- Replace string-literal Spring Boot API route paths with the OpenAPI-generated route constants instead of hand-written literals.
- Rename `boardDetail` (a function, not a constant) to a verb-form name.
- Separately: document all of the above as durable rules (CONVENTIONS.md / an ADR) so future sessions don't reintroduce the same patterns — this documentation step is itself part of Phase 2.1's scope, done before/alongside the retrofit work.

## Next Phase Readiness
- The board data spine (Route Handler → client wrapper → hook → UI) is proven and ready for plans 02-09 through 02-13 to build on.
- Phase 2.1 (urgent insertion) is being scoped next to carry the deferred code-review items above, plus the broader test-strategy overhaul the user requested this session (no-mocking policy, curl-based seeding, Storybook-story-driven component tests, e2e scoped to happy-path business logic only) — applied retroactively across Phase 1 and Phase 2's work to date.
- No blockers for 02-09 (sidebar collapse/expand) once 2.1 is sequenced, per the user's explicit choice to close 02-08 and run 2.1 before continuing Phase 2's remaining plans.
