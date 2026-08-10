---
phase: 01-foundation-auth-preferences
plan: 02
subsystem: tooling
tags: [eslint, prettier, husky, lint-staged, typescript-eslint, eslint-plugin-boundaries, tailwindcss]

# Dependency graph
requires:
  - phase: 01-01
    provides: "pnpm-managed Next.js 16.3.0 App Router scaffold with strict TypeScript, CONVENTIONS.md folder skeleton, five per-folder path aliases"
provides:
  - "ESLint 10 flat config: typescript-eslint strictTypeChecked/stylisticTypeChecked, eslint-config-next recommended + core-web-vitals, react-hooks/exhaustive-deps as error, no-unused-vars with underscore escape hatch, import ordering (eslint-plugin-import-x), no-default-export with Next.js-file override, eslint-plugin-boundaries feature-folder enforcement, eslint-plugin-tailwindcss"
  - "Prettier config (120 print width, double quotes, trailing commas, prettier-plugin-tailwindcss) with format/format:check package.json scripts"
  - "Husky v9 + lint-staged blocking pre-commit hook: staged-file Prettier --write + ESLint --fix, no tsc, no bypass"
  - ".prettierignore scoped to exclude .planning/, docs/, and root governance docs from formatting"
affects: ["01-03", "01-04", "01-05", "01-06", "01-07", "01-08", "01-09", "01-10", "01-11", "01-12", "01-13", "01-14", "01-15"]

# Actuals (#2632)
actuals:
  tokens: 23609
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: ["eslint@10.8.1", "typescript-eslint@8.66.0", "eslint-config-next@16.3.0", "eslint-plugin-tailwindcss@4.2.0", "eslint-plugin-boundaries@7.2.0", "eslint-plugin-import-x@4.17.1", "eslint-import-resolver-typescript@4.4.5", "prettier@3.9.6", "prettier-plugin-tailwindcss@0.8.1", "husky@9.1.7", "lint-staged@17.3.0"]
  patterns:
    - "eslint.config.mjs composed in numbered layers (type-aware tier, Next.js rules, hooks, unused-vars, import order, boundaries, Tailwind, ignores) with a comment marking each layer's plan-decision ID"
    - "lint-staged.config.mjs as a default-exported const (config-file exception to the no-default-export rule)"
    - ".prettierignore doubles as the scope boundary between the frontend application tree and the repo's GSD planning/governance docs"

key-files:
  created:
    - eslint.config.mjs (full rewrite)
    - .prettierrc.json
    - .prettierignore
    - lint-staged.config.mjs
    - .husky/pre-commit
  modified:
    - package.json
    - pnpm-lock.yaml
    - app/layout.tsx
    - tsconfig.json

