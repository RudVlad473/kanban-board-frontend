# Phase 1: Foundation, Auth & Preferences - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A visitor can create an account, sign in, remain in a route-guarded session, and personalize
their theme — running on a deployed technical foundation. The user's stated top priority for
this phase is that the technical foundation is built and tested as a token-driven, reusable
primitives library *first*, ahead of and gating the auth/BFF/theme feature work, with a testing
harness that lets every component ship with coverage the moment it's created — not backfilled
later.

</domain>

<decisions>
## Implementation Decisions

### Token pipeline (DTCG → Style Dictionary → Tailwind v4)

- **D-01:** DTCG token JSON is split by category (`color.tokens.json`, `spacing.tokens.json`,
  `typography.tokens.json`, `radius.tokens.json`, `shadow.tokens.json`, `breakpoint.tokens.json`)
  rather than one monolithic file.
- **D-02:** Two-tier token system: primitive tokens (raw scale values) → semantic tokens
  (intent-based aliases, e.g. `color-bg-primary`, `color-text-danger`) that reference
  primitives. Components consume semantic tokens only, never primitives directly. —
  **Reversibility:** costly — every component's token references would need to change if a
  third (component-level) tier were retrofitted later.
- **D-03:** Token values are hand-transcribed from the Figma PDF export (`kanban-task-management-web-app.pdf`)
  — there is no live Figma file/API/plugin access, per PROJECT.md's stated design source.
- **D-04:** Primitive spacing/sizing tokens use a numeric step scale (`space-1`...`space-12`),
  matching Tailwind's own default numeric spacing convention.
- **D-05:** Typography tokens are composite (DTCG composite type) — one semantic token per text
  style (e.g. `font-heading-lg`) bundles family + size + weight + line-height together,
  mirroring how a Figma text style is actually defined.
- **D-06:** Elevation/shadow tokens (`shadow-sm`/`shadow-md`/`shadow-lg`) are defined now,
  alongside color/spacing — not deferred until a specific component needs them.
- **D-07:** Responsive breakpoints (mobile/tablet/desktop) are DTCG dimension tokens too,
  feeding Tailwind's `screens` config — not left as Tailwind's untouched defaults.
- **D-08:** Style Dictionary outputs a CSS `@theme` block (Tailwind v4 native format) — no
  `tailwind.config.js` token mapping layer. — **Reversibility:** costly — switching to a
  different Tailwind config approach later means regenerating every consuming class/utility.
- **D-09:** Light/dark values live under the same semantic token names (mode-scoped: `:root`
  and `.dark` scope, or `light-dark()`). Components never branch on theme — they read one
  semantic token and the value follows the active mode.
- **D-10:** Raw DTCG JSON lives in `tokens/` at repo root (sibling to `src/`, `docs/`) —
  signals it's a build input/design source-of-truth, not application code. Style Dictionary
  writes generated CSS into `src/styles/` per CONVENTIONS.md.
- **D-11:** No dedicated Storybook "Tokens" documentation page — tokens are an implementation
  detail; primitives' own stories are the documentation.
- **D-12:** A pipeline-level test asserts the Style Dictionary build's generated CSS actually
  contains the expected token values — separate from any component test, so a broken token
  edit fails with one clear error instead of N confusing component-test failures.

### Primitives library

- **D-13:** Phase 1's primitives set is expanded beyond CONVENTIONS.md's original four:
  **Button, IconButton, TextField, Checkbox, Switch, Dropdown, Modal** — all built before any
  feature phase needs them, not on-demand.
- **D-14:** Build order: Button → IconButton → TextField → Checkbox → Switch → Dropdown →
  Modal (simplest-first, with IconButton right after Button since it's a Button variant, and
  Modal/Switch positioned by actual need — Switch before Dropdown to unblock the theme toggle,
  Modal last since no Phase 1 feature consumes it yet).
