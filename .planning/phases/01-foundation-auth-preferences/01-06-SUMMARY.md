---
phase: 01-foundation-auth-preferences
plan: 06
subsystem: ui
tags: [react, base-ui, tailwind, cva, tailwind-merge, lucide-react, vitest-browser, storybook, axe]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (01-04, 01-05)
    provides: DTCG token pipeline generating src/styles/tokens.css; Vitest Browser Mode +
      Storybook + Playwright visual-regression test harness with the harness-probe smoke test
provides:
  - Button primitive (primary/secondary/destructive variants, sm/md/lg sizes)
  - IconButton primitive (Button variant with a required accessible label, ghost variant, 44x44px hit-area floor)
  - src/lib/cn.ts — the shared tailwind-merge className combiner every later primitive forwards through
  - lucide-react selected and installed as the icon library (Task 1 decision, pre-resolved)
  - harness-probe retired; primitives.visual.spec.ts now carries only real primitives
affects: [01-07, 01-08, 01-09, 01-10, 01-11, 01-12, 01-13, ui, testing]

# Actuals (#2632)
actuals:
  tokens: 7487
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: ["@base-ui/react@1.7.0", "class-variance-authority@0.7.1", "tailwind-merge@3.6.0", "clsx@2.1.1", "lucide-react@1.31.0"]
  patterns:
    - "Every primitive wraps a Base UI headless component and forwards className through cn() (D-26v)"
    - "cva for variant/size axes, defaultVariants set, semantic-token-only Tailwind utility classes (D-02, D-26u)"
    - "Storybook stories stay visual-only; behaviour lives exclusively in Vitest Browser Mode .test.tsx (D-25)"

key-files:
  created:
    - src/lib/cn.ts
    - src/components/ui/button/button.tsx
    - src/components/ui/button/button.test.tsx
    - src/components/ui/button/button.stories.tsx
    - src/components/ui/icon-button/icon-button.tsx
    - src/components/ui/icon-button/icon-button.test.tsx
    - src/components/ui/icon-button/icon-button.stories.tsx
  modified:
    - vitest.setup.ts
    - visual/primitives.visual.spec.ts
    - package.json / pnpm-lock.yaml

key-decisions:
  - "Task 1 (icon library): lucide-react selected — pre-resolved by the human before this dispatch, per UI-SPEC's own default option"
  - "cn.ts extends tailwind-merge's font-size class group with a heading-*/body-*/display-* pattern validator, fixing a real misclassification against this project's composite typography tokens"
  - "Button's font-weight is consumed via Tailwind arbitrary-property syntax ([font-weight:var(--font-weight-body-m)]) rather than a generated utility, working around a token-pipeline naming collision without touching the shared style-dictionary.config.mjs (out of this plan's scope)"
  - "IconButton's hit area is floored to h-11/w-11 (44px) for sm/md and h-12/w-12 (48px) for lg, satisfying the 44x44px accessibility minimum at every size while glyph size still varies 16/20/24px via a [&_svg] descendant selector"
  - "vitest.setup.ts now imports src/styles/globals.css, mirroring Storybook's own preview.ts, so Browser Mode tests can assert real computed styles"

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "Button renders with an accessible role/name, fires onClick on click and keyboard Enter/Space, and suppresses both when isDisabled"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/button/button.test.tsx#Button > is found by its accessible role and name"
        status: pass
      - kind: unit
        ref: "src/components/ui/button/button.test.tsx#Button > invokes onClick on keyboard Enter"
        status: pass
      - kind: unit
        ref: "src/components/ui/button/button.test.tsx#Button > renders disabled and suppresses activation on click and keyboard when isDisabled"
        status: pass
    human_judgment: false
  - id: D2
    description: "Button renders three distinct variant backgrounds and three distinct sizes, all from semantic tokens"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/button/button.test.tsx#Button > renders a distinct background for each variant"
        status: pass
      - kind: unit
        ref: "src/components/ui/button/button.test.tsx#Button > renders a distinct height for each size"
        status: pass
    human_judgment: false
  - id: D3
    description: "A consumer className overrides a conflicting base class via merge, not concatenation"
    verification:
      - kind: unit
        ref: "src/components/ui/button/button.test.tsx#Button > lets a consumer className win over a conflicting base background class (merge, not concatenation)"
        status: pass
      - kind: unit
        ref: "src/components/ui/icon-button/icon-button.test.tsx#IconButton > lets a consumer className win over a conflicting base background class (merge, not concatenation)"
        status: pass
    human_judgment: false
  - id: D4
    description: "IconButton exposes label as its accessible name with no visible text, and a >=44x44px hit area at every size including sm"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/components/ui/icon-button/icon-button.test.tsx#IconButton > exposes the label prop as its accessible name even though it renders no visible text"
        status: pass
      - kind: unit
        ref: "src/components/ui/icon-button/icon-button.test.tsx#IconButton > has a hit area of at least 44 x 44 CSS pixels at every size, including sm"
        status: pass
    human_judgment: false
  - id: D5
    description: "axe-core reports no accessibility violation on any Button or IconButton story"
    verification:
      - kind: automated_ui
        ref: "pnpm vitest run --project storybook (13 stories, 0 violations)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual-regression baselines exist for every Button and IconButton story in both light and dark scope"
    verification:
      - kind: e2e
        ref: "visual/primitives.visual.spec.ts (26 assertions defined, story IDs verified against storybook-static/index.json)"
        status: unknown
    human_judgment: true
    rationale: "Baselines are only ever generated in CI (ADR tech/0008), via the manual visual-baselines.yml workflow_dispatch. That workflow has never been run for this project (gh run list shows zero runs), and dispatching it requires this worktree's commits to first be merged/pushed by the orchestrator. Logged as WINDOWS.md id 1 (kind unrun-verify) with the exact follow-up command."

