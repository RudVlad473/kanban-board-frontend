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
`sidebar.test.tsx`:

- `next/link`, under Vitest Browser Mode — its real implementation reads `process.env` at
  module-evaluation time and throws `ReferenceError: process is not defined` in this project's
  Browser Mode test environment (no Next.js runtime is present there by design — every component
  under test that needs `next/navigation` already gets its own `vi.mock`, per `vitest.setup.ts`'s
  own documented reasoning).
- `next/headers`'s `cookies()` — no Next.js request scope exists inside a plain Vitest run, so any
  server-only module calling `cookies()` directly needs this shim to be unit-testable at all
  outside a real request.

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

## Consequences

- **Enforcement:** ESLint's `no-restricted-properties` rule in `eslint.config.mjs` flags
  `vi.mock`/`vi.spyOn` on any `**/*.{ts,tsx}` file, excluding `**/*.stories.{ts,tsx}`, citing this
  ADR in its message. Kept at `"warn"` severity until the retroactive rewrite (D-16) lands across
  every currently-violating file; a later plan raises it to `"error"`. A distinct rule ID
  (`no-restricted-properties`, not a second `no-restricted-syntax` block) was required because
  ESLint flat config *replaces*, not merges, a rule's configuration per matching file — a second
  `no-restricted-syntax` block scoped to the same files would have silently dropped this project's
  pre-existing raw-`<a>`/positional-argument/`TSImportType` selectors for every `.ts`/`.tsx` file.
- Real-backend tests are honestly slower than mocked ones, and every test layer now needs the
  nonprod backend reachable to run at all — the same cost `tech/0018` already accepted for the
  network layer, now extended to every module boundary a test previously faked.
- A suite failure can now mean a real backend problem, not just a code problem — this is a
  deliberate trade accepted alongside `tech/0018`'s original acceptance of the same risk.
- 14 of 46 test files (at the time this decision was recorded) violated this policy and require a
  full retroactive rewrite (D-16), not a narrower targeted fix — a deliberate, explicit user
  choice over the smaller alternative that was proposed and rejected.

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