- **D-15:** Every primitive wraps a Base UI headless component (Button/Checkbox/Field/Switch/
  Select-Menu/Dialog) for behavior and accessibility; design tokens apply via Tailwind classes
  on top. Build from scratch only if Base UI has no equivalent.
- **D-16:** Storybook stories (covering default/hover/focus/disabled/error states) are part of
  a primitive's definition-of-done — this doubles as the visual-regression baseline
  (ADR tech/0008 scopes visual regression to Storybook stories only).
- **D-17:** Form primitives (TextField, Checkbox, Dropdown) get a built-in error/invalid visual
  state now (`color-border-danger`/`color-text-danger`), since React Hook Form + Zod validation
  (DEFAULTS.md C-005) needs it immediately for the auth forms' error states.
- **D-18:** Every primitive that visually varies by size (Button, IconButton, TextField,
  Checkbox, Switch) supports a consistent `sm`/`md`/`lg` size prop mapped to the same token
  scale. Dropdown/Modal are content-driven and may not need it.
- **D-19:** Dropdown uses a compound-component API (`<Dropdown.Trigger>`, `<Dropdown.Content>`,
  `<Dropdown.Item>`), mirroring Base UI's own Select/Menu composition model. —
  **Reversibility:** costly — this is public API every future consumer (Board select, column
  actions, etc.) will call against; switching to a prop-driven API later means updating every
  call site.

### Testing harness & per-component coverage

- **D-20:** Minimum bar for "test coverage right after creation," for every primitive: a
  co-located Vitest Browser Mode unit test (`Button.test.tsx`) exercising behavior (clicks,
  keyboard nav, error-state rendering) AND a Storybook story (`Button.stories.tsx`) covering
  visual states. No primitive merges without both.
- **D-21:** axe-core accessibility checks are wired into the Storybook/testing setup starting
  with the very first primitive (Button) — not batched in after several primitives exist —
  so every subsequent primitive inherits the check automatically and nothing ships unverified.
- **D-22:** Playwright visual-regression baselines are captured as each primitive's stories
  ship, not batched at the end of Phase 1 — keeps visual regression continuously enforced.
- **D-23:** Component tests are co-located per component folder (`components/ui/Button/
  {Button.tsx, Button.test.tsx, Button.stories.tsx}`), matching CONVENTIONS.md's existing
  per-primitive folder pattern — not a separate mirrored `tests/` tree.
- **D-24:** The full test harness (Vitest Browser Mode, Storybook, the axe-core addon,
  Playwright visual config, and the assertion/testing-library stack below) is set up as its
  own dedicated task, verified with a smoke test, *before* Button is built — not bootstrapped
  reactively as a side effect of building the first component.
- **D-25:** Storybook stories stay visual-only (no play-function interaction tests); keyboard/
  interaction behavior lives exclusively in the Vitest unit test — avoids duplicating the same
  assertions in two tools.
- **D-26:** Assertion/testing-library stack: Vitest's built-in `expect` (Chai-based, Jest-
  compatible) + `@testing-library/jest-dom` matchers + `@testing-library/react` for queries
  (role/label-based, reinforcing a11y-first testing) — confirmed compatible with Vitest
  Browser Mode and Next.js App Router client components. Added as part of the harness-setup
  task (D-24).

### CI/CD

- **D-26b:** A GitHub Actions workflow (`.github/workflows/ci.yml`) is a Plan 1 foundation
  deliverable, not something assumed to appear later — it runs the frontend-standard checks on
  every push/PR: lint (`eslint`), format check (`prettier --check`), build (`next build`), and
  tests (Vitest unit/component once the harness exists; expand to axe-core/Playwright-visual
  once those are wired in D-21/D-22). This makes concrete the CI tooling already locked in
  DEFAULTS.md (C-012: "GitHub Actions, running the full test pyramid... on every push") and the
  required-status-check enforcement already specified in `docs/adr/tech/0007` (ESLint + Prettier
  zero-errors-before-merge).
