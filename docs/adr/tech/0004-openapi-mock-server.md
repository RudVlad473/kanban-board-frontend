# 0004 — OpenAPI-contract mock/stub server

## Decision Drivers

- No backend is deployed yet; the frontend must be built and fully
  tested (Vitest Browser Mode component tests, Playwright E2E) against
  the OpenAPI contract before any real backend exists.
- The contract enforces optimistic locking — every Column/Task/Subtask
  update/move/reorder carries a `version`, and a stale value must be
  REJECTED. A mock that only serves static/happy-path fixtures would let
  a real contract-violation bug (e.g. mishandling a version-conflict
  rejection) ship completely undetected until a real backend exists.
- Must support stateful CRUD across a single test run (create, then
  fetch, then delete), not just fixed canned responses.

## Considered Options

**MSW (Mock Service Worker), hand-written resolvers** (recommended)
- Pros: arbitrary JS/TS logic gives full control over the
  version-check/409 rejection behavior; first-class, documented
  integration into Vitest Browser Mode; a maintained community bridge
  (`mswjs/playwright`) extends the same handler code into Playwright E2E.
- Cons: the Playwright bridge doesn't share MSW's native worker
  mechanism across processes — it reimplements interception via
  `page.route()`, called "an implementation detail likely to change" by
  its own README.

**Hand-rolled Next.js Route Handler stub**
- Pros: same full custom-logic power as MSW.
- Cons: nothing ties it back to the OpenAPI file — a contract change is
  caught only by manual review, not automatically.
- Why not the recommendation: loses on spec-drift detection with no
  compensating advantage over MSW.

**Prism (Stoplight)**
- Pros: mocks generated directly from the OpenAPI file, so spec changes
  propagate with no separate maintenance step.
- Cons: its "Data Persistence" feature — needed to express a
  version-conflict rejection across a stateful sequence — is still
  unshipped/on its own roadmap per its own docs.
- Why not the recommendation: cannot express the one behavior this
  decision exists to guarantee.

**json-server + custom middleware**
- Pros: quick to stand up for simple CRUD.
- Cons: the current v1 (beta) line has dropped the custom-middleware
  mechanism older versions relied on; no native concept of a
  versioned-entity conflict at all.
- Why not the recommendation: cannot express the version-check
  requirement without significant custom work on top of a beta,
  actively-changing tool.

## Decision Outcome

Chosen: **MSW with hand-written resolvers**. Confirmed by the user at
Phase 4's walkthrough: "accept."

## Consequences

Unwind trigger: the `mswjs/playwright` bridge's `page.route()`-based
approach changes incompatibly or is deprecated → re-evaluate the
Playwright-side integration (MSW's own Vitest Browser Mode integration
is unaffected either way).

Sources:
- https://mswjs.io/docs/recipes/vitest-browser-mode/ — fetched
  2026-08-09 (primary-docs).
- https://github.com/mswjs/playwright — fetched 2026-08-09
  (primary-docs).
- https://github.com/stoplightio/prism — fetched 2026-08-09
  (primary-docs).
- https://github.com/typicode/json-server — fetched 2026-08-09
  (primary-docs).
