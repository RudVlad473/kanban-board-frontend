---
phase: 02-board-management
plan: 07
subsystem: ui
tags: [base-ui, toast, menu, storybook, react, typescript, vitest, playwright, tailwind]

requires:
  - phase: 02-board-management
    provides: "Existing components/ui/ primitive shape (Modal, Dropdown) — compound Root/Trigger/Content pattern, cva variant convention, cn()/ClassNameProp escape hatch"
provides:
  - "Toast primitive (components/ui/toast/) — compound Root/Content/Title/Description/Action/Close, a ToastProvider composite mounting Base UI's Provider/Portal/Viewport, and a useToast re-export of useToastManager. Mounted app-wide in app/layout.tsx inside QueryProvider."
  - "Menu primitive (components/ui/menu/) — compound Root/Trigger/Content/Item wrapping Base UI's dedicated menu/ entry point (not Select-based Dropdown) for true menu/menuitem ARIA semantics, no persisted selection, keyboard navigation, disabled/destructive item states."
  - "Task 1 mechanism decision recorded as a contract: the per-board kebab menu (D-07) is built on the new Menu primitive, not Dropdown — plans 02-09 through 02-13 read Menu.Root/Trigger/Content/Item directly."
affects: [02-09, 02-10, 02-11, 02-12, 02-13]

actuals:
  tokens: 14286
  tasks: 4
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Toast primitive pattern: compound object (Root/Content/Title/Description/Action/Close) mirroring Modal's shape; a ToastProvider composite owns Base UI's Provider/Portal/Viewport internally and maps useToastManager().toasts to Toast.Root instances — consumers only ever call useToast().add()/close()/update(), never touch the compound parts directly."
    - "No module-scope createToastManager() singleton in app runtime code — Toast.Provider's own per-render-tree store is reached via useToastManager() from inside components/hooks, avoiding the concurrent-SSR-request leak a module-scope manager would cause (same reasoning query-client.tsx documents for QueryClient)."
    - "Storybook seeding pattern for imperative-API primitives: seed a fresh Toast.createToastManager() and call add() from a useEffect (post-mount), never from a useState initializer — the installed ToastProvider only subscribes to FUTURE manager events, so anything added before mount is silently dropped."
    - "timeout: 0 pattern for any auto-dismissing story content — the outer Storybook manager URL boots slower than the raw iframe preview, so a real auto-close timer can fire before a human ever sees the story."
    - "Glyph-position testing pattern: when asserting visual alignment/clearance involving padding or negative margins, measure the actual rendered text via a DOM Range's getClientRects(), not element.getBoundingClientRect() on the element itself — under Tailwind's global border-box + flex-stretch, an element's own box does not shrink from its own padding, so comparing box edges directly asserts the wrong thing."

key-files:
  created:
    - src/components/ui/toast/toast.tsx
    - src/components/ui/toast/toast.test.tsx
    - src/components/ui/toast/toast.stories.tsx
    - src/components/ui/menu/menu.tsx
    - src/components/ui/menu/menu.test.tsx
    - src/components/ui/menu/menu.stories.tsx
  modified:
    - app/layout.tsx
    - visual/primitives.visual.spec.ts

key-decisions:
  - "Task 1 (checkpoint:decision, gate=blocking-human): the kebab menu is built on a new Menu primitive wrapping Base UI's menu/ entry point, not on Dropdown (which D-07 names parenthetically but is Select-based). Verified directly against the installed @base-ui/react 1.7.0 package that it ships a full menu/ export (role=menu/menuitem), and that Dropdown's Select.ItemIndicator would render a persisted-selection checkmark on the kebab — exactly 02-RESEARCH.md's Common Pitfall 3. Decision relayed by the orchestrator after presenting the checkpoint to the human."
  - "Menu.Content's Base UI Popup gets an explicit tabIndex={0}. Base UI moves real DOM focus onto the popup when the menu opens but renders it tabindex=-1 by design (WAI-ARIA menu pattern: Tab closes a menu, arrow keys navigate it) — axe's scrollable-region-focusable rule doesn't recognize that JS-driven, negative-tabindex focus as keyboard-accessible for a scrolling region once enough items overflow max-h-72. Overriding to 0 fixed the only new axe violation this plan produced, without touching the already-correct roving-tabindex item navigation."
  - "Toast's danger accent is read from the manager's own toast.type (set via add({ type: 'danger' })) rather than a separate variant prop threaded onto the wrapper, since Base UI's ToastObject already carries type 'to conditionally style the toast' — a second prop would just duplicate state the manager owns."
  - "Toast.Title/Description clamp to 2/3 lines (Tailwind line-clamp) with the full text reachable via a native title tooltip, rather than a CSS hover-expand — a hover-expand was rejected because it risks the expanded card overlapping the toast stacked below it in the Stacked story."
  - "Toast panel radius changed from rounded-lg (Modal's, 28px) to rounded-sm (TextField/Dropdown's, 4px) per human review during Task 4 — surface color/shadow still match Modal's treatment, only the corner radius doesn't."

