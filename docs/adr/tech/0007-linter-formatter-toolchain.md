# 0007 — Linter + formatter toolchain

## Decision Drivers

- The static-analysis layer's core is already fixed and non-negotiable:
  TypeScript + ESLint + `eslint-plugin-tailwindcss`, target 0 errors
  (user-imposed testing-strategy diagram).
- The user explicitly flagged the remaining piece as unresolved: "gonna
  need linter and formatter but im not sure what's the industry standard
  thing in 2026."
- Solo developer — low config-maintenance overhead matters; this tooling
  runs on every commit, so speed has real recurring cost.

## Considered Options

**ESLint + `eslint-plugin-tailwindcss` (kept) + Prettier +
`prettier-plugin-tailwindcss`** (recommended)
- Pros: the only option fully compliant with the fixed static-analysis
  requirement; `prettier-plugin-tailwindcss` is maintained directly by
  Tailwind Labs with zero custom config; `eslint-plugin-tailwindcss`
  shipped v4.2.0 (2026-07-13) built specifically for Tailwind v4,
  confirming it isn't stale tooling.
- Cons: Prettier is measurably slower than Biome's formatter in
  isolation — though for a solo dev's incremental (changed-files-only)
  commit workflow the difference is sub-second in practice.

**ESLint + `eslint-plugin-tailwindcss` (kept) + Biome used only as
formatter**
- Pros: meaningfully faster than Prettier.
- Cons: requires explicitly disabling Biome's own linter to avoid
  duplicating ESLint's job, and coordinating two tools' notion of "who
  formats what" — a combination not found described as an established
  2026 convention anywhere in research (the documented "hybrid" pattern
  found is the inverse: Biome for everything + Prettier only for
  Tailwind sorting).
- Why not the recommendation: a legitimate fallback if commit-time speed
  later becomes a measured pain point, but not the better-documented
  default today.

**Biome for both linting and formatting, dropping
`eslint-plugin-tailwindcss`**
- Pros: fastest option; closest to "the 2026 standard" framing the user
  asked about.
- Cons: directly violates the fixed static-analysis requirement; Biome's
  own Tailwind class-sort rule (`useSortedClasses`) is still in its
  "nursery" (experimental) tier, unsafe-fix only, with no support for
  Tailwind's responsive variants (`md:`, `max-lg:`) or plugin-added
  utilities — materially less mature than the plugin already committed
  to, independent of the constraint violation.
- Why not the recommendation: fails the fixed requirement outright, and
  would be a worse Tailwind-linting experience even if that requirement
  didn't exist.

## Decision Outcome

Chosen: **ESLint + `eslint-plugin-tailwindcss` (kept) + Prettier +
`prettier-plugin-tailwindcss`**. Confirmed by the user at Phase 4's
walkthrough: "accept."

## Consequences

Unwind trigger: commit-time lint/format speed becomes a measured,
recurring pain point for the solo developer → re-evaluate the
Biome-as-formatter-only hybrid (Option B).

Sources:
- https://biomejs.dev/linter/rules/use-sorted-classes/ — fetched
  2026-08-09 (primary-docs).
- https://github.com/francoismassart/eslint-plugin-tailwindcss/releases
  — fetched 2026-08-09 (independent, primary release feed): v4.2.0
  released 2026-07-13.
- https://www.peal.dev/blog/biome-vs-eslint-prettier-new-linting-landscape
  — fetched 2026-08-09 via snippet (independent).
- https://www.programming-helper.com/tech/biome-2026-rust-toolchain-web-development
  — fetched 2026-08-09 via snippet (independent).
