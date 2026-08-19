# 0017 — Auth mutations carve-out from the client data-fetching strategy

## Decision Drivers

- GC-24 (round 3 gap closure): `tech/0002` rejected Server Actions for two reasons — (1) no
  automatic rollback for `useOptimistic` on Action failure, and (2) harder to intercept with MSW
  from a component test. Reason (2) is now obsolete project-wide, because `tech/0018` removes MSW
  entirely rather than merely weakening it.
- Authentication mutations (sign-up, sign-in, sign-out) have no optimistic update to roll back —
  reason (1) never applied to them.
- Plans 01-33/01-34 already built and merged sign-up/sign-in/sign-out as Server Actions under this
  reasoning; this record makes that decision findable rather than leaving it implicit in code.

## Considered Options

Not a new options analysis — this is a scoped carve-out from `tech/0002`'s existing decision,
re-examining whether its own stated rejection reasons still apply to one mutation category (auth)
given what changed since that record was written. The reasoning is in "Decision Outcome" below.

## Decision Outcome

Authentication mutations are Server Actions. Board, column, and task mutations stay on the
existing TanStack Query client layer per `tech/0002`, unchanged. This supersedes the auth-scoped
half of `tech/0002` — that record's Server Actions rejection assumed both of its cited reasons
applied uniformly to every mutation in this project; they do not.

`tech/0002`'s first reason for rejecting Server Actions was the absence of automatic rollback when
an optimistic update fails. Authentication has no optimistic update to roll back — sign-up,
sign-in, and sign-out don't render a provisional UI state pending confirmation, so this reason
never applied to them. Its second reason — that Server Actions are harder to intercept from a
component test — no longer holds anywhere in this project, because the interception layer it
depended on has been removed entirely (`tech/0018`).

As a one-sentence breadcrumb only: a future revisit of the core domain should weigh only the first
reason, since the second no longer exists. This does not reopen that question here — GC-24 is
explicit that it stays closed.

What the carve-out cost and gained, per what plans 01-33/01-34 actually delivered: five files per
action (form → mutation hook → fetch wrapper → Route Handler → DAL) collapsed to two (form + Server
Action), progressive enhancement gained, and the backend's own failure reason is now available to
the interface without a hand-rolled parsing layer.

## Consequences

- Auth mutations and core-domain mutations now use two different mechanisms within the same app —
  a Server Action for auth, TanStack Query for boards/columns/tasks — a deliberate split, not an
  inconsistency to fix.
- A future mutation shaped like auth (no optimistic state to protect) may follow the Server Action
  pattern; a mutation with optimistic-update/rollback requirements should default to the TanStack
  Query pattern.

Unwind trigger: none anticipated for auth itself. A future revisit of the core-domain question
belongs to `tech/0002`, not this record.

Sources:

- `docs/adr/tech/0002-client-data-fetching-strategy.md` — the two original rejection reasons this
  record narrows.
- `docs/adr/tech/0018-no-mock-server.md` — MSW's removal, which retires the second reason.
- `.planning/notes/server-actions-migration-decision.md` — the exploration that originated this
  carve-out.
- `.planning/phases/01-foundation-auth-preferences/01-33-SUMMARY.md`,
  `01-34-SUMMARY.md` — what was actually built under this decision.
