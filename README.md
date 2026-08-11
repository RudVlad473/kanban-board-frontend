# Kanban Board

A Next.js kanban board web app where a signed-in user creates boards, organizes work into
columns, and manages tasks (with subtask checklists) via drag-and-drop — built against a
versioned OpenAPI REST contract (backed by a mock server until a real backend is deployed), with
light/dark theme support and optimistic-locking conflict handling. Solo-developer portfolio
project.

See [`CONVENTIONS.md`](./CONVENTIONS.md) for the project's architecture and coding conventions,
and [`docs/adr/`](./docs/adr) for the technology decisions behind them.

## Stack

Next.js (App Router) · TanStack Query · dnd-kit · Tailwind v4 · Base UI · DTCG design tokens via
Style Dictionary · MSW (mock API server) · openapi-typescript/openapi-fetch.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

```bash
pnpm storybook     # http://localhost:6006 — design-system component catalogue
```

## Testing

This project runs six distinct kinds of check, each catching a different class of problem.
None of them are optional gates dressed up as suggestions — `pnpm lint`, `pnpm format:check`,
`pnpm build`, and `pnpm test` all have to pass with zero errors before a change merges, enforced
by the `quality` job in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) as a required
status check on every push.

### 1. Unit tests — token pipeline

```bash
pnpm test              # runs every Vitest project, including this one
```

`tokens/style-dictionary.build.test.ts` runs the DTCG → Style Dictionary → Tailwind v4 build
function directly (Node environment, no browser) and asserts on the generated CSS output — a
broken token edit fails here with one clear diff instead of N confusing downstream component-test
failures.

### 2. Component behavior tests — Vitest Browser Mode

```bash
pnpm test:browser
```

