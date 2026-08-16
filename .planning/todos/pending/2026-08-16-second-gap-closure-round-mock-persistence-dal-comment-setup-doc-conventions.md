---
created: 2026-08-16T00:00:00.000Z
title: Second gap-closure round — mock store persistence, dal.ts comment, SETUP.md convention, CONVENTIONS.md extension
area: architecture
severity: minor
files:
  - src/lib/mocks/store.ts
  - src/lib/dal.ts
  - CONVENTIONS.md
  - .planning/phases/01-foundation-auth-preferences/01-18-PLAN.md
---

## Context

Raised during the same 2026-08-16 architecture-questions discussion that produced gap-closure
plans 01-16 through 01-21 (GC-01..GC-08). These four items are additional, confirmed-scope
follow-ups the user explicitly asked to hold until after 01-16..21 execute, rather than fold
into the same planning round. Route through `/gsd-plan-phase 01 --gaps` (append new decisions to
01-CONTEXT.md first, following the same "Gap Closure" pattern already used) once waves 11-13
have executed.

## Items

- **GC-09 (mock store persistence):** `src/lib/mocks/store.ts` currently mirrors its in-memory
  `Map` to a JSON file in the OS temp dir (`STORE_MIRROR_FILE_PATH`) purely to survive `next
  dev`'s hot-reloads. User's explicit call: this is an invented, off-pattern approach — no disk
  persistence. Replace with a solution congruent with TanStack Query (the project's data-managing
  library), e.g. plain in-memory seed state with an explicit seed/reset function, no file I/O.
  **Also add this as an explicit CONVENTIONS.md rule**: mock/test state lives in memory only,
  reset via explicit seed functions — do not invent ad-hoc disk/browser persistence to survive
  hot-reloads or test runs; if cross-reload survival is genuinely needed, that's a distinct,
  reviewed decision, not a default reach.

- **GC-10 (dal.ts comment):** `src/lib/dal.ts` has good prose explaining its role but never
  spells out what "DAL" stands for. Add an explicit one-line comment: "DAL = Data Access Layer
  (Next.js App Router's own documented auth-pattern term, ADR tech/0001) — the authoritative,
  server-only session-verification checkpoint."

- **GC-11 (centralized setup-steps doc):** No single place documents manual/human setup steps a
  new contributor or CI needs. Create one now (e.g. `SETUP.md` at repo root, intended to later
  become a `.sh` script per the user's stated direction) even though `01-18`'s gitleaks wrapper
  itself needs zero manual steps (confirmed — npm-installed, works in CI unmodified via the
  `secrets` job already added to `ci.yml`). At minimum, document the already-known blocker:
  `.env.local`'s `EXTERNAL_API_BASE_URL`/`SESSION_SECRET` need real values before `pnpm build`/
  `pnpm dev` work in the main tree (currently only documented in `.planning/HANDOFF.json`, not
  anywhere a human would naturally look).

- **GC-12 (RTL-for-hooks convention + CONVENTIONS.md "where code lives" section):** Two related
  documentation additions:
  1. Document that `renderHook`/React Testing Library (jsdom `unit` Vitest project) is the
     standard approach for hook tests, alongside the existing D-26z testing-project description
     in `01-CONTEXT.md` — this becomes the citable precedent once a real RTL hook test exists
     (added by `01-20`, GC-07).
  2. **Decision made 2026-08-16, do not re-litigate:** extend `CONVENTIONS.md` (not a new
     `PROJECT_ROUTER.md` file) with a concise, categorized "where code lives" section — hooks,
     generic types, tests-by-kind, etc., categorized wisely rather than an exhaustive folder
     listing. Researched first: no real industry standard exists for a dedicated "project router"
     doc aimed at AI agents (AGENTS.md's spec is freeform; Feature-Sliced Design has real tooling
     behind it but is a different, heavier methodology than this project's feature-folder hybrid,
     ADR tech/0009). `CONVENTIONS.md` is already the ADR-backed placement source of truth here —
     extending it avoids a second doc drifting out of sync.