- **D-26c:** CI is not considered working on the strength of a locally-valid YAML file alone —
  it must be verified end-to-end by pushing to the real GitHub remote (`origin` →
  `github.com/RudVlad473/kanban-board-frontend`, already configured) and confirming the Actions
  run actually triggers and reports status in the GitHub UI. Same "verify it actually works, not
  just that files exist" discipline already applied to the scaffold checkpoint (D-27) and the
  test-harness smoke test (D-24).
- **D-26d:** CI setup happens once there's something real for each job to check — build/lint/
  format checks can run as soon as the scaffold (D-27) exists; the test job's scope grows as the
  harness (D-24) and each primitive's tests land. The first real push-and-verify (D-26c) should
  happen after the scaffold checkpoint, not held until every primitive is built — catches a
  broken pipeline early rather than after the whole foundation stack is already committed.

### Pre-commit hooks

- **D-26e:** Husky + lint-staged for pre-commit enforcement — the standard, most-documented
  combo for JS/TS + pnpm projects.
- **D-26f:** lint-staged runs Prettier `--write` + ESLint `--fix` on staged files only (fast);
  a full-project `tsc --noEmit` is explicitly **skipped** at commit time (per the user's
  choice) — type errors are caught by CI's build step (D-26b) after push, not before commit.
  This is a deliberate speed/coverage trade-off, not an oversight.
- **D-26g:** A failing pre-commit check (lint/format) blocks the commit outright — no
  warn-only mode.
- **D-26h:** Pre-commit hooks are a fast local subset (staged-file lint/format only, per
  D-26f); CI (D-26b) remains the authoritative full-project gate. Hooks are a convenience, not
  a substitute for CI — nothing should ever rely on `--no-verify` bypassing hooks as the only
  enforcement, since CI still catches everything hooks skip.

### Code style conventions

- **D-26i:** `type` over `interface` by default for all TypeScript type definitions (props,
  unions, object shapes); `interface` only for the rare declaration-merging/third-party-type-
  extension case.
- **D-26j:** Named exports everywhere, except where Next.js's App Router itself requires a
  default export (`page.tsx`, `layout.tsx`, `route.ts`, and similar special files) — that's
  the one framework-forced exception, not a stylistic choice.
- **D-26k:** `const` arrow functions for all components (`const Button = (props: ButtonProps) =>
  {...}`), applied uniformly — not function declarations.
- **D-26l:** No `React.FC<Props>` — type props directly on the function signature. Avoids the
  legacy implicit-`children` footgun and adds no type-safety benefit over direct prop typing.
- **D-26m:** Prettier config: semicolons on, double quotes, trailing commas (all), **print
  width 120** (Prettier's default is 80 — explicitly widened per the user's choice).
- **D-26n:** ESLint: `typescript-eslint` **strict + type-checked** tier (not just
  "recommended"), plus `eslint-plugin-react-hooks`'s `exhaustive-deps` as an **error** (not
  warn) — this is what makes ADR tech/0007's "0 errors" bar meaningful rather than trivially
  met.
