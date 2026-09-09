# 0022 — E2E scope narrowed to business-logic happy paths, curl-based seeding

## Decision Drivers

- Once `tech/0021` gives shallow, prop-driven, and error-state coverage a real home in composed
  Storybook stories, E2E no longer needs to carry that weight too — the two layers had been
  overlapping, with E2E asserting on validation copy and microcopy that a component-level test can
  check faster and closer to the code that owns it.
- `e2e/fixtures.ts`'s `createFixtureAccount`/`createFixtureBoard` are TypeScript, Playwright-
  `APIRequestContext`-driven seeding helpers — real and working, but coupled to Playwright's own
  request machinery; a plain curl-based seeding mechanism is more portable (usable from a shell,
  CI step, or manual repro outside a Playwright run) and matches this project's broader "dial the
  real backend directly" philosophy (`tech/0018`) with one fewer layer between the seed script and
  the HTTP calls it makes.
- The backend caps one account at two concurrent sessions (`e2e/fixtures.ts:51-66`'s own comment) —
  any seeding replacement must preserve this constraint, reusing the sign-up response's own session
  credential rather than signing in a second time, or seeding starts silently failing under load.

## Considered Options

Not a fresh comparison of E2E frameworks or philosophies — Playwright against the real deployed
backend (`tech/0018`) is unchanged. This record narrows *what* E2E is responsible for asserting
(handing validation/microcopy/edge-case coverage to `tech/0021`) and replaces *how* E2E seeds its
throwaway fixture data (curl instead of TypeScript helpers), given the drivers above.

## Decision Outcome

**Scope (D-05):** Playwright E2E specs, run against the real deployed nonprod backend
(`tech/0018`), cover only real business-logic happy paths — create, view, switch, edit, drag/move,
delete (including cascade deletes), sign-in/out, theme switching. They must NOT assert on
validation error copy, microcopy text, or edge-case error-state rendering; that coverage lives in
component-level composed-story tests per `tech/0021` instead. An E2E spec asserting on a specific
error message's exact wording, rather than on the business outcome the message represents, is now
a review-blocking gap in the wrong layer.

**Commenting convention (D-06):** every E2E test body (or each logical block within a longer,
multi-step flow) carries explicit `// Arrange`, `// Act`, `// Assert` comments marking the setup,
the interaction, and the verification, so a longer flow's structure is legible without re-deriving
it from the raw statement sequence:

```ts
test("creates a board and shows it in the sidebar", async ({ page }) => {
    // Arrange
    const { boardName } = await seedAccount(page);

    // Act
    await page.getByRole("button", { name: "Add new board" }).click();
    await page.getByLabel("Board name").fill(boardName);
    await page.getByRole("button", { name: "Create board" }).click();

    // Assert
    await expect(page.getByRole("link", { name: boardName })).toBeVisible();
});
```

**Seeding (D-07):** E2E data seeding moves from `e2e/fixtures.ts`'s TypeScript,
`APIRequestContext`-driven helpers to a curl-based CLI mechanism, invoked from test bodies via
`execSync`/`spawnSync` per test — each test still needs its own randomized account, matching
today's per-test `createFixtureAccount` call. The constraint it must preserve, carried over
verbatim from `e2e/fixtures.ts:51-66`: the backend caps one account at two concurrent sessions, so
seeding reuses the sign-up response's own session credential (via a curl cookie jar, `-c`/`-b`)
rather than signing in a second time. `e2e/global-setup.ts`'s existing `POST /admin/reset` step
(run once for the whole suite) is unaffected — per-test account/board seeding is a different
lifecycle and stays separate from that one-time reset precondition.

## Consequences

- E2E and component-story tests now have a clean, non-overlapping split: E2E proves the real
  business-logic path works end-to-end against the real backend; composed-story tests
  (`tech/0021`) prove every shallow visual/copy/validation state renders correctly. Neither layer
  duplicates the other's assertions going forward.
- The curl-based seeding mechanism is a new script outside Playwright's own request machinery —
  it needs its own maintenance (cookie-jar handling, error surfacing) independent of Playwright
  upgrades, but is also independently runnable for manual repro without spinning up a full
  Playwright run.
- Existing E2E specs that assert on error copy/microcopy need to be trimmed to their business
  outcome only, with the removed assertion's coverage confirmed to exist in the corresponding
  component's composed-story test before the E2E assertion is deleted — not deleted speculatively.

Unwind trigger: if curl-based seeding proves meaningfully harder to maintain than the TypeScript
helpers it replaces (e.g. the two-concurrent-session cookie handling breaks in a way curl's jar
mechanics can't cleanly express), revisit in favor of a Playwright-native seeding helper again —
this is a portability/consistency preference, not a correctness requirement either way.

**Enforcement:** code review for scope (D-05/D-06) plus `pnpm exec playwright test --project e2e`
run against the real deployed nonprod backend, which fails outright if the curl seeding mechanism
itself breaks (every E2E test depends on it for its throwaway account/board data).

Sources:

- `docs/adr/tech/0018-no-mock-server.md` — the "dial the real backend directly" philosophy this
  record's seeding choice extends one layer further (curl instead of a TypeScript HTTP client).
- `docs/adr/tech/0021-storybook-driven-component-tests.md` — the layer that now absorbs the
  coverage this record narrows E2E away from.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  D-05, D-06, D-07.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-RESEARCH.md`
  Architecture Patterns §4 — curl cookie-jar mechanics, ported against `e2e/fixtures.ts`'s actual
  session-reuse logic.
- `e2e/fixtures.ts:40-66` — the session-reuse constraint and `extractJsessionId` logic this
  record's seeding mechanism preserves the intent of.
- `e2e/global-setup.ts:18-44` — the one-time `POST /admin/reset` step this record's per-test
  seeding stays separate from.

## Amendment (2026-08-29, quick task 260829-kyv)

The two references above to `globalSetup`'s `POST /admin/reset` (line 62-64's "run once for the
whole suite" and line 102's "one-time step") describe a full-database wipe — the mechanism that
existed when this ADR was written. That mechanism is superseded: `globalSetup` now probes reset
capability without deleting anything, and `globalTeardown` deletes only the accounts each run
itself created. The decision this ADR actually records — a working reset capability as a hard
precondition the suite refuses to run without — is preserved unchanged by the probe; only *how*
that precondition is proved, and how cleanup happens afterward, changed. See SETUP.md's
`NONPROD_RESET_TOKEN` section and 260829-kyv-SUMMARY.md for the full mechanism.