patterns-established:
  - "Design-system primitive review flow: a checkpoint:human-verify task on a new UI primitive is expected to produce real new scope (spacing/radius/alignment corrections), not just a pass/fail — this plan's Task 4 went through 3 rounds of concrete, screenshot-plus-computed-style-verified fixes before approval, none of which were regressions in earlier commits."
  - "Storybook dev-server / node_modules/.cache/storybook is shared between a live `pnpm storybook` process and any `vitest --project storybook` (a11y) test run — running `rm -rf node_modules/.cache` while a dev server for the same worktree is live corrupts its manager-bundle serving (persistent 404s a reload cannot fix). Stop the dev server first if the cache needs clearing, or scope a11y runs to avoid the blanket rm."

requirements-completed: [BOARD-04, BOARD-05, BOARD-02]

coverage:
  - id: D1
    description: "Toast primitive: add()/close()/update() with same-id upsert, a danger variant, an action affordance, a stacking aria-live=polite viewport, dismissible close control — mounted app-wide via ToastProvider in app/layout.tsx"
    verification:
      - kind: unit
        ref: "src/components/ui/toast/toast.test.tsx (22/22, both viewports)"
        status: pass
      - kind: automated_ui
        ref: "pnpm test:a11y — toast.stories.tsx, 5 stories, 0 axe violations"
        status: pass
      - kind: other
        ref: "pnpm build succeeds with ToastProvider mounted inside QueryProvider in app/layout.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Menu primitive: menu/menuitem ARIA roles (not combobox/listbox), no persisted-selection indicator, keyboard navigation (Escape/Arrow/Enter), disabled and destructive item states"
    verification:
      - kind: unit
        ref: "src/components/ui/menu/menu.test.tsx (16/16, both viewports)"
        status: pass
      - kind: automated_ui
        ref: "pnpm test:a11y — menu.stories.tsx, 5 stories, 0 axe violations"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both primitives' visual treatment (Toast's surface/radius/content-clamp/close-button clearance, Menu's popup silhouette matching Dropdown's) reviewed and approved by a human in Storybook, across 3 rounds of concrete fixes with computed-style/rect evidence each round"
    verification:
      - kind: manual_procedural
        ref: "Task 4 checkpoint — human reviewed all 10 stories (5 Toast, 5 Menu) at http://localhost:6006, requested 3 rounds of fixes (content-height cap + native tooltip, TextField-radius correction, Retry-button alignment, then a close-button text-overlap fix), approved with 'looking good now'"
        status: pass
    human_judgment: true
    rationale: "Design-system visual/UX correctness (spacing, radius, alignment, truncation behavior) is a human judgment call this plan's own Task 4 explicitly scopes as checkpoint:human-verify — already obtained and recorded in this session, not deferred."
  - id: D4
    description: "Task 1's mechanism decision (Menu, not Dropdown) recorded as a contract for downstream plans 02-09 through 02-13"
    verification: []
    human_judgment: true
    rationale: "An architectural decision made via checkpoint:decision, not something an automated check proves — the record itself (this SUMMARY plus the plan's own frontmatter) is the artifact downstream plans must read."

duration: ~2h30m
completed: 2026-08-20
status: complete
---

# Phase 02 Plan 07: Toast and Menu Design-System Primitives Summary