- **D-26o:** `@typescript-eslint/no-unused-vars` as error, with an underscore-prefix (`_event`,
  `_index`) escape hatch for intentionally-unused function parameters (e.g. positional callback
  args you don't need all of).
- **D-26p:** Import order/grouping (external → internal alias → relative) enforced via
  `eslint-plugin-import`/`import-x`, auto-fixed by lint-staged on every commit — zero manual
  effort since it's auto-fixed, no import-order bikeshedding or diff noise.
- **D-26q:** TypeScript path aliases (`@/features/...`, `@/components/...`, `@/lib/...`, one
  alias per CONVENTIONS.md top-level folder) instead of relative imports — also makes
  CONVENTIONS.md's no-cross-feature-import rule easier to spot visually.
- **D-26r:** No barrel files (`index.ts` re-exports) — import directly from the source file
  (`@/components/ui/button/button`, not `@/components/ui/button`). Avoids barrel-file circular-
  import and Next.js bundle-size footguns.
- **D-26s:** Boolean props use `is`/`has` prefixes (`isDisabled`, `hasError`); event-handler
  props use `on` prefix (`onClick`, `onValueChange`) — matches Base UI's own prop naming, so
  wrapper primitives stay consistent with the library underneath them.
- **D-26t:** File naming: **kebab-case for everything, including component files**
  (`button.tsx` exports `Button`, `task-card.tsx` exports `TaskCard`) — one casing rule, no
  per-file-type exceptions. Confirmed no Next.js-specific risk: Next.js's naming rules apply
  only to its own special files (`page.tsx`, `layout.tsx`, `route.ts`, etc.) and to
  route-segment folder names in `app/` (which are naturally kebab-case anyway, since they map
  to URLs) — Next.js does not inspect the casing of your own component/hook/util files.
  Consistent with CONVENTIONS.md's existing kebab-case feature-folder names (e.g.
  `features/activity-log/`). The only real cross-platform risk (Windows/Mac dev machines are
  case-insensitive, Vercel's Linux build servers are case-sensitive) is a general concern for
  any casing choice, not specific to kebab-case, and is mitigated by lint-staged/ESLint
  catching import-case mismatches before they reach CI.
- **D-26u:** `class-variance-authority` (cva) for managing primitive variant/size/state
  styling (the `sm`/`md`/`lg` sizes from D-18, `primary`/`secondary` variants, error states
  from D-17) — purpose-built for exactly this multi-axis-variant surface, pairs cleanly with
  Tailwind.
- **D-26v:** Every primitive accepts and forwards a `className` prop, merged safely via
  `tailwind-merge` (so consumer classes correctly override conflicting base classes rather than
  just concatenating) — the escape hatch for one-off layout adjustments without needing a new
  named variant for every case.

### Sequencing

- **D-27:** The entire foundation stack — **project scaffold, tokens, harness setup, and all 7
  primitives with their tests** — is **Plan 1 of Phase 1**, strictly sequential and gating
  everything else. Plan 1 opens with the Next.js project scaffold itself (`create-next-app`
  with App Router + TypeScript, pnpm, ESLint/Prettier + `eslint-plugin-tailwindcss`/
  `prettier-plugin-tailwindcss`, `eslint-plugin-boundaries` configured per CONVENTIONS.md's
  placement rules, and the base folder structure — `app/`, `src/features/`, `src/components/`,
  `src/hooks/`, `src/lib/`, `src/styles/`, `tokens/`) — none of the token/harness/primitives
  work can exist without a `package.json` and installed dependencies. The scaffold step ends
  with a verification checkpoint, not just "files exist": `next build` (or `next dev`)
  succeeds and a default/placeholder route actually renders in the browser — confirming the
  scaffold works before any token or primitive code is layered on top of it. Only after that
  checkpoint passes do tokens → harness setup → primitives proceed. Plan 2+ (typed API client, MSW mock,
  BFF auth proxy, sign-up/sign-in, route guard, theme toggle, Vercel deploy) consumes the
  already-built primitives (e.g. the theme toggle uses the already-built Switch) rather than
  building any primitive reactively mid-feature-work. — *Correction (2026-08-10, post-context):
  the original discussion's phrasing implied "scaffold" belonged to Plan 2+; that was wrong —
  it's an unavoidable prerequisite of Plan 1, not a peer of the auth/theme feature work.*
- **D-28:** ROADMAP.md's Phase 1 Success Criteria was updated (criterion 6, applied during this
  discussion) to name the token-driven primitives library as an explicit, verifiable
  deliverable rather than leaving it implied by "technical foundation." Criterion 5 was further
  strengthened to name the CI checks explicitly and require the real-push verification from
  D-26c.

