---
created: 2026-08-19T09:45:51.543Z
title: Investigate stricter Prettier config for React and Next.js formatting
area: tooling
severity: minor
files:
  - .prettierrc (or equivalent Prettier config)
  - eslint.config.mjs
---

## Problem

Current Prettier setup (docs/adr/tech/0007-linter-formatter-toolchain.md) formats the codebase
but doesn't have explicit, React/Next.js-aware formatting rules beyond the defaults. Raised
during the phase 01 round-4 planning discussion (lib/ module layering) while talking through
project-wide code-organization/style conventions — not scoped to that round's work, so captured
separately rather than folded into GC-25..GC-30.

## Solution

TBD. Investigate whether there are Prettier plugins/config options worth adopting for more
explicit React-specific formatting (e.g. JSX prop ordering/wrapping conventions) and possibly
Next.js-specific conventions. Note: some of what "React formatting rules" might mean is actually
ESLint's domain (e.g. `eslint-plugin-react`, `eslint-config-next` rules) rather than Prettier's —
worth clarifying during investigation whether the gap is really in Prettier config, ESLint rules,
or both, before proposing a specific change.

## Resolution

Resolved by plan `02.2-09`, Task 4: recorded as a dated addendum under
`docs/adr/tech/0007-linter-formatter-toolchain.md`. Conclusion: no Prettier config change —
Prettier's own JSX-specific options (`jsxSingleQuote`, `bracketSameLine`, `singleAttributePerLine`)
either already match this project's output or would be a net readability loss, and
`prettier-plugin-organize-imports` would duplicate the stronger `import-x`/`import-order` rule
already enforced. Confirmed the actual gap ("React formatting rules") is ESLint's domain
(`eslint-plugin-react`'s `jsx-sort-props`/`jsx-max-props-per-line`, currently unused) — a distinct,
un-adopted linting-policy decision, not a Prettier gap.
