# 0005 — Typed API client / codegen from the OpenAPI spec

## Decision Drivers

- The OpenAPI 3.1 contract exists but will still change before a real
  backend is deployed; the frontend needs a low-friction way to detect
  and adapt to contract drift.
- Every API call in the app runs through this client — pervasive,
  touching every data-consuming component.
- Solo developer — low ongoing maintenance overhead for keeping the
  generated client in sync matters, with no team to split the work.
- Should pair cleanly with the data-fetching layer (ADR 0002, TanStack
  Query).

## Considered Options

**openapi-typescript + openapi-fetch** (recommended)
- Pros: single-command regeneration straight from the local OpenAPI 3.1
  file — benchmarked at 1.5s for one output file on a 75k-line,
  1,200-operation schema; reference-grade 3.1 type fidelity (confirmed
  discriminator/polymorphic-type support in current docs); lowest
  ongoing config surface; an official `openapi-react-query` adapter
  bridges cleanly to TanStack Query.
- Cons: the core CLI package's last tagged release predates this
  research by roughly six months (sibling packages remain actively
  committed), worth re-checking before locking in long-term.

**Orval**
- Pros: generates React Query hooks directly, the strongest
  data-fetching synergy of the four.
- Cons: open 2026 GitHub issues document incorrect Zod-schema generation
  specifically for OpenAPI 3.1 `prefixItems`/tuple structures and
  default/min-max values.
- Why not the recommendation: real, currently-open 3.1-fidelity bugs
  outweigh its hook-generation convenience for a contract this project
  depends on being correctly typed.

**Kubb**
- Pros: the most powerful plugin architecture of the four.
- Cons: its actively-published line is still a long-running beta
  (`5.0.0-beta.106`) alongside a separate `3.2.3` "stable" tag —
  confusing dual-channel versioning for a solo maintainer.
- Why not the recommendation: the maintenance/versioning overhead isn't
  justified when a simpler, more stable option covers the need.

**Hand-written client + manually-authored types**
- Pros: no tooling dependency at all.
- Cons: no regeneration story — every contract change is a manual,
  easy-to-miss edit across hand-typed interfaces.
- Why not the recommendation: defeats the purpose of having a machine-
  readable contract in the first place.

## Decision Outcome

Chosen: **openapi-typescript + openapi-fetch**. Confirmed by the user at
Phase 4's walkthrough, after a clarifying question about the
regeneration workflow: "good note, let's callout that for the future
(ci) so we dont forget" — referring to the CI drift-check convention
recorded in the project's conventions documentation.

## Consequences

Unwind trigger: `openapi-typescript`'s core CLI goes meaningfully longer
without a release while sibling packages diverge in behavior, or
`@hey-api/openapi-ts` (the faster-moving successor project noted during
research) reaches clear feature/stability parity with materially better
maintenance velocity → re-evaluate switching.

Sources:
- https://dev.to/nyaomaru/which-openapi-codegen-should-you-choose-openapi-typescript-vs-hey-api-vs-orval-vs-kubb-100p
  — fetched 2026-08-09 (independent).
- https://www.pkgpulse.com/guides/orval-vs-openapi-typescript-vs-kubb-openapi-client-2026
  — fetched 2026-08-09 (independent).
- https://openapi-ts.dev/openapi-fetch/ and /introduction — fetched
  2026-08-09 (primary-docs).
- `gh api repos/openapi-ts/openapi-typescript` (+ /releases) — fetched
  2026-08-09 (primary-docs/repo metadata).
- `gh api repos/orval-labs/orval` — fetched 2026-08-09 (primary-docs).
- https://github.com/orval-labs/orval/issues/1961, /2801, /2933 —
  fetched 2026-08-09 (independent/primary).
- `gh api repos/kubb-labs/kubb` and https://kubb.dev/ — fetched
  2026-08-09 (primary-docs/repo metadata).
