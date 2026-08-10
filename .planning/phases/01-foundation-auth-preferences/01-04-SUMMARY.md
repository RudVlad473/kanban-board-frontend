---
phase: 01-foundation-auth-preferences
plan: 04
subsystem: tooling
tags: [style-dictionary, dtcg, design-tokens, tailwindcss, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: "pnpm-managed Next.js 16.3.0 App Router scaffold, CONVENTIONS.md folder skeleton, Tailwind v4.3.3 wired end to end"
  - phase: 01-02
    provides: "ESLint 10 flat config, Prettier, Husky/lint-staged blocking pre-commit hook"
  - phase: 01-03
    provides: "GitHub Actions CI workflow, .gitattributes eol=lf normalization, test script placeholder"
provides:
  - "Six DTCG token source files under tokens/ (color primitive + light/dark semantic, spacing, typography, radius, shadow, breakpoint), primitive-to-semantic two-tier system (D-02)"
  - "Style Dictionary build producing a single src/styles/tokens.css: a Tailwind v4 @theme block (light values) followed by a .dark class-scoped override block (same token names, dark values, D-09)"
  - "A composite typography token expanded into individually-addressable Tailwind v4 custom properties (--font-*/--text-*/--font-weight-*/--leading-*/--tracking-*), not a collapsed shorthand string"
  - "tokens/style-dictionary.build.test.ts — a D-12 pipeline-level Vitest suite (6 tests) covering all six categories, both mode scopes, rebuild-freshness, and unresolved-alias rejection"
  - "app/page.tsx and src/styles/globals.css wired to consume semantic tokens only, with a temporary theme-probe button proving both mode scopes resolve"
affects: ["01-05", "01-06", "01-07", "01-08", "01-09", "01-10", "01-11", "01-12", "01-13", "01-14", "01-15"]

# Actuals (#2632)
actuals:
  tokens: 62000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: ["style-dictionary@5.5.1", "vitest@4.1.10"]
  patterns:
    - "style-dictionary.config.mjs exports createConfig(mode) instead of a single default config — Style Dictionary v5 has no per-platform `source` override, so light and dark color builds run as two separate StyleDictionary instances with disjoint sources"
    - "scripts/build-tokens.mjs drives both builds via the JS API's formatPlatform() (never buildPlatform()/buildAllPlatforms()) and concatenates the CSS text itself, writing only the final src/styles/tokens.css — no intermediate .part.css files ever touch disk"
    - "A minimal 'css-raw' transform group (name/kebab only) deliberately skips Style Dictionary's built-in css transformGroup, whose typography/css/shorthand and color/css transforms would collapse composite tokens to a shorthand string and lowercase authored hex literals"
    - "Breakpoint tokens are authored as breakpoint.mobile/tablet/desktop (design-facing names) but rewritten to --breakpoint-sm/md/lg at format time (Tailwind's responsive-variant namespace) — a deliberate rename, not a pass-through"

key-files:
  created:
    - tokens/color.tokens.json
    - tokens/color.light.tokens.json
    - tokens/color.dark.tokens.json
    - tokens/spacing.tokens.json
    - tokens/typography.tokens.json
    - tokens/radius.tokens.json
    - tokens/shadow.tokens.json
    - tokens/breakpoint.tokens.json
    - tokens/style-dictionary.build.test.ts
    - style-dictionary.config.mjs
    - scripts/build-tokens.mjs
    - vitest.config.ts
    - src/styles/tokens.css
  modified:
    - app/layout.tsx
    - app/page.tsx
    - src/styles/globals.css
    - package.json
    - eslint.config.mjs

key-decisions:
  - "Style Dictionary v5 has no per-platform `source` override (`_exportPlatform` clones the instance-level token tree built once from the top-level `source`) and no built-in 'append to an existing output file' option. Loading color.light.tokens.json and color.dark.tokens.json into one dictionary collides on every identical semantic path (color.bg.app etc.) and silently drops one mode's values — confirmed by reading Style Dictionary's own source (lib/StyleDictionary.js). Restructured style-dictionary.config.mjs to export createConfig(mode) and added scripts/build-tokens.mjs to drive two isolated builds and concatenate their output. tokens:build now runs this script instead of the bare `style-dictionary build` CLI (deviation from the plan's literal npm-script text; the underlying requirement — one command, one merged tokens.css, @theme then .dark — is fully met)."
  - "Radius values (radius.sm/md/lg = 4px/24px/28px) were measured from the PDF's page-1 Design System frames (Text Field, Button Secondary, Button Primary L) using a purpose-built pixel-edge-detection script against a 600 DPI pdftoppm render, not eyeballed. Shadow.sm is a visual approximation of the Dropdown (Active) frame's soft corner shadow — the PDF export carries no inspectable vector shadow properties (offset/blur/spread), only a rasterized gradient — so exact values could not be measured the same way. Shadow.md/lg are proportionally scaled from shadow.sm, not independently sourced (only the Dropdown frame was in scope per this plan). All measured/approximated values carry their source frame and measurement method in the token's own $description and are flagged for confirmation at the plan 01-09 visual checkpoint."
  - "The gitignored `.planning/local-assets/kanban-task-management-web-app.pdf` design source (required by Task 1/2's preconditions) was absent from this worktree — worktrees are separate checkouts and gitignored files aren't carried over from the main repo. Copied it from the main repo's `.planning/local-assets/` into this worktree's same path before starting Task 1; this is a filesystem copy of a git-ignored, non-tracked file, not a git operation, and does not touch any commit."
  - "app/layout.tsx's placeholder Geist Sans/Mono fonts (scaffold default) were replaced with Plus Jakarta Sans (weights 500/700, next/font/google) since the design system's typography tokens reference only that family and the Geist fonts became fully unreferenced once globals.css was rewritten in Task 3."

requirements-completed: [AUTH-01, AUTH-02, THEME-01]

coverage:
  - id: D1
    description: "A composite DTCG typography token (font-heading-xl) expands into four separately-addressable Tailwind v4 custom properties (family/size/weight/line-height), and font-heading-s additionally emits a --tracking-* letter-spacing property — proving Style Dictionary v5's DTCG composite support doesn't silently drop a sub-value (RESEARCH.md Pitfall 4)"
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#expands the composite font-heading-xl typography token into four individually-addressable custom properties"
        status: pass
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#carries font-heading-s's letter-spacing as a distinct --tracking-* custom property"
        status: pass
    human_judgment: false
  - id: D2
    description: "All six DTCG token categories (color, spacing, typography, radius, shadow, breakpoint) are authored as separate source files under tokens/, with a primitive tier and an alias-only semantic tier for color (no raw hex in the semantic files) — D-01/D-02"
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#has every one of the six DTCG categories contribute at least one custom property to the generated stylesheet"
        status: pass
      - kind: other
        ref: "node script scanning tokens/color.light.tokens.json and tokens/color.dark.tokens.json for a raw six-digit hex literal — none found"
        status: pass
    human_judgment: false
  - id: D3
    description: "Light and dark semantic color values resolve under the identical custom-property name (color-bg-app etc.) in two scopes of one generated stylesheet — @theme (light) then .dark (dark) — so no component ever branches on theme (D-09)"
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#resolves color-bg-app to the light hex in the @theme block and the dark hex in the .dark block, under the same custom-property name"
        status: pass
      - kind: other
        ref: "Real dev-server fetch of the compiled Turbopack CSS chunk: --color-bg-app: #f4f7fd under :root scope, --color-bg-app: #20212c under .dark scope (Tailwind's own minifier lowercases hex at this stage; Style Dictionary's own output in src/styles/tokens.css keeps the authored uppercase form, verified separately)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The pipeline fails loudly and in one place (D-12): a changed token value survives a rebuild rather than serving a stale artefact, and a semantic token whose alias target doesn't exist rejects the build rather than emitting an unresolved {reference} string into the CSS"
    verification:
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#rebuilds with a changed token value rather than silently serving a stale artefact"
        status: pass
      - kind: unit
        ref: "tokens/style-dictionary.build.test.ts#fails the build rather than emitting an unresolved reference string when a semantic token's alias target doesn't exist"
        status: pass
    human_judgment: false
  - id: D5
    description: "app/page.tsx consumes semantic Tailwind utilities only (bg-bg-app, bg-bg-surface, text-text-primary, text-text-muted, bg-bg-primary/text-text-on-primary) — no raw hex literal from tokens/color.tokens.json appears in the file — and a theme-probe button toggles the .dark class"
    verification:
      - kind: other
        ref: "node script confirming no raw hex value from tokens/color.tokens.json appears in app/page.tsx"
        status: pass
      - kind: other
        ref: "pnpm build (exit 0) and pnpm lint (exit 0) against the wired app/page.tsx and src/styles/globals.css"
        status: pass
    human_judgment: false
  - id: D6
    description: "Toggling the .dark class visibly re-resolves every semantic colour together, without any component-level theme branching — the manual click-through spot check from the plan's acceptance criteria"
    verification: []
    human_judgment: true
    rationale: "This executor is a background parallel worktree agent and cannot literally click a button in a browser. Every automatable proxy was run instead: a real `pnpm dev` server, a fetch of the served HTML confirming the theme-probe/scaffold-probe elements and semantic utility classes render, and a fetch of the compiled Turbopack CSS chunk confirming Tailwind resolves --color-bg-app to the light hex under :root and the dark hex under .dark, with .bg-bg-app/.text-text-primary utilities generated. Per this repo's default workflow.human_verify_mode = end-of-phase (no .planning/config.json present), this is deferred to the phase's consolidated UAT review, consistent with how plans 01-01 (D5) and 01-03 (D3) handled the same limitation."
  - id: D7
    description: "Radius and shadow token values (not present in the PDF text layer) are measured/approximated from the Figma PDF export rather than invented, with the measurement method and source frame recorded for a later visual confirmation (D-06)"
    verification: []
    human_judgment: true
    rationale: "radius.sm/md/lg were measured algorithmically (pixel edge-detection against a 600 DPI render) with high confidence, but shadow.sm is a visual approximation only (the PDF export has no inspectable vector shadow properties) and shadow.md/lg are proportionally extrapolated, not independently sourced — flagged in each token's $description for confirmation at the plan 01-09 visual checkpoint, per this plan's own explicit instruction."

# Metrics
duration: 95min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 4: Token Pipeline Summary

**DTCG → Style Dictionary → Tailwind v4 token pipeline: six category source files, a two-tier primitive/semantic color system with identical light/dark token names, a composite-typography-safe custom transform group, and a six-test D-12 pipeline gate — wired into the app end to end.**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-08-10T22:22:00Z (worktree base, after HEAD assertion)
- **Completed:** 2026-08-10T23:57:00Z
- **Tasks:** 3
- **Files modified:** 13 created, 6 modified

## Accomplishments
- Authored `tokens/typography.tokens.json` with the five UI-SPEC composite text styles and a Style Dictionary config that expands each into individually-addressable Tailwind v4 custom properties, proven first and alone against a pipeline test per RESEARCH.md Pitfall 4 (composite-type DTCG support is a Style Dictionary v5 "work in progress" area).
- Authored the primitive color tier (`tokens/color.tokens.json`) and alias-only light/dark semantic tiers (`color.light.tokens.json`/`color.dark.tokens.json`, identical token paths, D-02/D-09), plus spacing (extended to `space-16`/64px), breakpoint, radius, and shadow categories.
- Measured `radius.sm`/`md`/`lg` (4px/24px/28px) from the PDF's Text Field, Button Secondary, and Button Primary (L) frames using a purpose-built pixel-edge-detection script against a 600 DPI render — not eyeballed, not invented.
- Discovered and worked around a real Style Dictionary v5 constraint: no per-platform `source` override and no "append to existing file" option, which would have silently dropped either the light or dark color values if both were loaded into one dictionary. Restructured the config into `createConfig(mode)` plus a small `scripts/build-tokens.mjs` orchestration script that builds light and dark separately via the JS API and concatenates the CSS text itself.
- Wired `src/styles/globals.css` (imports `tailwindcss` then `./tokens.css`, declares the `dark` custom variant bound to `.dark`) and rewrote `app/page.tsx` to consume semantic tokens only, with a temporary theme-probe button.
- Extended `tokens/style-dictionary.build.test.ts` to 6 tests covering all six categories, both mode scopes, rebuild-freshness, and unresolved-alias rejection — verified the alias-rejection case is real by confirming Style Dictionary's own default `errors.brokenReferences: throwBrokenReference` behavior, not asserting on a string that would also pass on a half-broken build.
- Verified the full chain against a real `pnpm dev` server: fetched HTML confirms both probe elements and semantic utility classes render; fetched the compiled Turbopack CSS chunk confirms `--color-bg-app` resolves to the light hex under `:root` and the dark hex under `.dark`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Style Dictionary pipeline proven end to end on the composite typography token** — `8340074` (feat)
2. **Task 2: Author the remaining token categories, primitive and semantic tiers** — `a7403a3` (feat)
3. **Task 3: Wire tokens into the app and extend the pipeline test to every category** — `ece34d6` (feat)

**Plan metadata:** this SUMMARY.md commit (docs)

## Files Created/Modified
- `tokens/color.tokens.json` — primitive color tier (purple/red/grey scales + white), raw hex only
- `tokens/color.light.tokens.json` / `tokens/color.dark.tokens.json` — semantic color tier, identical token paths, alias-only values (D-02)
- `tokens/spacing.tokens.json` — numeric spacing scale, extended to `space-16` (64px)
- `tokens/typography.tokens.json` — five composite text styles (D-05)
- `tokens/radius.tokens.json` — measured radius scale (4px/24px/28px)
- `tokens/shadow.tokens.json` — Dropdown-frame-derived + proportionally-scaled shadow scale
- `tokens/breakpoint.tokens.json` — mobile/tablet/desktop, renamed to `--breakpoint-sm/md/lg` at format time
- `tokens/style-dictionary.build.test.ts` — D-12 pipeline test, 6 assertions
- `style-dictionary.config.mjs` — custom `css/tailwind-theme`/`css/tailwind-dark-scope` formats, `css-raw` transform group, `createConfig(mode)`
- `scripts/build-tokens.mjs` — two-pass build + CSS concatenation orchestration
- `vitest.config.ts` — node-environment Vitest project scoped to `tokens/**/*.test.ts`
- `src/styles/tokens.css` — generated output (never hand-edited; `prebuild`/`predev` regenerate it)
- `src/styles/globals.css` — now `@import "tailwindcss"` → `@import "./tokens.css"` → `@custom-variant dark`
- `app/page.tsx` — semantic-token-only consumer with `scaffold-probe`/`theme-probe`
- `app/layout.tsx` — Plus Jakarta Sans (500/700) via `next/font/google`, replacing the scaffold's Geist placeholders
- `package.json` — `tokens:build`/`prebuild`/`predev` scripts, `test: vitest run`, `style-dictionary`/`vitest` exact-pinned
- `eslint.config.mjs` — extended the config-file `allowDefaultProject`/`disableTypeChecked` exemption to `scripts/*.mjs`

## Decisions Made
See `key-decisions` in frontmatter for full rationale. Summary: restructured the token build around `createConfig(mode)` + a small orchestration script instead of a single two-platform Style Dictionary config, after confirming (by reading Style Dictionary v5's own source) that per-platform source overrides don't exist and would have caused a silent light/dark collision; measured radius values algorithmically from the PDF rather than eyeballing them; approximated shadow.sm visually (PDF has no inspectable shadow vectors) and scaled shadow.md/lg proportionally, flagged for later confirmation; copied the gitignored PDF design asset into this worktree (filesystem copy, not a git operation) since worktrees don't carry gitignored files from the main repo; replaced the scaffold's placeholder Geist fonts with the design system's actual typeface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Style Dictionary v5 cannot build light and dark color modes from one two-platform config into one file**
- **Found during:** Task 2 (extending the config to two platforms per the plan's literal instruction)
- **Issue:** The plan's Task 2 action specifies "two platforms... Both write into the single src/styles/tokens.css." Style Dictionary v5's `_exportPlatform` clones the *instance-level* `this.tokens`/`this.allTokens` (built once from the top-level `source`), not a per-platform source — confirmed by reading `lib/StyleDictionary.js` directly. Loading `color.light.tokens.json` and `color.dark.tokens.json` into one dictionary collides on every identical semantic path (`color.bg.app` etc.) since both authors the same token path with a different value, and Style Dictionary's own collision handling means the second-loaded file silently wins for the whole build — the other mode's values would vanish with only a console warning easy to miss. Separately, there is no built-in "append to an existing output file" option, so even with disjoint sources, two platforms writing to the same `destination` would simply overwrite rather than concatenate.
- **Fix:** Restructured `style-dictionary.config.mjs` to export `createConfig(mode)` (light: color.tokens + color.light.tokens + the five mode-invariant categories; dark: color.tokens + color.dark.tokens only) instead of a single default config. Added `scripts/build-tokens.mjs`, which constructs two separate `StyleDictionary` instances (disjoint sources, no collision possible) and uses the JS API's `formatPlatform()` — which formats without writing to disk — to get each mode's CSS as a string, then concatenates them itself (`@theme` block first, `.dark` block second) and writes only the final `src/styles/tokens.css`. `package.json`'s `tokens:build` script now runs this script instead of the bare `style-dictionary build --config ...` CLI invocation.
- **Files modified:** `style-dictionary.config.mjs`, `scripts/build-tokens.mjs` (new), `package.json`
- **Verification:** `pnpm tokens:build` exits 0 and writes a single `src/styles/tokens.css` with `@theme` before `.dark`; `color-bg-app` resolves to `#F4F7FD` in the theme block and `#20212C` in the dark block (asserted by both a `node -e` check and the pipeline test); no `.part.css` intermediate files are left on disk after a build.
- **Committed in:** `a7403a3` (Task 2 commit)

**2. [Rule 1 - Bug] Style Dictionary's built-in `css` transformGroup would have collapsed composite tokens and lowercased authored hex values**
- **Found during:** Task 1 (initial config authoring, before writing the pipeline test)
- **Issue:** Style Dictionary's built-in `css` transformGroup includes `typography/css/shorthand` and `shadow/css/shorthand` value transforms (collapsing a composite `$value` object into a single shorthand string before any format sees it — precisely what RESEARCH.md Pitfall 4 warns about) and `color/css` (which lowercases hex via `tinycolor2`'s `toHexString()`, breaking this plan's own uppercase-hex acceptance criteria).
- **Fix:** Registered a minimal custom `css-raw` transform group with only `name/kebab`, leaving every token's `$value` untouched (composite objects stay objects; hex stays exactly as authored) for the custom formats to handle explicitly.
- **Files modified:** `style-dictionary.config.mjs`
- **Verification:** Generated CSS carries `#635FC7`/`#EA5555`/`#F4F7FD`/`#20212C` in their authored uppercase form (asserted by the plan's own verify script); all four typography sub-values remain individually addressable.
- **Committed in:** `8340074` (Task 1 commit)

**3. [Rule 3 - Blocking] The gitignored PDF design source wasn't present in this worktree**
- **Found during:** Task 1 pre-flight (checking Task 1's stated precondition)
- **Issue:** `.planning/local-assets/kanban-task-management-web-app.pdf` is gitignored (per plan 01-01) and this worktree is a separate checkout — gitignored files from the main repo are never carried into a new worktree.
- **Fix:** Copied the file from the main repo's `.planning/local-assets/` into this worktree's identical path. A plain filesystem copy of a non-tracked, gitignored file — not a git operation, no commit involved, nothing added to this worktree's git history.
- **Files modified:** none tracked (copy target is gitignored)
- **Verification:** Task 1's precondition (`.planning/local-assets/kanban-task-management-web-app.pdf` exists and is readable) held for the remainder of the plan; Task 2's `pdftoppm` measurement commands succeeded against it.
- **Committed in:** n/a (gitignored file, never committed)

---

**Total deviations:** 3 auto-fixed (1 blocking — two-mode build restructure, 1 bug — transform-group correctness, 1 blocking — missing gitignored precondition file). **Impact on plan:** All three were necessary for the plan's own stated deliverables (a single correctly-merged `tokens.css`, individually-addressable composite sub-values, uppercase hex, and Task 2's PDF-measurement requirement) to actually be achievable — none introduced scope beyond what the plan's own acceptance criteria already required.

## Issues Encountered
- Radius/shadow measurement from a PDF export (no live Figma access, per D-03) required building a small pixel-edge-detection script rather than eyeballing pixel positions — the PDF has no vector shadow properties to inspect programmatically, so `shadow.sm` is a best-effort visual approximation and `shadow.md`/`shadow.lg` are proportional extrapolations, not independently measured. Flagged in each token's `$description` and in `coverage` (D7) for confirmation at the plan 01-09 visual checkpoint, per this plan's own explicit instruction to do so.
- The manual "click the theme-probe button and confirm colours change together" spot check (plan's own acceptance criteria) could not be literally performed by this background worktree executor. Every automatable proxy was run instead (real dev server, HTML fetch, compiled-CSS fetch) and the human step is deferred to end-of-phase UAT per this repo's default `workflow.human_verify_mode` — see `coverage` (D6), consistent with how plans 01-01 (D5) and 01-03 (D3) handled the identical limitation.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- The full token pipeline builds, tests, lints, and type-checks cleanly (`pnpm tokens:build`, `pnpm vitest run tokens`, `pnpm build`, `pnpm lint` all exit 0 on the final committed state).
- `src/styles/tokens.css` is regenerated by `prebuild`/`predev` before every build/dev start, so it can never drift from `tokens/*.tokens.json` even though it's committed.
- Ready for plan 01-05 (test harness: Vitest Browser Mode, Storybook, axe-core, Playwright visual config, per D-24) — `vitest.config.ts` currently scopes to `tokens/**/*.test.ts` only; 01-05 converts it into a multi-project config without discarding this project, per this plan's own note.
- Outstanding for the orchestrator/human: (1) confirm `radius.lg`/`radius.md`/`radius.sm` and especially `shadow.sm`/`md`/`lg` against the actual Figma file at the plan 01-09 visual checkpoint (coverage D7); (2) the theme-probe manual click-through spot check deferred to end-of-phase UAT (coverage D6); (3) `icon-button`/`lucide-react` and other Plan 1-scope-adjacent choices from RESEARCH.md remain open for later plans, unaffected by this plan.

## Self-Check: PASSED

- `tokens/color.tokens.json` exists: FOUND
- `tokens/color.light.tokens.json` exists: FOUND
- `tokens/color.dark.tokens.json` exists: FOUND
- `tokens/spacing.tokens.json` exists: FOUND
- `tokens/typography.tokens.json` exists: FOUND
- `tokens/radius.tokens.json` exists: FOUND
- `tokens/shadow.tokens.json` exists: FOUND
- `tokens/breakpoint.tokens.json` exists: FOUND
- `tokens/style-dictionary.build.test.ts` exists: FOUND
- `style-dictionary.config.mjs` exists: FOUND
- `scripts/build-tokens.mjs` exists: FOUND
- `src/styles/tokens.css` exists: FOUND
- Commit `8340074` found in `git log --oneline --all`: FOUND
- Commit `a7403a3` found in `git log --oneline --all`: FOUND
- Commit `ece34d6` found in `git log --oneline --all`: FOUND
- `pnpm tokens:build` exit 0: CONFIRMED (final re-run)
- `pnpm vitest run tokens` exit 0 (6/6 tests): CONFIRMED (final re-run)
- `pnpm build` exit 0: CONFIRMED (final re-run)
- `pnpm lint` exit 0: CONFIRMED (final re-run)
- `package.json` contains no `^`/`~` dependency prefix: CONFIRMED
- `git status --porcelain` empty: CONFIRMED

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-10*