# Metrics
duration: 45min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 6: Button & IconButton Primitives Summary

**Button and IconButton primitives wrapping @base-ui/react, styled with cva + semantic tokens, merged via a tailwind-merge-based `cn()` that fixes a real composite-typography classification bug — plus retirement of the harness-probe smoke component.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-11T11:08:00+02:00 (worktree branched from e173b23)
- **Completed:** 2026-08-11T11:43:00+02:00
- **Tasks:** 3 (Task 1 decision pre-resolved, Task 2 Button, Task 3 IconButton)
- **Files modified:** 13 (7 created, 3 modified for the harness/spec, plus package.json/pnpm-lock.yaml, minus 3 deleted harness-probe files)

## Accomplishments

- `src/lib/cn.ts` — the shared `clsx` + `tailwind-merge` className combiner every future primitive forwards `className` through (D-26v), with a fix for a real tailwind-merge misclassification of this project's composite typography tokens
- `Button` primitive: three variants (primary/secondary/destructive), three sizes (sm/md/lg), full click/keyboard/disabled behaviour coverage, seven Storybook stories, axe-clean
- `IconButton` primitive: required `label` prop (type-enforced, unskippable), `ghost` variant for the theme-toggle/password-toggle call sites, 44x44px minimum hit area at every size, six Storybook stories, axe-clean
- `lucide-react@1.31.0` installed as the icon library (Task 1's pre-resolved decision)
- `src/components/ui/harness-probe/` deleted; `visual/primitives.visual.spec.ts` now carries only Button's and IconButton's 13 stories (26 light/dark assertions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Icon library selection** — no commit (decision-only; recorded below, not code)
2. **Task 2: Button primitive** — `1284a2b` (feat)
3. **Task 3: IconButton primitive, and retirement of the harness probe** — `923c572` (feat)

**Plan metadata:** committed alongside this SUMMARY (see final commit below)

## Files Created/Modified

- `src/lib/cn.ts` - shared className combiner; extends tailwind-merge's font-size class group for this project's composite typography token names
- `src/components/ui/button/button.tsx` - Button primitive (cva variants/sizes, Base UI Button wrap)
- `src/components/ui/button/button.test.tsx` - 8 browser-mode behaviour tests
- `src/components/ui/button/button.stories.tsx` - 7 visual-only stories
- `src/components/ui/icon-button/icon-button.tsx` - IconButton primitive (required label, ghost variant, 44px hit-area floor)
- `src/components/ui/icon-button/icon-button.test.tsx` - 6 browser-mode behaviour tests
- `src/components/ui/icon-button/icon-button.stories.tsx` - 6 visual-only stories, eye/eye-off pair
- `vitest.setup.ts` - now imports the generated Tailwind stylesheet so Browser Mode tests can assert computed styles
- `visual/primitives.visual.spec.ts` - harness-probe entries removed, Button + IconButton entries added (26 assertions)
- `package.json` / `pnpm-lock.yaml` - new runtime deps: `@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`
- `src/components/ui/harness-probe/` - deleted (3 files)

## Decisions Made

- **Task 1 (icon library):** `lucide-react` — this decision was pre-resolved by the human before this dispatch (per the plan's `<pre_resolved_checkpoint>`), matching UI-SPEC's own default option. Not re-presented as a checkpoint.
- Installed `@base-ui/react@1.7.0` (not the deprecated `@base-ui-components/react`), confirmed via `grep -rq 'base-ui-components'` across `package.json`, `pnpm-lock.yaml`, and `src/` returning no match.
- IconButton's `variant`/`size` `defaultVariants` set to `ghost`/`md` (not specified explicitly by the plan) — matches the two real Phase 1 consumers named in the plan text (theme toggle, password-visibility toggle), both `ghost`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tailwind-merge misclassifies composite typography token names**
- **Found during:** Task 2, first test run of the className-merge behaviour
- **Issue:** `text-body-m` (the composite typography token's font-size utility) and `text-text-on-primary` (a text-color utility) both start with the `text-` prefix; tailwind-merge's default class-group heuristics don't recognise this project's custom `heading-*`/`body-*`/`display-*` scale names, so it treated both as the same conflicting group and silently dropped `text-body-m` whenever a text-color utility appeared later in the same `cn()` call — verified directly via `tailwind-merge`'s resolved output (`twMerge("text-body-m text-text-on-primary")` → `"text-text-on-primary"` only).
- **Fix:** `cn.ts` now uses `extendTailwindMerge` to register a `heading-*`/`body-*`/`display-*` pattern validator under the `font-size` class group, so it's classified separately from `text-color` for every current and future primitive.
- **Files modified:** `src/lib/cn.ts`
- **Verification:** Re-ran the failing `twMerge()` probe directly (now preserves both classes); Button's className-merge behaviour test passes.
- **Committed in:** `1284a2b` (Task 2 commit)

**2. [Rule 3 - Blocking] Vitest Browser Mode tests had no CSS loaded, so computed-style assertions were unstyled-default values**
- **Found during:** Task 2, running the variant-background and className-merge tests
- **Issue:** `vitest.setup.ts` only registered `@testing-library/jest-dom` matchers; unlike `.storybook/preview.ts` (which imports `../src/styles/globals.css`), nothing loaded the generated Tailwind stylesheet into the Browser Mode test page. Every `getComputedStyle()` assertion this plan's `<behavior>` block explicitly requires (variant background distinctness, size height distinctness, className-merge winner) returned browser-default values instead of real rendered ones.
- **Fix:** Added `import "./src/styles/globals.css";` to `vitest.setup.ts`, mirroring the existing Storybook pattern.
- **Files modified:** `vitest.setup.ts`
- **Verification:** All 14 Browser Mode tests (8 Button + 6 IconButton) pass with real computed-style assertions; harness-probe's pre-existing 4 tests still pass (no regression).
- **Committed in:** `1284a2b` (Task 2 commit)

**3. [Rule 3 - Blocking, worked around without touching out-of-scope files] Token pipeline's font-weight utility collides with font-family**
- **Found during:** Task 2, implementing Button's `font-body-m` typography classes
- **Issue:** `style-dictionary.config.mjs`'s `typographyDeclarations()` (from plan 01-04, already merged) emits `--font-weight-<name>` as a top-level namespaced custom property. Verified by direct compilation (`postcss` + `@tailwindcss/postcss`) that Tailwind v4 resolves `--font-weight-body-m` to the exact same utility class name as `--font-body-m` (font-family) — `.font-body-m` only ever gets the family declaration; the weight declaration is silently unreachable via any generated utility class.
- **Fix (local workaround, not a pipeline fix — see below):** `button.tsx` reads the weight token directly via Tailwind's arbitrary-property syntax, `[font-weight:var(--font-weight-body-m)]`, which still sources the real semantic token value (not a hardcoded `700`) and produces the correct Bold rendering this plan's Decisions block requires.
- **Files modified:** `src/components/ui/button/button.tsx` (workaround only)
- **Why not fixed at the root:** The correct fix belongs in `style-dictionary.config.mjs` (rename to Tailwind's paired `--text-<name>--font-weight` sub-property convention) and would also require updating `tokens/style-dictionary.build.test.ts`'s existing assertions — both files belong to plan 01-04, already merged to `master`, and are outside plan 01-06's `files_modified` scope. Logged to `.planning/phases/01-foundation-auth-preferences/deferred-items.md` and `.planning/WINDOWS.md` (id 2, kind `deviation`) for a future plan to fix at the root.
- **Verification:** Manual compilation probe confirmed the collision and the arbitrary-property workaround's correctness; `pnpm build-storybook` renders the button visibly bold in the Storybook preview.
- **Committed in:** `1284a2b` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking issues preventing correct completion of Task 2's stated behaviour). No architectural changes, no scope creep beyond what was necessary to make this plan's own explicit `<behavior>` requirements actually true.

## Issues Encountered

- Vite's dependency pre-bundle cache (`node_modules/.vite`, `node_modules/.cache/storybook`) went stale twice after installing new dependencies mid-session (`@base-ui/react` after Task 2's install, `lucide-react` after Task 3's install), producing `Invalid hook call`/`Cannot read properties of null` errors. Resolved both times by clearing the relevant cache directory and re-running — a known Vite optimizer behavior, not a code issue.
- `pnpm exec tsc --noEmit` initially failed on `app/layout.tsx` with `Cannot find name 'LayoutProps'` — this is Next.js 16's generated route-type global, absent because this fresh worktree checkout had never run `next build`/`next dev`/`next typegen`. Ran `pnpm exec next typegen` (a local build-artifact generation step, not a code change) to resolve; `app/layout.tsx` itself was never touched by this plan.
- The visual-regression baseline capture step in Task 3's action ("dispatch the visual-baselines workflow, commit the returned artifact, confirm the CI visual job passes") could not be completed inside this isolated worktree — see Deviation/D6 above and `deferred-items.md` item 1 for the full explanation and exact follow-up command.

## Known Stubs

None. Every behaviour this plan's `<behavior>` blocks specify is real, tested, and passing — no placeholder data, no hardcoded empty states, no unwired props.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Button` and `IconButton` exist in the exact shape (Base UI wrapped, cva-driven, semantic-token-only, className-mergeable, behaviour-tested, axe-clean) that plans 01-07 through 01-09 (TextField, Checkbox, Switch, Dropdown, Modal) will copy.
- `src/lib/cn.ts` is now the established shared combiner every later primitive should import — including its typography class-group fix, which every composite-typography-consuming primitive (TextField's labels, Checkbox's labels, etc.) will also need.
- **Blocker for `/gsd-ship` (or any `windows_enforce`-gated step):** two open `.planning/WINDOWS.md` entries — CI's visual job needs the `visual-baselines.yml` workflow dispatched once real code exists on `master` (id 1), and the token pipeline's font-weight naming collision should be fixed at the root in a future plan (id 2). Neither blocks this plan's own correctness; both are pre-existing/cross-plan concerns now made visible.
- Plan 01-07 (TextField) should reuse `cn.ts` as-is and can lean on the now-fixed typography class-group registration without rediscovering the same tailwind-merge bug.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-11*
