# 0018 — No mock server; every layer dials the real backend

## Decision Drivers

- User's explicit position (GC-22): "store.ts should die... it's a mocking practice we never want
  to follow, our testing philosophy is Testing Trophy shape, testing close to the actual env."
- A fake replaces the real thing with a second environment that can drift from it — a stateful
  HTTP mock invites exactly the kind of contract/behavioral drift a real backend wouldn't have.
- The deployed non-production backend (nonprod) is live and fully verified
  (`kanban-board-backend` Phase 8, all requirements satisfied, `POST /admin/reset` proven
  end-to-end), clearing the gate that previously required a mock stand-in.

## Considered Options

Not a new options analysis — `tech/0004` already evaluated and chose MSW among mock-server
options. This decision instead reconsiders whether a mock server belongs in this project's
testing/dev strategy at all, now that a real backend exists to dial directly.

## Decision Outcome

This project runs no fake HTTP layer at any level. Development (`pnpm dev`), every automated test
layer (unit, component, e2e), and CI all dial the same deployed non-production backend. This
supersedes `tech/0004` outright — that record chose which mock server to build; this record
removes the mock-server category entirely.

A test isolates itself by creating its own throwaway data (e.g. a randomly generated email per
test) rather than by resetting a fake store between runs.

## Consequences

- No offline development — every layer requires network access to the real, deployed backend;
  there is no local fallback.
- Every test run creates real rows in a shared, non-production database — accepted, not designed
  around with per-test/per-dev isolation beyond unique-value generation.
- This project now depends on that backend staying available for any local development or test run
  to succeed at all — plan 01-31 wired `POST /admin/reset` into CI as a post-test-suite step to
  clear state a run accumulates, which mitigates state buildup but not the backend's availability
  itself.

Unwind trigger: the deployed non-production backend becomes unreliable or unavailable enough to
block routine development → revisit whether a mock stand-in is needed again, at least for local
dev.

Sources:

- `.planning/phases/01-foundation-auth-preferences/01-CONTEXT.md` GC-22, GC-23 — the user's
  decision and its CI mitigation.
- `docs/adr/tech/0004-openapi-mock-server.md` — the record this supersedes.
- `kanban-board-backend` Phase 8 verification (nonprod live, `POST /admin/reset` proven
  end-to-end) — the precondition that cleared this decision.
