# 0020 — No mocking outside Storybook, with a narrow framework/environment-shim carve-out

## Decision Drivers

- `tech/0018` already removed the fake *HTTP* layer (MSW) project-wide. It said nothing about test
  *doubles* generally — this project's own test suite still had 14 of 46 test files reaching for
  `vi.mock`/`vi.spyOn` to fake a module (this project's own hooks, `next/navigation`, business
  logic), a narrower category `tech/0018` never addressed.
- User's explicit position (`02.1-CONTEXT.md` D-04, echoing `tech/0018`'s own Testing Trophy
  framing): "we must apply all these rules retroactively" — a mock of this project's own code is
  exactly the kind of environment-drift risk `tech/0018` already rejected for the network layer.
- A real, named platform limitation genuinely exists that a mock is the only practical workaround
  for: `sidebar.test.tsx` (this phase's own tracer, plan `02.1-01`) needs `next/link` mocked
  because its real implementation reads `process.env` at module-evaluation time and throws
  `ReferenceError: process is not defined` in Vitest Browser Mode — a Vitest/Next.js environment
  gap, not a business-logic shortcut. `tech/0017`'s carve-out precedent — narrowing a blanket rule
  for one specific, named, load-bearing reason rather than abandoning the rule — is the direct
  model for how to record this exception without reopening D-04 itself.

## Considered Options

Not a new options analysis — `tech/0018` already settled that this project runs no fake HTTP
layer. This record answers a narrower, previously open question `tech/0018` didn't reach: does "no
fake HTTP layer" also mean "no faked module of any kind," including framework internals a test
genuinely cannot exercise for real inside this project's Vitest Browser Mode environment? The
answer is yes for business logic, no for a documented, narrow environment shim — recorded as a
carve-out in `tech/0017`'s style rather than as a fresh options comparison.

## Decision Outcome

No `vi.mock`, `vi.spyOn`, or equivalent test-double mechanism is used anywhere outside
`*.stories.tsx` files. A test isolates itself by creating throwaway data against the real deployed
backend (`tech/0018`'s existing mechanism), never by faking a module this project owns or a
third-party API call. Storybook stories remain the one sanctioned place to stage fixture data —
`composeStories`-driven component tests (`tech/0021`) consume that staged data, never a mock.

**Carve-out (D-19), written in `tech/0017`'s carve-out style:** a narrow framework/environment
shim is permitted only where a named platform limitation makes the real module unusable inside
this project's Vitest environment. The two standing examples, both already shipped in
`sidebar.test.tsx` and `board-list.test.tsx`:

- `next/link`, under Vitest Browser Mode — its real implementation reads `process.env` at
  module-evaluation time and throws `ReferenceError: process is not defined` in this project's
  Browser Mode test environment (no Next.js runtime is present there by design — every component
  under test that needs `next/navigation` already gets its own `vi.mock`, per `vitest.setup.ts`'s
  own documented reasoning).
- `next/navigation` — no real Next.js router exists outside an actual request/render cycle in
  Vitest, so any component reading router state or calling `useRouter()`/`usePathname()` needs
  this shim to render at all.

Retired: `next/headers`'s `cookies()` shim was a standing example through phase 02.1, but phase
02.2 moved every cookie read/write assertion that needed it to real Playwright e2e coverage
(`docs/adr/tech/0025`) — zero files register this shim anymore (see "Surviving mock register").

Every such shim MUST carry an inline comment naming the specific limitation, AND (where the
underlying ESLint rule targets the call shape in question — see Enforcement) an
`eslint-disable-next-line no-restricted-syntax` directive whose trailing reason states that
limitation, matching `sidebar.test.tsx`'s own `next/link` shim comment exactly. A mock of this
project's own modules, of an API call, or of a hook is never permitted under this carve-out — the
limitation must be a genuine, named platform gap, not a shortcut around writing a real-backend
test.

**Fixture construction (D-11):** entity fixtures are built by factory functions taking
`Partial<T>` overrides (`src/test-utils/factories/`, e.g. `createBoard`/`createBoards` from plan
`02.1-01`), not by ad hoc per-test object literals and not by a class requiring `new` — matching
this project's own established convention against class-needing-`new` patterns.

### Server Action alias carve-out

Written in `tech/0017`'s carve-out style, closing the gap flagged by
`.planning/todos/completed/2026-08-22-reconcile-action-stub-aliasing-with-the-no-mock-policy.md`:
a whole-module build-time alias for a Server Action is a distinct mechanism from a `vi.mock`, and
was previously an undocumented, unenforced exception to this record's own no-mocking rule.

**Mechanism:** `vitest.config.ts`'s `serverActionStubAlias` rewrites four exact module specifiers
(`@/features/auth/actions/sign-in`, `sign-up`, `sign-out`, `@/features/theme/actions/update-theme`)
to real stub modules under `src/test-utils/` for the `browser` and `storybook` Vitest projects.
This is a build-time module alias — the same category as the pre-existing `server-only` alias in
the same file, not a `vi.mock`/`vi.spyOn` call — so it is not a shim covered by D-19 above, and
`no-restricted-properties` (which targets `vi.mock`/`vi.spyOn` call shapes, not resolver
configuration) has no way to flag it.

**Justification:** real `"use server"` Server Actions cannot execute inside
`@storybook/nextjs-vite`'s Vite-driven Vitest rendering — see `docs/adr/tech/0025`'s D-08 research
paragraph for the full citation (no RSC-aware `"use server"` transform; the action's real import
chain reaches `node:crypto` and the external API client, unbundlable in a browser test page). The
alternative — refactoring an action into a fetchable Route Handler so it could be called for real
— is banned project-wide by `docs/adr/tech/0019`.

**Scope limit (D-09):** a stub-backed test may assert what the COMPONENT does — that its
`formAction` is wired to the action and invoked it, proven by a real invocation counter on the
stub module (never a `vi.fn()`), as `src/features/auth/components/sign-out-button.test.tsx` does.
It may never assert what the REAL action does — a redirect, a cookie write, a backend-rejection
message. Those live in Playwright e2e (`e2e/auth.e2e.spec.ts`).

**Register:** the four aliased specifiers above, each mapped to its own
`src/test-utils/*-action-storybook-stub.ts` file. `src/test-utils/index.ts` (D-11's thin
re-export barrel) is not a fifth stub — it only re-exports the four.

**Unwind trigger:** if `@storybook/nextjs-vite` ships an RSC-aware `"use server"` transform,
re-evaluate replacing the stubs with real calls — the original D-07 direction this carve-out
stands in for.

## Consequences

- **Enforcement:** ESLint's `no-restricted-properties` rule in `eslint.config.mjs` flags
  `vi.mock`/`vi.spyOn` on any `**/*.{ts,tsx}` file, excluding `**/*.stories.{ts,tsx}`, citing this
  ADR in its message. Set to `"error"` — blocking, not advisory (plan `02.1-15` raised it once the
  retroactive rewrite, D-16, closed every violating file). A distinct rule ID
  (`no-restricted-properties`, not a second `no-restricted-syntax` block) was required because
  ESLint flat config *replaces*, not merges, a rule's configuration per matching file — a second
  `no-restricted-syntax` block scoped to the same files would have silently dropped this project's
  pre-existing raw-`<a>`/positional-argument/`TSImportType` selectors for every `.ts`/`.tsx` file.

### Surviving mock register

Every remaining `vi.mock`/`vi.spyOn` in the repository, generated from
`grep -rn "eslint-disable-next-line no-restricted-properties --" --include=*.ts --include=*.tsx src app e2e`
— each row is a framework/environment shim carrying its own justifying disable directive, not a
business-logic double. A new row here that names a module belonging to this project (rather than
`next/navigation` or `next/link`) is a review-blocking regression.

| File | Mocked specifier | Platform limitation |
|------|-------------------|----------------------|
| `src/components/layout/sidebar/sidebar.test.tsx` | `next/navigation` | No real Next.js router outside an actual request/render cycle in Vitest |
| `src/components/layout/sidebar/sidebar.test.tsx` | `next/link` | Reads `process.env` internally, undefined in Vitest Browser Mode (`ReferenceError: process is not defined`) |
| `src/features/boards/components/board-list.test.tsx` | `next/navigation` | No real Next.js router outside an actual request/render cycle in Vitest |
| `src/features/boards/components/board-list.test.tsx` | `next/link` | Reads `process.env` internally, undefined in Vitest Browser Mode (`ReferenceError: process is not defined`) |

Regenerated by plan `02.2-09`: `board-list.test.tsx`'s two rows are newly added (it postdates this
table's prior generation) while phase 02.2's cookie-to-e2e migration (`docs/adr/tech/0025`)
removed nine `next/headers` rows and three `next/navigation` rows (the four deleted
`*.integration.test.ts` files) from the table above.

**D-12 outcome (measured, plan `02.2-09`):** re-running the three consumer-count checks against
the repository as it now stands gives `next/headers`: 0 files, `next/navigation`: 2 files
(`sidebar.test.tsx`, `board-list.test.tsx`), `next/link`: 2 files (same two). The `next/headers`
centralization (D-10b) is closed as **resolved-by-obsolescence** — zero remaining consumers after
the e2e migration, nothing left to centralize. `next/navigation` and `next/link` kept two
consumers each and were centralized into `src/test-utils/next-router-shims.tsx`
(`createNextNavigationShim`/`createNextLinkShim`) — each consumer still declares its own
`vi.mock` call, since Vitest hoists mocks per file and never shares registrations across files, so
only the factory bodies were de-duplicated, not the `vi.mock` registration itself.

- Real-backend tests are honestly slower than mocked ones, and every test layer now needs the
  nonprod backend reachable to run at all — the same cost `tech/0018` already accepted for the
  network layer, now extended to every module boundary a test previously faked.
- A suite failure can now mean a real backend problem, not just a code problem — this is a
  deliberate trade accepted alongside `tech/0018`'s original acceptance of the same risk.
- 14 of 46 test files (at the time this decision was recorded) violated this policy and require a
  full retroactive rewrite (D-16), not a narrower targeted fix — a deliberate, explicit user
  choice over the smaller alternative that was proposed and rejected.
- **Accepted coverage change (plan `02.2-05`, ledger row 11):** `sign-out.integration.test.ts`'s
  "clears cookies and redirects rather than throwing when there is no session" claim is NOT
  REACHABLE through the UI — `proxy.ts`'s own route guard intercepts the Sign Out Server Action's
  POST before it can execute when no session cookie exists, breaking Next.js's client-side
  action-stream parsing regardless of the action's own graceful no-session handling.
- **Accepted coverage change (plan `02.2-07`, ledger row 3):** `update-theme.integration.test.ts`'s
  "a value the schema rejects returns error, no upstream write" claim is NOT REACHABLE — the theme
  toggle only ever emits the two valid enum values, so no UI path submits an invalid one; the
  boundary guard is covered mock-free by `theme.unit.test.ts`'s `isTheme` rejection case, and
  `update-theme.ts`'s zod enum derives from the same `THEME` constant.
- **Accepted coverage change (plan `02.2-08`, ledger row 3):** `server-client.integration.test.ts`'s
  "a genuinely failed sign-in (wrong password) does NOT clear an existing session" claim is NOT
  REACHABLE — the route guard redirects a signed-in visitor away from the sign-in route entirely,
  so no UI path can produce a BAD_CREDENTIALS 401 while a session exists. The protective half (an
  upstream 401 for a dead credential DOES clear the session) is proven by
  `e2e/session-bridge.e2e.spec.ts`'s SESSION-01, and `server-client.ts`'s explicit BAD_CREDENTIALS
  exemption (T-01-51 comment) remains visible in source.

Unwind trigger: none anticipated for the core no-mocking rule itself — it is a direct extension of
`tech/0018`'s already-settled philosophy. The framework-shim carve-out's own unwind trigger: if
Vitest Browser Mode ever resolves the `process is not defined` gap for `next/link` natively, the
`next/link` shim in `sidebar.test.tsx` (and any file copying it) should be removed in favor of the
real module.

Sources:

- `docs/adr/tech/0018-no-mock-server.md` — the decision this record extends from the network layer
  to test doubles generally.
- `docs/adr/tech/0017-auth-server-actions-carve-out.md` — the carve-out precedent this record's
  D-19 exception follows in structure.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  D-04, D-11, D-16, D-19.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-RESEARCH.md`
  Architecture Patterns §2/§4, Common Pitfalls §2.
- `src/components/layout/sidebar/sidebar.test.tsx` — the worked example both this record and
  `tech/0021` cite.
- `eslint.config.mjs` (section 8d-2) — the `no-restricted-properties` enforcement block.
- `docs/adr/tech/0025-direct-composed-story-rendering.md` — D-08's Server Action infeasibility
  research this record's alias carve-out cites rather than duplicates; also the record that
  retired the `next/headers` D-19 standing example.
- `.planning/phases/02.2-unify-component-tests-fully-onto-storybook-stories-eliminate/02.2-CONTEXT.md`
  — D-07 through D-16, the source of this amendment's carve-out, register regeneration and
  coverage-change bullets.
- `.planning/todos/completed/2026-08-22-reconcile-action-stub-aliasing-with-the-no-mock-policy.md`
- `.planning/todos/completed/2026-08-22-investigate-a-shared-integration-testing-mocking-module-for-.md`
- `.planning/todos/completed/2026-08-22-investigate-centralizing-vi-mock-declarations-for-next-heade.md`
- `.planning/todos/completed/2026-08-22-research-e2e-coverage-for-cookie-writing-instead-of-next-hea.md`