**Toast (Base UI Toast.Provider/Viewport/Root wrapped into a compound object + app-wide provider) and Menu (Base UI's dedicated menu/ entry point, not Select-based Dropdown) — the two new `components/ui/` primitives Phase 2's board UI needs, both fully behavior-tested, axe-clean, and visually reviewed and approved by a human across three rounds of Storybook-checkpoint feedback.**

## Performance

- **Duration:** ~2h30m across 4 tasks, including a `checkpoint:decision` (Task 1, resolved via orchestrator relay) and a `checkpoint:human-verify` (Task 4) that went through 3 rounds of human-requested visual fixes plus several rounds of Storybook dev-server infrastructure troubleshooting (manager-bundle 404s from a shared cache directory, an auto-close timeout race at the outer manager URL, a system memory-pressure episode unrelated to this plan's code) before final approval.
- **Started:** ~2026-08-20T16:00:00Z (approx.)
- **Completed:** 2026-08-20T18:27:00Z
- **Tasks:** 4 (1 checkpoint:decision, 2 auto/tdd, 1 checkpoint:human-verify)
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- `Toast` compound primitive (`Root`/`Content`/`Title`/`Description`/`Action`/`Close`) plus a `ToastProvider` composite that owns Base UI's `Provider`/`Portal`/`Viewport` internally, mounted inside `QueryProvider` in `app/layout.tsx` so any mutation hook's `onError`/`onSuccess` can raise a toast.
- `useToast` re-exports `useToastManager` whole (`add`/`close`/`update`/`promise`), including the same-id upsert behavior plan 02-10's D-04 retry depends on.
- Toast's danger variant, action affordance, content-height clamp with native tooltip, `rounded-sm` panel radius, and close-button clearance all match human-reviewed intent after 3 rounds of Storybook feedback.
- `Menu` compound primitive (`Root`/`Trigger`/`Content`/`Item`) wrapping Base UI's dedicated `menu/` entry point — correct `menu`/`menuitem` ARIA roles, no persisted-selection checkmark, keyboard navigation, disabled/destructive item states, sized to its own content rather than its trigger's width.
- 5 Storybook stories each for Toast and Menu, all axe-clean, all added to `visual/primitives.visual.spec.ts`'s baseline list (baselines themselves generated post-merge per the plan's designed CI flow).
- Task 1's Menu-vs-Dropdown mechanism decision recorded as an explicit contract for plans 02-09 through 02-13.

## Task Commits

Each task was committed atomically (several with follow-up fix commits from checkpoint feedback):

1. **Task 1: Menu-vs-Dropdown mechanism decision** — checkpoint:decision, no commit (decision-only); resolved as `menu-primitive` by the orchestrator relaying the human's answer.
2. **Task 2: Toast primitive and root-layout provider** — `239663d` (feat), fixed by `ede5a77` (fix: story-seeding race), `ad38f09` (fix: story auto-close timing), `f819d71` (fix: content clamp / radius / Retry alignment, from Task 4 review), `0979f19` (fix: close-button text clearance, from Task 4 review).
3. **Task 3: Menu primitive for action menus** — `5cc3084` (feat).
4. **Task 4: Storybook review and baseline generation** — checkpoint:human-verify; steps 1-5 (visual review) completed and approved ("looking good now") in this session across 3 feedback rounds; steps 6-8 (dispatch `visual-baselines.yml`, review/merge the resulting baseline PR, confirm CI green on master) deferred to the orchestrator post-merge, since they require this branch to already be on `master`.

**Plan metadata:** committed separately after this summary (see completion report).

## Files Created/Modified

- `src/components/ui/toast/toast.tsx` - Compound `Toast` object, `ToastProvider` composite, `useToast` hook
- `src/components/ui/toast/toast.test.tsx` - 22 behavior/regression tests, both viewports
- `src/components/ui/toast/toast.stories.tsx` - 5 visual-only CSF3 stories, each seeding its own `createToastManager()`
- `src/components/ui/menu/menu.tsx` - Compound `Menu` object wrapping Base UI's `menu/` entry point
- `src/components/ui/menu/menu.test.tsx` - 16 behavior tests, both viewports
- `src/components/ui/menu/menu.stories.tsx` - 5 visual-only CSF3 stories
- `app/layout.tsx` - `ToastProvider` mounted inside `QueryProvider`
- `visual/primitives.visual.spec.ts` - 10 new story ids; additive `gotoStory` branches for Toast's portalled viewport region and Menu's portalled popup

## Decisions Made

See `key-decisions` in frontmatter above — summarized: (1) Menu wraps Base UI's dedicated `menu/` export, not `Dropdown`; (2) `Menu.Content`'s popup gets an explicit `tabIndex={0}` to satisfy axe's `scrollable-region-focusable` rule without disturbing roving-tabindex item navigation; (3) Toast's danger accent reads `toast.type` rather than a duplicate `variant` prop; (4) Toast's long content clamps with a native tooltip rather than a hover-expand (overlap risk in the Stacked story); (5) Toast's panel radius matches TextField/Dropdown (`rounded-sm`), not Modal (`rounded-lg`), per human review.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Toast stories rendered a completely empty viewport**
- **Found during:** Task 4's checkpoint review (coordinator opened the stories in a real browser)
- **Issue:** `toast.stories.tsx` seeded its `createToastManager()` inside a `useState` initializer, calling `add()` during the seeding component's very first render — before the installed `ToastProvider`'s own `useEffect` (which subscribes to the manager) had ever run. Every seeded toast was emitted to zero listeners and silently dropped.
- **Fix:** Moved `add()` into a `useEffect` on the seeding component itself; React's child-before-parent effect commit order guarantees `ToastProvider`'s subscribe effect runs first.
- **Files modified:** `src/components/ui/toast/toast.stories.tsx`
- **Verification:** Re-verified with a real Playwright browser session against the running dev server (not just the automated suite, which never exercised this ordering); all 5 stories confirmed rendering real toast content.
- **Committed in:** `ede5a77`

**2. [Rule 1 - Bug] Toast stories showed an empty canvas at the outer Storybook manager URL specifically**
- **Found during:** Task 4's checkpoint review, after fix #1
- **Issue:** Base UI's default 5000ms auto-close timeout had often already fired by the time the outer manager URL (full chrome: sidebar, addon panels) finished booting — the raw `iframe.html` preview loaded fast enough to mask this, but the URL actually handed to the human did not.
- **Fix:** Added `timeout: 0` to every story's seeded config, confirmed against the installed `store.js` that `duration > 0` gates whether an auto-close timer is scheduled at all.
- **Files modified:** `src/components/ui/toast/toast.stories.tsx`
- **Verification:** Re-verified at the outer manager URL 12s+ past navigation (well past the 5000ms window) across all 5 stories.
- **Committed in:** `ad38f09`

**3. [Rule 2 - Missing Critical] `Menu.Content`'s scrollable popup was not keyboard-focusable per axe**
- **Found during:** Task 3, `pnpm test:a11y` on the `LongItemList` story
- **Issue:** Base UI moves DOM focus onto the popup on open but renders it `tabindex="-1"` by design; axe's `scrollable-region-focusable` rule flagged the resulting scrolling region as not keyboard-accessible once enough items caused overflow.
- **Fix:** Added an explicit `tabIndex={0}` to the Base UI `Menu.Popup` render.
- **Files modified:** `src/components/ui/menu/menu.tsx`
- **Verification:** `pnpm test:a11y` clean afterward (0 violations across all 5 Menu stories); existing keyboard-navigation tests re-run and still passing.
- **Committed in:** `5cc3084` (fixed before the task's first commit, not a follow-up)

### Human-review-requested scope (not bugs — Task 4's designed feedback loop)

Task 4's checkpoint went through 3 rounds of concrete, human-requested visual polish on already-correct-but-imperfect styling: content-height capping with a native tooltip (rejecting a hover-expand due to Stacked-story overlap risk), a panel radius correction from Modal's to TextField's token, a Retry-button alignment fix (its `px-2` hit-area padding was shifting the visible glyph without a compensating `-ml-2`), and a close-button text-clearance fix (`pr-6` reserved on Title/Description so wrapped text can't run under the close icon). Each round was verified with concrete `getComputedStyle`/`getBoundingClientRect` evidence, not screenshots alone, since this session established that plain screenshots were occasionally unreliable in this environment (see Issues Encountered). Full detail and evidence for each round is in commits `f819d71` and `0979f19`.

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 2 missing-critical accessibility fix), plus 3 rounds of human-requested visual polish (not deviations from the plan — Task 4's designed review outcome).
**Impact on plan:** All auto-fixes were necessary for correctness (toasts must actually render) or accessibility (axe-clean is an explicit plan gate). No scope creep beyond what Task 4's checkpoint is designed to produce.

## Issues Encountered

- **Storybook manager-bundle 404s (persistent, survived reloads and a plain restart once):** root-caused by direct reproduction, not inference — `node_modules/.cache/storybook/10.5.7/` is shared between a live `pnpm storybook` dev server process and any `vitest --project storybook` (a11y) test run. Running `rm -rf node_modules/.cache` (done repeatedly this session to work around an unrelated stale-optimizer-cache issue) while the dev server was concurrently live deleted files its manager-bundle route depended on, breaking it in a way a client-side reload cannot fix. Resolved by stopping the dev server before clearing that cache for the remainder of the session, and by always starting a fully fresh dev server (never relying on HMR to have recovered) before re-presenting a checkpoint.
- **A reported "empty canvas + unstable geometry" on the Toast Stacked story could not be reproduced** despite deliberate, multi-angle investigation (computed-style/animation-API introspection, 30-sample geometry-stability sampling over 6.4s, Playwright's own stability-gated element screenshots succeeding in under 100ms, mount-timeline sampling). Code-level trace through Base UI's toast internals confirmed no mechanism exists that could produce a persisting stuck-transition state (the `starting`→cleared transition is a synchronous layout effect, not CSS-transition-gated, and this primitive's own styling adds zero animation CSS). Reported to the coordinator as likely a one-off Chromium screenshot/compositor timing artifact from the session's dev-server churn; not reproduced again after that report.
- **A late-session `eslint`/full-suite `pnpm test:a11y` OOM-crash** was traced to genuine system-wide memory pressure from the developer's own heavy toolset (two 8GB-capable editor TypeScript language servers, several MCP servers) — not anything caused by or fixable from this plan's own work. Resolved by temporarily stopping the (this-plan-owned) Storybook dev server to free memory before running checks, then restarting it fresh afterward for re-verification. No other running processes on the machine were touched.
- **A test-methodology mistake was caught twice this session** (Action-button alignment, then the close-button-clearance test): comparing `element.getBoundingClientRect()` directly on a padded, flex-stretched, `border-box`-sized element asserts the wrong thing, since the element's own box does not shrink from its own padding — only the content area where glyphs render does. Both times, the underlying CSS fix was already correct; only the test's measurement needed correcting to compare actual rendered glyph position (via a DOM `Range`'s `getClientRects()`) rather than box edges. Documented as a reusable pattern (see `patterns-established`) to avoid a third recurrence in later plans.

## User Setup Required

None — no external service configuration required. `pnpm build`/`pnpm exec tsc --noEmit`/`pnpm lint`/`pnpm exec prettier --check` all ran clean in this worktree by supplying `SESSION_SECRET` as an inline env var (no `.env.local` in this fresh worktree checkout; `.env*` files are permission-denied to read/write in this sandbox), matching the same pre-existing gap prior plan summaries in this phase already flag.

## Next Phase Readiness

- Both new primitives are ready for consumption: `Toast` by plans 02-10 (D-04 retry), 02-12/02-13 (rename/delete failure toasts), and `Menu` by plan 02-12 (the sidebar kebab menu itself, composing `Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />}` exactly as this plan's stories already demonstrate) and 02-13 (adding the destructive Delete item).
- Visual regression baselines for all 10 new stories are NOT yet generated — `visual/primitives.visual.spec.ts`'s CI job will be red on `master` from the moment this plan lands until the orchestrator (per this plan's own designed flow, `.github/workflows/visual-baselines.yml` only runs against `master`) dispatches the baseline-generation workflow, reviews the resulting image-diff PR, and merges it. This is the designed flow, not a defect — flagged here so it isn't mistaken for a regression by the next plan to touch this repo.
- No blockers for plans 02-09 through 02-13.

---
*Phase: 02-board-management*
*Completed: 2026-08-20*

## Self-Check: PASSED

- FOUND: src/components/ui/toast/toast.tsx (Toast compound object present)
- FOUND: src/components/ui/toast/toast.test.tsx (22 tests present)
- FOUND: src/components/ui/toast/toast.stories.tsx (5 stories present)
- FOUND: src/components/ui/menu/menu.tsx (Menu compound object present)
- FOUND: src/components/ui/menu/menu.test.tsx (16 tests present)
- FOUND: src/components/ui/menu/menu.stories.tsx (5 stories present)
- FOUND: app/layout.tsx (ToastProvider mounted)
- FOUND: visual/primitives.visual.spec.ts (10 new story ids present)
- FOUND commit: 239663d
- FOUND commit: 5cc3084
- FOUND commit: ede5a77
- FOUND commit: ad38f09
- FOUND commit: f819d71
- FOUND commit: 0979f19
