# 0014 — Dual-viewport test coverage convention

## Context

ADR tech/0010 established mobile-first CSS and dual mobile/desktop *story* coverage. It said
nothing about the behavioral (`*.test.tsx`) layer — plan 01-09's checkpoint work built a
`describeForEachDevice` viewport-parameterized test wrapper, but applied it selectively: only to
the specific assertions already known to be viewport-conditional (one test in `modal.test.tsx`,
out of nine in that file), leaving the rest of every primitive's behavioral suite running at a
single default viewport.

This is a direct user decision, made during the same checkpoint review that produced ADR
tech/0010, extending the same "verify at both viewports" principle to the test layer: a
behavioral regression (e.g. a focus-trap bug that only reproduces when a dialog is nearly
viewport-width on mobile) can exist at only one viewport size even for behavior that looks
size-independent — selective application only catches what someone already suspected to test.

## Decision Outcome

**Every component's behavioral test suite (`*.test.tsx`) runs its entire body at both viewports,
by default, via a shared wrapper — not selectively applied per-assertion.** A test only branches
on the device parameter where the assertion genuinely differs by viewport; most tests pass
identically at both sizes, which is itself the point — it's a blanket regression net, not a
mobile-specific test suite bolted onto a desktop one.

```ts
describeForEachDevice("Modal", (device) => {
    it("traps focus inside the dialog", async () => { /* same body, runs at both sizes */ });
    it("renders the padding this device's breakpoint resolves to", async () => {
        // branches on `device` only here, where the assertion actually differs
    });
});
```

This is retroactive — all seven existing primitives' test files are restructured to wrap their
full suite, not just the files that already had a viewport-specific assertion — and applies to
every future component's test suite from first authorship.

**Shared test infrastructure gets its own formal placement-rule destination**, replacing the ad
hoc note previously left in the file that introduced it: `src/test-utils/`, an 8th destination in
`CONVENTIONS.md`'s placement rule alongside `types/` (ADR tech/0013). The wrapper itself is
renamed for clarity: `src/test/viewport.ts`'s `describeForEachDevice` export moves to
`src/test-utils/describe-for-each-device.ts`.

## Consequences

- Every primitive's `*.test.tsx` file is restructured under `describeForEachDevice`, roughly
  doubling that file's test execution time in exchange for automatic dual-viewport coverage of
  its entire behavioral surface, not just hand-picked assertions.
- `CONVENTIONS.md`'s placement rule gains an 8th destination (`src/test-utils/`), formalizing what
  was previously a single ungoverned file.
- Every future component (Phase 2+ boards/columns/tasks) authors its behavioral tests inside
  `describeForEachDevice` from the start, not as a retrofit.

Unwind trigger: if doubled test runtime becomes a measurable CI/local-dev cost problem as the
suite grows across later phases, revisit scoping this back to components/assertions with known
viewport-conditional behavior (the approach ADR tech/0010 already uses for CSS/story changes)
rather than blanket application.
