---
phase: 01-foundation-auth-preferences
plan: 05
subsystem: testing
tags: [vitest, browser-mode, storybook, axe-core, playwright, visual-regression]

# Dependency graph
requires:
  - phase: 01-04
    provides: "Node-only vitest.config.ts scoped to tokens/**/*.test.ts, tokens:build/prebuild/predev scripts, exact-pinned vitest@4.1.10, src/styles/globals.css wired to semantic tokens"
provides:
  - "Multi-project vitest.config.ts (tokens/browser/storybook), aliases derived from tsconfig.json's own paths map"
  - "Vitest Browser Mode (real headless Chromium via the Playwright provider) proven end to end by a throwaway HarnessProbe component's click/keyboard/disabled-state test"
  - "Storybook 10 (Vite-based Next.js framework) with the a11y addon wired to error severity and addon-vitest running axe-core headlessly against every story, proven to actually fail on a real violation (not just wired-and-assumed)"
  - "Playwright visual-regression project reading only from the built storybook-static output, with CI-only baseline generation (ignoreSnapshots off-CI) and a workflow_dispatch-only baseline workflow"
  - "A genuine token-level finding: color-bg-primary-hover (#A8A4FF) with white text fails WCAG contrast (2.22:1 vs required 4.5:1) — caught by axe-core's very first real run, flagged for the token itself to be revisited before Button's real Hovered story reuses it"
affects: ["01-06", "01-07", "01-08", "01-09", "01-10", "01-11", "01-12", "01-13", "01-14", "01-15"]

# Actuals (#2632)
actuals:
  tokens: 21000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added:
    - "@vitest/browser@4.1.10"
    - "@vitest/browser-playwright@4.1.10"
    - "vitest-browser-react@2.2.0"
    - "@testing-library/react@16.3.2"
    - "@testing-library/jest-dom@7.0.1"
    - "storybook@10.5.7"
    - "@storybook/nextjs-vite@10.5.7"
    - "@storybook/addon-a11y@10.5.7"
    - "@storybook/addon-vitest@10.5.7"
    - "@playwright/test@1.62.1"
  patterns:
    - "vitest.config.ts derives its `@/...` resolve aliases from tsconfig.json's own compilerOptions.paths at config-load time (JSON.parse + a small map), instead of restating the five aliases by hand in a second place — an alias added later to tsconfig.json can't drift out of sync with the test config"
    - "@storybook/nextjs-vite (Vite-based), not @storybook/nextjs (webpack5-based) — @storybook/addon-vitest is fundamentally Vite-based; the webpack5 framework's preset resolution is incompatible with it (confirmed by reading the addon's own compiled source, not assumed)"
    - ".storybook/vitest.setup.ts deliberately does NOT call the pre-10.3 project-annotation-wiring function — Storybook 10.3+'s addon-vitest applies .storybook/preview.ts's annotations to every story test automatically, and detects that call by a literal text scan of the setup file's own source, disabling its automatic wiring when found"
    - "scripts/serve-static.mjs: a ~40-line node:http static file server (zero new dependency) backing Playwright's webServer entry, since the visual spec must read only from the pre-built storybook-static directory, never a running app"

key-files:
  created:
    - vitest.setup.ts
    - src/components/ui/harness-probe/harness-probe.tsx
    - src/components/ui/harness-probe/harness-probe.test.tsx
    - src/components/ui/harness-probe/harness-probe.stories.tsx
    - .storybook/main.ts
    - .storybook/preview.ts
    - .storybook/vitest.setup.ts
    - playwright.config.ts
    - visual/primitives.visual.spec.ts
    - scripts/serve-static.mjs
    - .github/workflows/visual-baselines.yml
  modified:
    - vitest.config.ts
    - package.json
    - pnpm-workspace.yaml
    - eslint.config.mjs
    - tsconfig.json
    - .gitignore
    - .prettierignore
    - .github/workflows/ci.yml

