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