### Claude's Discretion
None — every gray area discussed had a concrete decision made; no "you decide" selections in
this round.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project organization & conventions
- `CONVENTIONS.md` — feature-folder placement rules; existing (now expanded) `components/ui/`
  primitive folder pattern; `styles/` as the Style Dictionary output target.
- `docs/adr/tech/0009-project-organization.md` — the underlying ADR for the folder structure.
- `DEFAULTS.md` — C-012 locks GitHub Actions as the CI tool running the full test pyramid on
  every push; this discussion's D-26b/D-26c/D-26d make that concrete for Plan 1.

### Tech decisions this phase's foundation work depends on
- `docs/adr/tech/0007-linter-formatter-toolchain.md` — ESLint/Prettier + Tailwind plugins,
  zero-errors-before-merge gate.
- `docs/adr/tech/0008-visual-regression-tool.md` — Playwright-native `toHaveScreenshot`,
  scoped to Storybook stories only.
- `docs/adr/tech/0004-openapi-mock-server.md` — MSW + Vitest Browser Mode pairing (referenced
  for the testing-harness decisions, D-20 through D-26).
- `docs/adr/tech/0001-auth-session-storage.md` — BFF-proxied auth (relevant once Plan 2+ starts).
- `docs/adr/tech/0003-drag-and-drop-library.md` — dnd-kit keyboard-a11y precedent that D-21's
  axe-core-from-Button decision extends to the whole primitives set.

### Requirements & scope
- `.planning/PROJECT.md` — Constraints section (design tokens via Style Dictionary already a
  locked stack choice; test pyramid targets — diagnostic, not a gate).
- `.planning/REQUIREMENTS.md` — AUTH-01/02/03, THEME-01 (this phase's actual feature
  requirements, built in Plan 2+ atop the Plan 1 foundation).
- `.planning/ROADMAP.md` §Phase 1 — Success Criteria (including the new criterion 6 added
  during this discussion).

### Design source
- `kanban-task-management-web-app.pdf` (Figma export — referenced by PROJECT.md as the sole
  design source) — the source for all hand-transcribed DTCG token values (D-03).

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield repository — no `package.json`, no `src/`, no application code exists yet.
Everything below is planned structure, not existing code.

### Reusable Assets
None yet — this phase's Plan 1 IS the creation of the first reusable assets (tokens,
primitives, test harness) that every later phase will build on.

### Established Patterns
- CONVENTIONS.md already specifies the exact folder shape for primitives
  (`components/ui/Button/{Button.tsx,Button.stories.tsx}`) and for the token pipeline output
  (`styles/` — Tailwind v4 `@theme` tokens generated by Style Dictionary from DTCG JSON). This
  phase's decisions (D-01 through D-26) fill in the implementation details CONVENTIONS.md left
  open, and add three primitives (Modal, IconButton, Switch) and a `.test.tsx` file to the
  folder pattern CONVENTIONS.md didn't originally show.

### Integration Points
- Plan 2+'s theme toggle (THEME-01) integrates with the Switch primitive built in Plan 1.
- Plan 2+'s sign-up/sign-in forms (AUTH-01/02) integrate with TextField, Button, and Checkbox
  (e.g. "remember me"), all built in Plan 1, including their error/invalid states (D-17).

</code_context>

<specifics>
## Specific Ideas

- User's own words: the token system (DTCG JSON → Style Dictionary → Tailwind) and a reusable
  primitives library are the "first and outmost priority," and testing must be set up so
  coverage can be "added right after the component is created" — not backfilled. This drove
  D-24 (harness before Button) and D-27 (foundation as strictly-sequential Plan 1).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1's scope. Card was considered as an additional
primitive (alongside Modal/IconButton/Switch) but not selected — CONVENTIONS.md already treats
BoardCard/TaskCard as feature-specific components, not primitives; revisit only if real
cross-feature reuse emerges in Phase 2+.

</deferred>

---

*Phase: 1-Foundation, Auth & Preferences*
*Context gathered: 2026-08-10*