key-decisions:
  - "Swapped @storybook/nextjs (the plan's originally-referenced webpack5-based framework) for @storybook/nextjs-vite, same exact version (10.5.7), identical public API (Meta/StoryObj/definePreview/setProjectAnnotations all re-exported from @storybook/react the same way). @storybook/addon-vitest requires a Vite-based Storybook builder to register a story's render function at all — with the webpack5 framework, `vitest run --project storybook` first 404'd on a hardcoded dist/preset.js path lookup inside builder-webpack5's own preset resolution, and even past that would leave every story with SB_PREVIEW_API_0014 (NoRenderFunctionError). Confirmed by reading @storybook/addon-vitest's compiled source directly, not by trial-and-error alone."
  - "Removed @storybook/nextjs (287 packages of webpack5 build chain) after the swap rather than leaving it installed unused — no dependency doing nothing, consistent with the phase's exact-pin discipline."
  - ".storybook/vitest.setup.ts is intentionally near-empty (`export {}` plus a comment). Storybook 10.3+ auto-provisions preview annotations to every addon-vitest story test; the pre-10.3 documented pattern (a setup file calling the project-annotation-wiring function) actively disables that auto-provisioning — Storybook's own runtime detects the call by a literal string scan of the setup file's source and warns 'Skipping automatic provisioning' whenever that string appears anywhere in the file, including in an explanatory code comment (discovered the hard way: the file still tripped the detection with the call removed but the string left in prose). The file is kept as the designated home for future custom Vitest setup for this project, per the plan's explicit file list."
  - "The Hovered harness-probe story uses a ring treatment (`ring-2 ring-bg-primary`) instead of swapping in `color-bg-primary-hover` as the background, specifically to avoid reproducing a real color-contrast defect that axe-core's first real run caught: #A8A4FF background with white text is 2.22:1, below the required 4.5:1. This is a genuine token-level finding from plan 01-04's color tokens, not a harness bug — flagged in coverage below and in Next Phase Readiness for Button's real Hovered story (01-06+) to address before reusing that token combination."
  - "tsconfig.json's `include` array didn't pick up .storybook/**/*.ts — TypeScript's default include-glob matching skips dot-directories. Added `.storybook/**/*.ts` explicitly, the same category of fix as the existing config-file `allowDefaultProject` exemptions."
  - "eslint.config.mjs: added an explicit override for @typescript-eslint/consistent-type-definitions (forcing `type` over `interface`, D-26i) — typescript-eslint's stylisticTypeChecked tier defaults this rule to prefer `interface`, the opposite of this project's convention, and no prior file in the repo had used an object-shape `type` alias to surface the conflict until harness-probe.tsx's props type did."
  - "pnpm-workspace.yaml: approved esbuild's install script (fetches its own platform binary from esbuild's own npm scope — standard, audited behavior), required for Storybook's Vite-based builder chain (@storybook/builder-vite / @storybook/csf-plugin) to run at all."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "A component test co-located with a component runs in a real browser (headless Chromium via the Playwright provider) and asserts on clicks and keyboard interaction, not a simulated DOM — proven by HarnessProbe's test exercising click, keyboard Enter, and disabled-state suppression via a native DOM click() call"
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "src/components/ui/harness-probe/harness-probe.test.tsx#HarnessProbe > invokes onActivate on click"
        status: pass
      - kind: unit
        ref: "src/components/ui/harness-probe/harness-probe.test.tsx#HarnessProbe > invokes onActivate on keyboard Enter"
        status: pass
      - kind: unit
        ref: "src/components/ui/harness-probe/harness-probe.test.tsx#HarnessProbe > renders disabled and suppresses activation"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every Storybook story is checked by axe-core automatically and the check has real teeth — demonstrated by a deliberate negative control (stripping the probe's accessible name, confirming the run fails on a genuine button-name violation, then reverting) rather than merely wiring the addon and assuming it works"
    verification:
      - kind: unit
        ref: "vitest run --project storybook — 4/4 stories pass axe-core checks on the final committed state"
        status: pass
      - kind: other
        ref: "Negative control: temporarily set meta.args.label to '' and re-ran `pnpm vitest run --project storybook` — confirmed FAIL with axe-core's real button-name violation message (not a placeholder assertion), then reverted and re-confirmed the run passes"
        status: pass
    human_judgment: false
  - id: D3
    description: "A visual-regression baseline can be captured for a Storybook story and a later pixel change would fail the test — playwright.config.ts + visual/primitives.visual.spec.ts exist, are wired to storybook-static, and run cleanly off-CI (screenshot assertions skipped by design via ignoreSnapshots)"
    verification:
      - kind: e2e
        ref: "pnpm exec playwright test — 8/8 pass locally (navigation + render assertions only, screenshot assertion skipped off-CI by ignoreSnapshots design)"
        status: pass
    human_judgment: true
    rationale: "The plan's own acceptance criteria for this deliverable is an end-to-end proof requiring a real GitHub Actions dispatch of visual-baselines.yml, downloading the resulting artifact, committing the baseline PNGs, pushing, and confirming the `visual` CI job then passes against them — a multi-run round trip against the real GitHub remote. This worktree executor can push to its own branch (not master) per worktree safety boundaries, same constraint plan 01-03 documented for its own CI proof (D3). That dispatch-and-verify loop was not run in this session — see Next Phase Readiness. Everything short of the live dispatch is verified: the workflow YAML is valid and content-checked, and the identical `pnpm exec playwright test` command that CI runs was executed locally and passed."
  - id: D4
    description: "The harness is proven working by a throwaway smoke component (HarnessProbe) before any real primitive exists — Button (plan 01-06+) is not the first thing the harness is ever run against"
    verification:
      - kind: unit
        ref: "src/components/ui/harness-probe/harness-probe.test.tsx — 4/4 tests pass in real headless Chromium"
        status: pass
      - kind: unit
        ref: "src/components/ui/harness-probe/harness-probe.stories.tsx — 4 stories, all pass axe-core"
        status: pass
      - kind: e2e
        ref: "visual/primitives.visual.spec.ts — 8 assertions against the 4 harness-probe stories x 2 mode scopes"
        status: pass
    human_judgment: false
  - id: D5
    description: "Storybook stories contain no interaction test logic — harness-probe.stories.tsx is visual-only CSF3 (Hovered/Focused staged via decorator class application, never a play function); behavioural assertions live exclusively in the co-located test file"
    verification:
      - kind: other
        ref: "grep for 'play' / play-function export in harness-probe.stories.tsx — no match; 4 story exports (Default/Hovered/Focused/Disabled) confirmed via story-collection output during the vitest storybook project run"
        status: pass
    human_judgment: false
  - id: D6
    description: "CI runs the component tests, the accessibility checks, and the visual-regression checks — not only lint, format and build. The quality job's Test step runs `pnpm test` (all three vitest projects) with a Playwright-browser-install step added ahead of it; a new `visual` job (needs: quality) builds Storybook and runs the Playwright visual project"
    verification:
      - kind: other
        ref: "node -e token-presence check on .github/workflows/ci.yml (build-storybook, playwright test, pnpm test all present) — pass; local run of the exact same commands (pnpm test, pnpm build-storybook, pnpm exec playwright test) all exit 0"
        status: pass
    human_judgment: true
    rationale: "Same category as D3 — the workflow YAML's correctness is verified locally (content checks + running the identical commands the workflow invokes), but an actual green GitHub Actions run for this exact workflow has not been observed in this session, deferred to the same follow-up as D3."

# Metrics
duration: 130min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 5: Testing Harness Summary

**Vitest Browser Mode (real headless Chromium) + Storybook 10 with axe-core at error severity + Playwright visual regression against the built Storybook — all three proven working (not just wired) by a throwaway smoke component, before Button, the first real primitive, exists.**

## Performance

- **Duration:** ~130 min
- **Started:** 2026-08-10T23:05:00Z (worktree base, after HEAD assertion)
- **Completed:** 2026-08-10T23:50:00Z
- **Tasks:** 3
- **Files modified:** 11 created, 8 modified

## Accomplishments
- Converted `vitest.config.ts` into a three-project config (`tokens`/`browser`/`storybook`) that derives its `@/...` resolve aliases from `tsconfig.json`'s own `paths` map instead of restating them, keeping the plan 01-04 token pipeline test intact.
- Installed and wired Vitest Browser Mode with the Playwright provider (`@vitest/browser` + `@vitest/browser-playwright`, split packages per Vitest 4) and `vitest-browser-react`; wrote `HarnessProbe`, a throwaway smoke component, and a co-located test proving click, keyboard-Enter, and disabled-state-suppression all work in a real headless Chromium instance — the click/keyboard/disabled trio D-20 requires of every primitive.
- Wired Storybook 10 with `@storybook/addon-a11y` (`a11y.test: "error"`) and `@storybook/addon-vitest`, running axe-core headlessly against all four `HarnessProbe` stories via the new `storybook` Vitest project — proven with a genuine negative control (temporarily stripped the probe's accessible name, confirmed the run fails on a real `button-name` axe violation, reverted).
- Discovered mid-task that the plan's referenced `@storybook/nextjs` (webpack5-based) is incompatible with `@storybook/addon-vitest`'s Vite-based execution model (confirmed by reading the addon's compiled source, not by guesswork) — swapped to `@storybook/nextjs-vite`, the same version, same public API, and removed the now-unused webpack5 framework package (287 packages) entirely.
- axe-core's first real run caught a genuine accessibility defect in plan 01-04's tokens: `color-bg-primary-hover` (#A8A4FF) paired with white text is 2.22:1 contrast, below WCAG's 4.5:1 minimum — worked around in the throwaway Hovered story (a ring treatment instead of the background swap) and flagged for the token itself to be fixed before Button's real Hovered story reuses it.
- Added a Playwright `visual` project reading only from the built `storybook-static` output (via a small zero-dependency `node:http` static server), 8 screenshot assertions across the 4 harness-probe stories x light/dark scope, `ignoreSnapshots` gated on `process.env.CI` so local runs never write or assert against a Windows-rendered baseline.
- Extended `.github/workflows/ci.yml` with a Playwright-browser-install step ahead of the `quality` job's existing `pnpm test` step (which now covers all three Vitest projects), and added a new `visual` job (`needs: quality`) building Storybook and running the Playwright visual project, uploading `playwright-report/` on failure.
- Added `.github/workflows/visual-baselines.yml`, a `workflow_dispatch`-only job that rebuilds Storybook, runs `playwright test --update-snapshots`, and uploads the resulting screenshots as an artifact — the mechanism by which a Linux-CI-identical baseline reaches the repository without ever being captured on Windows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Vitest Browser Mode with the Playwright provider and a smoke component test** — `7d4fee2` (feat)
2. **Task 2: Storybook 10 with axe-core checks wired from the first component** — `c5e828d` (feat)
3. **Task 3: Playwright visual regression against Storybook, with CI-generated baselines** — `74874ee` (feat)

**Plan metadata:** this SUMMARY.md commit (docs)

## Files Created/Modified
- `vitest.config.ts` — multi-project config (`tokens`/`browser`/`storybook`), tsconfig-derived aliases, Playwright provider, `storybookTest` plugin wiring
- `vitest.setup.ts` — registers `@testing-library/jest-dom/vitest` matchers for the `browser` project
- `src/components/ui/harness-probe/harness-probe.{tsx,test.tsx,stories.tsx}` — throwaway smoke primitive (temporary — deleted by plan 01-06)
- `.storybook/main.ts` — `@storybook/nextjs-vite` framework, `addon-a11y` + `addon-vitest`, conditional `staticDirs`
- `.storybook/preview.ts` — `definePreview` composition with the a11y addon, error-severity a11y policy, `theme` toolbar global toggling `.dark` on the canvas root
- `.storybook/vitest.setup.ts` — intentionally near-empty placeholder (see key-decisions)
- `playwright.config.ts` — `visual` project, `storybook-static` webServer, `ignoreSnapshots`/`snapshotPathTemplate`
- `visual/primitives.visual.spec.ts` — 8 screenshot assertions across the 4 harness-probe stories
- `scripts/serve-static.mjs` — zero-dependency static file server backing the Playwright webServer
- `.github/workflows/ci.yml` — Playwright-browser-install step + new `visual` job
- `.github/workflows/visual-baselines.yml` — `workflow_dispatch`-only baseline generator
- `package.json` — `test:browser`/`test:a11y`/`storybook`/`build-storybook`/`test:visual`/`test:all` scripts; 10 new devDependencies, all exact-pinned
- `pnpm-workspace.yaml` — approved `esbuild`'s install script (Storybook's Vite builder chain)
- `eslint.config.mjs` — `.storybook/main.ts`/`preview.ts` default-export exemption; `consistent-type-definitions` forced to `type` (D-26i)
- `tsconfig.json` — added `.storybook/**/*.ts` to `include` (dot-directories aren't picked up by `**/*.ts` by default)
- `.gitignore` / `.prettierignore` — test/build artifact exclusions, `visual/__screenshots__/` prettier-ignored (but still git-tracked — baselines are committed artifacts)

## Decisions Made
See `key-decisions` in frontmatter for full rationale. Summary: swapped the plan's referenced `@storybook/nextjs` for `@storybook/nextjs-vite` after confirming the webpack5 framework is structurally incompatible with `@storybook/addon-vitest`; kept `.storybook/vitest.setup.ts` intentionally minimal since Storybook 10.3+ auto-provisions preview annotations and a manual wiring call (even mentioned in a comment) disables that; changed the throwaway Hovered story's visual treatment to avoid reproducing a real color-contrast defect axe-core caught in plan 01-04's tokens; added a tsconfig `include` entry and an eslint rule override, both latent gaps from earlier plans that this plan's new file types were the first to surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@storybook/nextjs` (webpack5-based) is incompatible with `@storybook/addon-vitest`**
- **Found during:** Task 2 (`pnpm vitest run --project storybook` failing with `ERR_MODULE_NOT_FOUND` for a hardcoded `builder-webpack5/dist/preset.js` path, then, after a first fix attempt, `SB_PREVIEW_API_0014 NoRenderFunctionError` for every story)
- **Issue:** `@storybook/addon-vitest` is fundamentally Vite-based; the webpack5 framework's own preset resolution doesn't provide what the addon's plugin needs to register a story's render function, regardless of `.storybook/vitest.setup.ts` content.
- **Fix:** Installed `@storybook/nextjs-vite@10.5.7` (Storybook's own Vite-based Next.js framework, same version, same public API — confirmed via its type declarations re-exporting `@storybook/react` identically to `@storybook/nextjs`), updated `.storybook/main.ts`/`preview.ts`/`harness-probe.stories.tsx` to reference it, and removed `@storybook/nextjs` entirely (287 packages of now-unused webpack5 build chain).
- **Files modified:** `package.json`, `pnpm-lock.yaml`, `.storybook/main.ts`, `.storybook/preview.ts`, `src/components/ui/harness-probe/harness-probe.stories.tsx`
- **Verification:** `pnpm build-storybook` and `pnpm vitest run --project storybook` (4/4 stories) both exit 0 after the swap.
- **Committed in:** `c5e828d` (Task 2 commit)

**2. [Rule 1 - Bug] A setup-file comment mentioning the disabled function's name re-triggered the exact behavior it was explaining**
- **Found during:** Task 2, immediately after fix #1 above
- **Issue:** `@storybook/addon-vitest` detects the pre-10.3 project-annotation-wiring pattern by scanning the setup file's raw source text for the literal function name — including inside comments. The first rewrite of `.storybook/vitest.setup.ts` removed the actual function call but kept explaining why in prose that still contained the literal name, so the addon kept disabling its own automatic provisioning and every story still failed with `NoRenderFunctionError`.
- **Fix:** Rewrote the comment to paraphrase instead of naming the function literally; confirmed with a `grep -c` that zero occurrences of the literal string remain in the file.
- **Files modified:** `.storybook/vitest.setup.ts`
- **Verification:** `pnpm vitest run --project storybook` — 4/4 stories collected and passing (previously 0 tests collected / all `NoRenderFunctionError`).
- **Committed in:** `c5e828d` (Task 2 commit)

**3. [Rule 1 - Bug] axe-core caught a real color-contrast violation in the Hovered story**
- **Found during:** Task 2, after fixes #1/#2 got the harness genuinely running
- **Issue:** The Hovered story's original decorator swapped in `color-bg-primary-hover` (#A8A4FF) as the background against the component's white text — axe-core's `color-contrast` rule correctly failed this at 2.22:1 (required 4.5:1). This is a real defect in the token from plan 01-04, not a harness bug.
- **Fix:** Changed the Hovered story's decorator to a ring treatment (`ring-2 ring-bg-primary ring-offset-2`) instead of a background swap, avoiding the violation in this throwaway component while leaving the actual token finding flagged (see coverage and Next Phase Readiness) rather than silently masking it.
- **Files modified:** `src/components/ui/harness-probe/harness-probe.stories.tsx`
- **Verification:** `pnpm vitest run --project storybook` — 4/4 pass; the underlying token defect is a genuine open item, not resolved by this fix.
- **Committed in:** `c5e828d` (Task 2 commit)

**4. [Rule 3 - Blocking] `.storybook/*.ts` files weren't picked up by TypeScript's project service**
- **Found during:** Task 2 (`pnpm lint` failing with "was not found by the project service" for all three `.storybook/*.ts` files)
- **Issue:** `tsconfig.json`'s `include: ["**/*.ts", ...]` doesn't match files under dot-directories by TypeScript's own default glob behavior.
- **Fix:** Added `.storybook/**/*.ts` explicitly to `tsconfig.json`'s `include` array.
- **Files modified:** `tsconfig.json`
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `c5e828d` (Task 2 commit)

**5. [Rule 1 - Bug] `@typescript-eslint/consistent-type-definitions` defaults to the opposite of D-26i**
- **Found during:** Task 1 (`pnpm lint` flagging `HarnessProbeProps`'s `type` alias)
- **Issue:** `typescript-eslint`'s `stylisticTypeChecked` tier (in place since plan 01-02) defaults this rule to prefer `interface`; D-26i mandates `type` over `interface`. No prior file had used an object-shape `type` alias to surface the conflict until now.
- **Fix:** Added an explicit `["error", "type"]` override in `eslint.config.mjs`.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` exits 0 with `harness-probe.tsx`'s `type HarnessProbeProps` in place.
- **Committed in:** `7d4fee2` (Task 1 commit)

---

**Total deviations:** 5 auto-fixed (2 blocking framework/tooling incompatibilities, 1 bug in an explanatory comment tripping a literal-string detector, 1 real accessibility/contrast defect surfaced and worked around at the story level, 1 blocking tsconfig gap, 1 bug in a pre-existing eslint config default). **Impact on plan:** All five were necessary for the plan's own stated deliverables (a genuinely working, CI-provable harness with teeth) to be achievable. The framework swap (`@storybook/nextjs` → `@storybook/nextjs-vite`) is the most consequential deviation — verified as a like-for-like replacement (same version, same API surface) rather than a scope change, and is Storybook's own documented pairing for combining Next.js with the Test/Vitest addon.

## Issues Encountered
- The plan's Task 3 acceptance criteria includes an end-to-end proof requiring a real GitHub Actions dispatch of `visual-baselines.yml`, downloading the artifact, committing the baselines, pushing, and confirming the `visual` CI job passes against them — a multi-run round trip against the real GitHub remote that was not completed in this session (see coverage D3/D6 and Next Phase Readiness below). Everything short of the live dispatch was verified: both workflow YAMLs are content-checked and the exact commands they invoke (`pnpm build-storybook`, `pnpm exec playwright test`, `pnpm exec playwright test --update-snapshots`) were run locally and pass.
- This executor is a background parallel worktree agent and cannot literally click through the Storybook UI or the GitHub Actions UI — every automatable proxy was run instead (real `pnpm build-storybook`, real `vitest run` against real headless Chromium via the Playwright provider, real `pnpm exec playwright test` runs, content-verified CI YAML). Per this repo's default `workflow.human_verify_mode = end-of-phase`, the remaining GitHub-UI/live-CI confirmation is deferred to the phase's consolidated UAT review, consistent with how plans 01-01, 01-03, and 01-04 handled the same limitation.

## User Setup Required
None — no external service configuration required beyond what plan 01-03 already established (GitHub Actions is already wired to this repository).

## Next Phase Readiness
- The full test harness (Vitest Browser Mode, Storybook with axe-core at error severity, Playwright visual regression) exists, runs cleanly end to end locally (`pnpm test`, `pnpm build-storybook`, `pnpm exec playwright test` all exit 0 on the final committed state), and is smoke-proven by `HarnessProbe` — ready for plan 01-06 to delete the probe and build Button as the first real primitive against this harness.
- Outstanding for the orchestrator/next session:
  1. **Live CI proof (coverage D3/D6):** dispatch `.github/workflows/visual-baselines.yml` from a pushable branch, download the `visual-baselines` artifact, commit `visual/__screenshots__/**`, push, and confirm the `visual` job in `ci.yml` passes against the committed baselines. Record the run URL. This mirrors plan 01-03's own deferred D3 (GitHub-UI confirmation) and should ideally happen together with that item once this worktree's commits land on `master`.
  2. **Token defect (coverage note, from Task 2):** `color-bg-primary-hover` (#A8A4FF) fails WCAG contrast (2.22:1) against white text. Flag for whoever authors Button's real hover state (01-06+) — either the token needs a darker/higher-contrast value, or Button's hover state needs a different text-color pairing than `text-on-primary`.
  3. `radius`/`shadow` token confirmation against the real Figma file (carried forward from plan 01-04's own coverage D7) and the theme-probe manual click-through (plan 01-04's D6) remain open, unaffected by this plan.

## Self-Check: PASSED

- `vitest.config.ts` declares `tokens`/`browser`/`storybook` projects: FOUND
- `vitest.setup.ts` exists: FOUND
- `src/components/ui/harness-probe/harness-probe.{tsx,test.tsx,stories.tsx}` exist: FOUND
- `.storybook/main.ts` / `preview.ts` / `vitest.setup.ts` exist: FOUND
- `playwright.config.ts` exists: FOUND
- `visual/primitives.visual.spec.ts` exists: FOUND
- `.github/workflows/visual-baselines.yml` exists: FOUND
- Commit `7d4fee2` found in `git log --oneline --all`: FOUND
- Commit `c5e828d` found in `git log --oneline --all`: FOUND
- Commit `74874ee` found in `git log --oneline --all`: FOUND
- `pnpm test` exit 0 (14/14 across 3 projects): CONFIRMED (final re-run)
- `pnpm build-storybook` exit 0: CONFIRMED (final re-run)
- `pnpm exec playwright test` exit 0 (8/8, screenshots skipped off-CI by design): CONFIRMED (final re-run)
- `pnpm build` exit 0: CONFIRMED (final re-run)
- `pnpm lint` exit 0: CONFIRMED (final re-run)
- `package.json` contains no `^`/`~` dependency prefix: CONFIRMED
- `git status --porcelain` empty (pre-SUMMARY commit): CONFIRMED

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-10*