Every design-system primitive (`src/components/ui/<name>/<name>.test.tsx`) is tested with
[Vitest Browser Mode](https://vitest.dev/guide/browser/): tests run against a **real Chromium
instance** (via `@vitest/browser-playwright`), not jsdom — `getComputedStyle()`, real focus
management, and real click/keyboard events all behave like an actual browser because they run in
one. Rendering uses [`vitest-browser-react`](https://github.com/vitest-dev/vitest-browser-react)'s
`render()` and role-based `screen.getByRole(...)` locators, not `@testing-library/react` (which
renders into jsdom) — the accessible-name/role query API is the same either way, but the browser
underneath it is real.

**Structure every test follows:**

- **Arrange / Act / Assert**, marked with explicit `// Arrange`, `// Act`, `// Assert` comments
  separating the three phases — even a one-line phase keeps its marker, so what's being set up,
  what's being done, and what's being checked never blur together. See any test in
  `button.test.tsx` for the pattern.
- Queries target accessible role + name (`getByRole("button", { name: "Submit" })`), not test IDs
  or DOM structure — a test that only passes because of an implementation detail isn't testing
  the thing a user or screen reader actually experiences.

### 3. Logic/hook tests — React Testing Library (jsdom)

```bash
pnpm test:unit
```

For pure logic and behavior that doesn't depend on real CSS layout or paint (hooks, form
validation, non-visual state), the `unit` Vitest project uses
[React Testing Library](https://testing-library.com/react) against **jsdom**, not a real browser —
faster, but jsdom fakes computed styles from declared rules rather than actually resolving
Tailwind's custom-property-driven values, so it can't stand in for §2 above wherever a test asserts
`getComputedStyle()`. Files live under `*.unit.test.{ts,tsx}` (not `*.test.tsx`, which routes to
§2's real-browser project instead) and register jest-dom matchers, RTL's own `render`/`screen`, and
`@testing-library/user-event` via `vitest.setup.unit.ts`.

`src/lib/rtl-harness-probe.tsx` is a throwaway smoke component (same role `harness-probe.tsx`
played for §2 in plan 01-05) proving the `unit` project actually renders, cleans up between tests,
and handles click/keyboard/disabled-state — delete it once a real hook/logic test exists to prove
the harness instead.

### 4. Accessibility tests — Storybook + axe-core

```bash
pnpm test:a11y
```

Every story (`src/components/ui/<name>/<name>.stories.tsx`) runs through
[`@storybook/addon-vitest`](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
with [`@storybook/addon-a11y`](https://storybook.js.org/docs/writing-tests/accessibility-testing),
which runs [axe-core](https://github.com/dequelabs/axe-core) against the rendered story. An axe
violation **fails the story**, not merely annotates it (`test: "error"` in
`.storybook/preview.ts`) — nothing ships with an unaddressed a11y regression. This is how the
`color-bg-primary-hover` WCAG contrast failure was originally caught (a light purple hover state
scored 2.22:1 against white text, well under the 4.5:1 AA threshold), before Button's real hover
state was even built.

Stories themselves are **visual-only** — no `play` functions, no interaction assertions. Behavior
(clicks, keyboard, disabled state) belongs in the `.test.tsx` file (§2); a story's only job is to
render a state so axe and Playwright (§5) have something to check.

### 5. Visual regression — Playwright screenshots of Storybook

```bash
pnpm test:visual    # smoke run locally — see the CI-only note below
```

[`visual/primitives.visual.spec.ts`](./visual/primitives.visual.spec.ts) uses Playwright's native
`toHaveScreenshot()` against every story, in both light and dark scope, screenshotting the
**pre-built Storybook static output** (`storybook-static/`, served locally by
`scripts/serve-static.mjs`) — never a running Next.js app. A family of near-identical cases (one
story ID per light/dark assertion) is generated with a parametrized loop:

```ts
const storyIds = ["components-ui-button--primary", "components-ui-button--secondary" /* … */];

for (const storyId of storyIds) {
    test(`${storyId} — light`, async ({ page }) => {
        /* … */
    });
    test(`${storyId} — dark`, async ({ page }) => {
        /* … */
    });
}
```

This is the project's preferred shape for a uniform family of test cases — not a mandate to force
every test into a loop, but reach for it when the cases really are this uniform, and prefer
`describe()` grouping over a flat list where that's natural too.

Each assertion screenshots the story's own root element (not the full page, not even Storybook's
`#storybook-root` shell, which itself stretches to the viewport regardless of content) — the crop
follows the actual rendered bounds, so a single button's baseline is ~125×40px, not a mostly-blank
640×480 capture.

**Baselines are CI-only — never generate them on a local machine.** `playwright.config.ts` sets
`ignoreSnapshots: !process.env.CI`: off-CI, `pnpm test:visual` still navigates and renders every
story (a real smoke check that nothing throws), it just never asserts against or writes a
screenshot. A locally-rendered PNG would encode font rendering, subpixel hinting, and OS-level
differences specific to whatever machine generated it — comparing that against a CI-generated
baseline (or vice versa) produces noise, not signal. Real baselines are generated exclusively by
[`.github/workflows/visual-baselines.yml`](./.github/workflows/visual-baselines.yml), a manual
`workflow_dispatch` job that runs on the same `ubuntu-latest` runner as every CI check:

```bash
gh workflow run "Visual baselines" --ref master
# wait for it to finish, then:
gh run download <run-id> --name visual-baselines --dir visual/__screenshots__
git add visual/__screenshots__ && git commit -m "test(visual): update baselines" && git push
```

Run this whenever a change alters a primitive's rendered output (new variant, new story, a token
value change) — the regular `ci.yml` `visual` job only _compares against_ the committed
baselines; it never regenerates them.

### 6. Everything together

```bash
pnpm test:all       # pnpm test && pnpm exec playwright test
```

## CI

Two workflows, both required:

- **`ci.yml`** — on every push/PR: `quality` (lint, format check, build, `pnpm test` — which
  covers §1-§4 above, since they're all Vitest projects) then `visual` (Playwright against the
  committed baselines, §5).
- **`visual-baselines.yml`** — manual dispatch only (§5's regeneration step above).

## Design tokens

`tokens/*.tokens.json` (DTCG format) → Style Dictionary (`style-dictionary.config.mjs`) →
`src/styles/tokens.css` (Tailwind v4 `@theme`). Run `pnpm tokens:build` after editing a token —
it also runs automatically before `pnpm dev`/`pnpm build` (see `package.json`'s `predev`/
`prebuild` scripts), so the generated file is never stale at build/deploy time. Never hand-edit
`src/styles/tokens.css` directly — it's generated (and excluded from ESLint/Prettier accordingly)
but still committed to git, so a diff review can see exactly what a token change actually produced.
