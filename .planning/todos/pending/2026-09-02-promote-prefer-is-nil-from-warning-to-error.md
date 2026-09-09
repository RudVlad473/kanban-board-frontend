---
created: 2026-09-02T00:00:00.000Z
title: Promote local/prefer-is-nil from warning to error
area: code-quality
severity: minor
files:
  - eslint.config.mjs
  - eslint-rules/prefer-is-nil.mjs
---

## Problem

`local/prefer-is-nil` ships at **`"warn"`**, wired in `eslint.config.mjs` section 11 against
`src/`, `app/`, `e2e/` and `visual/`. It reports **175 comparisons across 77 files** as of
2026-09-02. Warning was the only severity that could ship the day it was written: at `"error"`
the build fails immediately on 175 pre-existing sites.

A warning is a weak guard. `pnpm lint` exits 0 with all 175 present (no `--max-warnings` is set
anywhere, in `package.json` or the workflows), so nothing stops the count from growing. The rule
tells a reader what the convention is; it does not enforce it.

## Solution

Change `"warn"` to `"error"` in `eslint.config.mjs` section 11 — a one-word edit. The work is
everything that has to happen first:

1. Land the sweep in
   [`2026-09-02-replace-raw-null-undefined-comparisons-with-isnil.md`](./2026-09-02-replace-raw-null-undefined-comparisons-with-isnil.md).
   That todo carries the real hazard: `isNil` collapses `null` and `undefined`, so it is **not**
   equivalent wherever the two are meaningfully distinct. Read it before starting.
2. Decide what happens at the sites that legitimately keep a raw comparison. The rule has no
   options and no allowlist; each one needs an `eslint-disable-next-line local/prefer-is-nil` with
   a reason naming why `null` and `undefined` differ there. If that turns out to be more than a
   handful, add a `meta.schema` option instead of scattering directives.
3. Only then flip the severity, and confirm `pnpm lint` exits 0 with zero warnings — a promotion
   that leaves warnings behind has just converted them to a red build.

An intermediate step, if the sweep proves too large to land at once: set `--max-warnings` to the
current count in the `lint` script and ratchet it down. That freezes the number without requiring
the whole conversion first.

## Falsification

The rule was proven in both directions when it landed: `v === undefined` and `v !== null` each
report, while `isNil(v)` and `typeof v === "undefined"` stay clean. Re-run that check after any
edit to `eslint-rules/prefer-is-nil.mjs` — a rule that reports clean is not proof it works, which
this repo has been bitten by before (`import-x/no-cycle` passed with a real cycle present until
`import-x/parsers` was configured; see `docs/adr/tech/0031`).
