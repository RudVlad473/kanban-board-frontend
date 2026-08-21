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

## ESLint 10 compatibility workarounds (added during D-22's comment sweep, plan `02.1-14`)

`eslint.config.mjs` accumulated several ESLint 10-specific workarounds as the toolchain was
upgraded past the version this record originally evaluated. Recorded here in full so the config
file itself can carry a one-line pointer instead of the reproduction detail (CONVENTIONS.md PC-05).

- **`eslint-plugin-react`'s version-probe crash.** `eslint-plugin-react@7.37.5` (bundled by
  `eslint-config-next@16.3.0`) has no ESLint 10 support yet: its `"detect"` React-version
  auto-probe calls the removed `context.getFilename()` method and crashes the linter outright.
  This is an upstream gap, not a config bug — verified by reproducing the crash against
  `eslint-config-next` alone, isolated from every other rule in the file. Pinning the version
  explicitly (`settings.react.version`) skips the auto-probe entirely, which is itself the
  plugin's documented alternative to `"detect"`, not a hack.
- **`import-x` replacing `eslint-plugin-import`.** `eslint-plugin-import@2.32.0`'s `import/order`
  fixer calls `sourceCode.getTokenOrCommentBefore`, a legacy `SourceCode` method ESLint 10 removed
  outright — it crashes the linter on any out-of-order import, not just an edge case.
  CONVENTIONS.md/D-26p names `eslint-plugin-import`/`import-x` as interchangeable for this rule;
  `import-x` is the actively-maintained fork with a declared ESLint 10 peer range (verified:
  `peerDependencies eslint "^8.57.0 || ^9.0.0 || ^10.0.0"`), so it is used instead.
- **`allowDefaultProject` for root-level config/script files.** Root-level `*.config.{mjs,ts}`
  files sit outside `tsconfig.json`'s `include` (they configure the tools that read `tsconfig`,
  not application code) — `allowDefaultProject` lets the type-aware ESLint tier parse them via a
  synthetic default project instead of erroring that they weren't found by the project service.
  Only `*.mjs`/`*.js` config files need this; `*.ts` config files (`next.config.ts`) are already
  covered by `tsconfig.json`'s own `**/*.ts` include, and listing them in both places conflicts
  ("found in the project service" vs. "allowDefaultProject").
- **`disableTypeChecked` for the same config/script files.** Files that only get a synthetic
  "default project" (no real `tsconfig`) see Node ESM globals like `import.meta.dirname` come back
  untyped/"error"-typed, which trips `strictTypeChecked`'s unsafe-assignment/misused-spread rules
  on the config file itself. Type-aware linting adds no real value for tooling scripts anyway, so
  it is turned off for just `*.config.mjs`/`*.config.js`/`scripts/*.mjs`.

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