key-decisions:
  - "Downgraded the real `typescript` devDependency from 7.0.2 (plan 01-01's pin) to 6.0.3 — typescript-eslint@8.66.0 hard-throws on any TypeScript >=7.0 at import time (verified: same failure on the latest available typescript-eslint@8.67.0, no fix shipped yet; tracked upstream at typescript-eslint#10940). Microsoft's own documented side-by-side-alias workaround (aliasing `typescript` to `@typescript/typescript6` while exposing the real v7 compiler under a second alias) was tried first and reverted after it empirically broke `next build`'s own TypeScript detection (\"do not have the required package(s) installed\"). 6.0.3 is the highest real release satisfying typescript-eslint's peer range and keeps both `next build` and `pnpm exec tsc --noEmit` passing natively, with no aliasing. This reverses a previously-locked plan 01-01 decision — flagged for human review; re-upgrade once typescript-eslint ships real TS 7 support."
  - "Substituted eslint-plugin-import-x@4.17.1 for the plan-specified eslint-plugin-import@2.32.0 — the latter's import/order autofixer calls a SourceCode method ESLint 10 removed outright, crashing the linter on any out-of-order import anywhere in the codebase (verified in isolation). CONVENTIONS.md/D-26p already names import/import-x as interchangeable; import-x declares a supported ESLint 10 peer range."
  - "Pinned `settings.react.version` explicitly instead of relying on eslint-plugin-react's \"detect\" auto-probe — the auto-probe calls a context method ESLint 10 removed, crashing the linter on every component-tracking rule (react/display-name, react/no-direct-mutation-state, etc.). Pinning the version is the plugin's own documented alternative to \"detect\", not a workaround."
  - "Modernized eslint-plugin-boundaries config to the current \"dependencies\"/\"policies\" syntax instead of the plan-specified \"element-types\"/\"rules\" syntax — v7.2.0 deprecated the latter; using the current syntax up front avoids four deprecation-warning lines on every future lint run. Same enforcement semantics (no feature-to-feature imports)."
  - "Pointed eslint-plugin-tailwindcss's cssConfigPath at src/styles/globals.css — the plugin's own default (src/style.css) doesn't exist in this repo and crashed the linter outright."
  - "Scoped .prettierignore to exclude .planning/, docs/, and the root governance docs (CONTEXT.md, CONVENTIONS.md, etc.) — a bare `pnpm format .` run reformatted the entire repository including .planning/STATE.md, .planning/ROADMAP.md, and every future *-PLAN.md file. STATE.md/ROADMAP.md are explicitly orchestrator-owned in worktree mode; reverted those changes and scoped Prettier to the actual frontend application tree only."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "ESLint 10 flat config (strict type-aware tier, Next.js rules, exhaustive-deps error, unused-vars with underscore escape hatch, import ordering, no-default-export, Tailwind linting) — pnpm lint exits 0 against the scaffold"
    verification:
      - kind: other
        ref: "pnpm lint (exit 0, zero errors/warnings on the scaffold)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cross-feature import (feature -> feature) is reported as an ESLint error at severity 2 via eslint-plugin-boundaries"
    verification:
      - kind: other
        ref: "manual pnpm lint run against a throwaway src/features/a/probe.ts importing src/features/b/thing.ts — reported 'boundaries/dependencies' error, severity 2; probe files removed after verification"
        status: pass
    human_judgment: false
  - id: D3
    description: "@typescript-eslint/no-unused-vars fires as an error on a non-underscore-prefixed unused parameter and is silent on the underscore-prefixed equivalent"
    verification:
      - kind: other
        ref: "manual pnpm exec eslint run against (a: number, b: number) => a [error] and (a: number, _b: number) => a [no error]"
        status: pass
    human_judgment: false
  - id: D4
    description: "Prettier config (120 print width, double quotes, trailing commas, Tailwind class sorting via prettier-plugin-tailwindcss) — pnpm format:check exits 0 and pnpm lint still exits 0 after formatting"
    verification:
      - kind: other
        ref: "pnpm format:check (exit 0); pnpm lint (exit 0) re-run after pnpm format"
        status: pass
    human_judgment: false
  - id: D5
    description: "Husky + lint-staged blocking pre-commit hook: an auto-fixable violation (single quotes, missing semicolon) is silently rewritten and the commit succeeds; a genuine unfixable lint error (unused non-underscore parameter) rejects the commit outright with no --no-verify/|| true escape hatch"
    verification:
      - kind: other
        ref: "real `git commit` invocations against throwaway probe files — auto-fixable case: file rewritten in place, commit succeeded; unfixable case: eslint --fix failed, commit rejected (exit 1), no commit created. Both probe files and the auto-fix commit were removed/undone before the real Task 3 commit."
        status: pass
    human_judgment: false
  - id: D6
    description: "typescript downgraded from 7.0.2 (plan 01-01's pin) to 6.0.3 to reconcile typescript-eslint's hard rejection of TS >=7.0, while keeping next build and tsc --noEmit passing natively"
    verification: []
    human_judgment: true
    rationale: "Reverses a previously-locked technology-version decision from plan 01-01's SUMMARY.md. The underlying gap is an upstream tooling limitation (typescript-eslint#10940), not a bug in this plan's config — but reversing a locked decision from a prior plan needs human awareness/sign-off, and re-upgrading to TS 7.x should be revisited once typescript-eslint ships real support."

# Metrics
duration: 33min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 2: Linter, Formatter & Pre-commit Hook Summary

**ESLint 10 flat config (strict type-aware, Next.js, react-hooks, import ordering, feature-boundary enforcement, Tailwind linting) + Prettier (120-column, Tailwind class sorting) + a blocking Husky/lint-staged pre-commit hook — with TypeScript downgraded from 7.0.2 to 6.0.3 to reconcile a hard typescript-eslint incompatibility.**

## Performance

- **Duration:** ~33 min
- **Started:** 2026-08-10T19:21:13Z
- **Completed:** 2026-08-10T19:54:35Z
- **Tasks:** 3
- **Files modified:** 5 created, 4 modified

## Accomplishments
- `eslint.config.mjs` rewritten as a full ESLint 10 flat config: typescript-eslint `strictTypeChecked`/`stylisticTypeChecked` with `projectService`, `eslint-config-next` recommended + core-web-vitals, `react-hooks/exhaustive-deps` escalated to error, `@typescript-eslint/no-unused-vars` as error with an underscore escape hatch, import ordering via `eslint-plugin-import-x` with the five path aliases, `no-default-export` (with the Next.js-framework-file override), `eslint-plugin-boundaries` enforcing the feature-folder boundary (no `feature -> feature` imports), and `eslint-plugin-tailwindcss`.
- `.prettierrc.json`/`.prettierignore` written per D-26m (semicolons, double quotes, trailing commas, 120-column width, `prettier-plugin-tailwindcss` pointed at `src/styles/globals.css`); `format`/`format:check` scripts added and the scaffold reformatted so it ships already conformant.
- Husky v9 (`pnpm exec husky init`) + `lint-staged.config.mjs` wired into `.husky/pre-commit` (`pnpm exec lint-staged`, no bypass) — Prettier runs before ESLint `--fix` so they never fight over the same lines; `tsc --noEmit` is deliberately excluded per D-26f (CI stays the full-project type gate).
- Verified three separate upstream ESLint-10 incompatibilities by reproducing each crash in isolation, then applied the documented/maintained fix for each (react version pinning, `eslint-plugin-import` → `eslint-plugin-import-x` substitution, `eslint-plugin-boundaries` v7 syntax migration) rather than working around them superficially.
- Discovered and reverted a scope leak: an unqualified `pnpm format` reformatted the entire repository including `.planning/STATE.md` and `.planning/ROADMAP.md`; reverted those and every other out-of-scope file, then scoped `.prettierignore` to keep Prettier inside the frontend application tree going forward.

## Task Commits

Each task was committed atomically:

1. **Task 1: ESLint 10 flat config — strict, type-aware, boundary-enforcing** - `c154145` (feat)
2. **Task 2: Prettier config and format scripts** - `a034145` (feat)
3. **Task 3: Husky + lint-staged blocking pre-commit hook** - `c4656f2` (feat)

**Plan metadata:** this SUMMARY.md commit (docs)

## Files Created/Modified
- `eslint.config.mjs` — full ESLint 10 flat config (see Accomplishments)
- `.prettierrc.json` — Prettier config (120 width, double quotes, trailing commas, Tailwind plugin)
- `.prettierignore` — generated/vendored exclusions plus the `.planning/`/`docs/`/root-governance-docs scope boundary
- `lint-staged.config.mjs` — staged-file Prettier-then-ESLint pipeline (default export)
- `.husky/pre-commit` — `pnpm exec lint-staged`, no bypass
- `package.json` — `lint`/`format`/`format:check`/`prepare` scripts; all new devDependencies exact-pinned
- `pnpm-lock.yaml` — updated for all new/changed dependencies
- `app/layout.tsx`, `tsconfig.json` — reformatted by the initial `pnpm format` run (Tailwind class sort, line width)

## Decisions Made
See `key-decisions` in frontmatter for full rationale. Summary: downgraded `typescript` 7.0.2 → 6.0.3 (reconciles typescript-eslint's TS7 rejection without breaking `next build`), substituted `eslint-plugin-import-x` for `eslint-plugin-import` (ESLint 10 support), pinned `settings.react.version` instead of "detect" (avoids a removed-API crash), modernized `eslint-plugin-boundaries` to its current `dependencies`/`policies` syntax, pointed `eslint-plugin-tailwindcss` at the real stylesheet path, and scoped `.prettierignore` to keep Prettier out of `.planning/`/`docs/`/root governance docs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] typescript-eslint@8.66.0 cannot run against TypeScript 7.0.2**
- **Found during:** Task 1 (`pnpm lint` failed outright at import time)
- **Issue:** `typescript-eslint@8.66.0` (and the latest available `8.67.0`) hard-throws `"typescript-eslint does not support TS 7.0"` the moment it `require()`s the `typescript` package, because plan 01-01 pinned `typescript@7.0.2`. No newer typescript-eslint release fixes this (verified via npm registry).
- **Fix:** First tried Microsoft's own documented workaround (npm-alias `typescript` to the `@typescript/typescript6` compatibility package, exposing the real v7 compiler under a second alias, `@typescript/native`) — this satisfied typescript-eslint but broke `next build`'s own TypeScript detection (`"It looks like you're trying to use TypeScript but do not have the required package(s) installed"`), confirmed by reproducing the build failure directly. Reverted the alias entirely and downgraded the real `typescript` devDependency to `6.0.3` (highest release satisfying typescript-eslint's `<6.1.0` peer range) — a plain, unaliased package that both `next build` and `typescript-eslint` understand natively.
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm lint` (exit 0), `pnpm build` (exit 0, route table printed), `pnpm exec tsc --noEmit` (exit 0) all re-verified after the downgrade.
- **Committed in:** `c154145` (Task 1 commit)

**2. [Rule 3 - Blocking] eslint-plugin-react's React-version auto-detection crashes under ESLint 10**
- **Found during:** Task 1 (`pnpm lint` crashed while linting `app/page.tsx`)
- **Issue:** `eslint-plugin-react@7.37.5` (bundled by `eslint-config-next@16.3.0`, latest available, peer range only covers ESLint <=9.7) calls `context.getFilename()` — a method ESLint 10 removed — while auto-detecting the installed React version. This crashes essentially every component-tracking rule (`react/display-name`, `react/no-direct-mutation-state`, etc.), not just one.
- **Fix:** Set `settings.react.version` to the literal installed React version (`"19.2.8"`) instead of relying on `"detect"` — the plugin's own documented alternative, which skips the crashing auto-probe entirely.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` runs clean against `app/page.tsx`/`app/layout.tsx` with no crash.
- **Committed in:** `c154145` (Task 1 commit)

**3. [Rule 3 - Blocking] eslint-plugin-import's import/order autofixer crashes under ESLint 10**
- **Found during:** Task 1 (`pnpm lint` crashed on `eslint.config.mjs` itself, which had out-of-order imports)
- **Issue:** `eslint-plugin-import@2.32.0` (plan-specified, latest available, peer range only covers ESLint <=9) calls `sourceCode.getTokenOrCommentBefore`, a legacy SourceCode API ESLint 10 removed, inside its `import/order` autofixer — this fires on any out-of-order import in the whole codebase, not just an edge case, since ESLint always computes fix-ability even without `--fix`.
- **Fix:** Substituted `eslint-plugin-import-x@4.17.1` (actively-maintained fork, declared ESLint 10 peer support), registered under the `import-x` plugin key with `import-x/order`/`import-x/no-default-export` rules. CONVENTIONS.md/D-26p already names `eslint-plugin-import`/`import-x` as interchangeable for this purpose.
- **Files modified:** `eslint.config.mjs`, `package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm lint` runs clean; `import-x/order` correctly reports and auto-fixes out-of-order imports without crashing.
- **Committed in:** `c154145` (Task 1 commit)

**4. [Rule 1 - Bug] eslint-plugin-tailwindcss's default cssConfigPath doesn't exist in this repo**
- **Found during:** Task 1 (`pnpm lint` crashed with `ENOENT: no such file or directory, open '.../src/style.css'`)
- **Issue:** The plugin's default `cssConfigPath` (`src/style.css`) doesn't match this project's actual Tailwind v4 entry stylesheet (`src/styles/globals.css`, per plan 01-01/CONVENTIONS.md).
- **Fix:** Set `settings.tailwindcss.cssConfigPath` to `"src/styles/globals.css"`.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` no longer crashes; Tailwind class-order rules correctly evaluate against the real stylesheet.
- **Committed in:** `c154145` (Task 1 commit)

**5. [Rule 1 - Bug] eslint-plugin-boundaries deprecation warnings from the plan-specified rule syntax**
- **Found during:** Task 1 (behavior-check verification for the cross-feature-import boundary)
- **Issue:** The plan's exact `boundaries/element-types`/`rules` syntax works but `eslint-plugin-boundaries@7.2.0` deprecated it in favor of `boundaries/dependencies`/`policies` with entity-selector wrapping, printing four deprecation-warning lines on every lint run.
- **Fix:** Migrated to the current, non-deprecated syntax (verified against the plugin's own v6-to-v7 migration guide) with identical enforcement semantics.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` produces zero deprecation warnings; the cross-feature-import behavior check still fires a `boundaries/dependencies` error at severity 2.
- **Committed in:** `c154145` (Task 1 commit)

**6. [Rule 1 - Bug] Unscoped `pnpm format` reformatted the entire repository, including orchestrator-owned files**
- **Found during:** Task 2 (after running `pnpm format` once per the plan's instruction)
- **Issue:** `prettier --write .` with no ignore scoping reformatted every markdown/JSON/YAML file in the repo, including `.planning/STATE.md`, `.planning/ROADMAP.md`, every `*-PLAN.md` (01-01 through 01-15), `docs/adr/**`, and the root governance docs (`CONTEXT.md`, `CONVENTIONS.md`, etc.) — none of which are part of this plan's scaffold, and STATE.md/ROADMAP.md are explicitly orchestrator-owned in worktree mode per this dispatch's instructions.
- **Fix:** Reverted every out-of-scope file via `git checkout --`, then added `.planning/`, `docs/`, and the root governance docs to `.prettierignore` so future `pnpm format`/`pnpm format:check` runs only ever touch the frontend application tree.
- **Files modified:** `.prettierignore`
- **Verification:** `git status` after the revert shows only the intended scaffold files modified; `pnpm format:check` still exits 0 against the (now-scoped) application tree.
- **Committed in:** `a034145` (Task 2 commit)

---

**Total deviations:** 6 auto-fixed (3 blocking upstream ESLint-10 incompatibilities, 2 bugs/config-correctness fixes, 1 scope-leak correction). One deviation (typescript downgrade, #1 above) reverses a previously-locked plan 01-01 decision and is additionally flagged as `human_judgment: true` in the coverage block (D6) for explicit human awareness.
**Impact on plan:** All fixes were necessary to make the plan's stated deliverable (a working ESLint 10 + Prettier + Husky toolchain with zero errors) actually function — every one was verified by reproducing the failure in isolation first, not guessed at. No scope creep beyond what was needed to make Tasks 1-3 pass their own acceptance criteria; the `.prettierignore` scoping fix additionally protects the orchestrator's STATE.md/ROADMAP.md ownership going forward.

## Issues Encountered
- The TypeScript 7.0.2 / typescript-eslint incompatibility (deviation #1) is a current, unresolved upstream gap (typescript-eslint#10940), not something this plan can permanently fix — `typescript` is now at 6.0.3 instead of plan 01-01's 7.0.2 pin. Re-upgrading should be revisited once typescript-eslint ships real TS 7 support.
- `pnpm peers check` still reports unmet `eslint` peer warnings from `eslint-config-next`'s own bundled `eslint-plugin-import`/`eslint-plugin-jsx-a11y`/`eslint-plugin-react` (all declare ESLint <=9 peer ranges). These are informational only — `pnpm lint` runs clean with no crashes after the fixes above — but will only fully clear once `eslint-config-next` itself ships an ESLint-10-compatible release.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `pnpm lint`, `pnpm format:check`, `pnpm build`, and `pnpm exec tsc --noEmit` all exit 0 on the current scaffold; a real `git commit` was used (not just standalone tool invocations) to prove the pre-commit hook actually blocks/auto-fixes as designed.
- Ready for plan 01-03 (CI workflow) — `lint`/`format:check`/`build` scripts now exist for CI to call, and the pre-commit hook gives fast local feedback before every push.
- Flag for orchestrator/human: `typescript` is pinned at `6.0.3`, not plan 01-01's original `7.0.2` — see Deviation #1 and coverage item D6.

## Self-Check: PASSED

- `eslint.config.mjs` exists: FOUND
- `.prettierrc.json` exists: FOUND
- `.prettierignore` exists: FOUND
- `lint-staged.config.mjs` exists: FOUND
- `.husky/pre-commit` exists: FOUND
- Commit `c154145` found in `git log --oneline --all`: FOUND
- Commit `a034145` found in `git log --oneline --all`: FOUND
- Commit `c4656f2` found in `git log --oneline --all`: FOUND
- `pnpm lint` exit 0: CONFIRMED (final re-run)
- `pnpm format:check` exit 0: CONFIRMED (final re-run)
- `pnpm build` exit 0: CONFIRMED (final re-run, route table printed)
- `pnpm exec tsc --noEmit` exit 0: CONFIRMED (final re-run)
- Cross-feature import boundary error (severity 2): CONFIRMED (behavior check)
- Unfixable-lint-error commit rejection: CONFIRMED (behavior check via real `git commit`)

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-10*
