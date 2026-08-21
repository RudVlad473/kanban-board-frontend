# 0021 — Component tests driven through composed Storybook stories

## Decision Drivers

- `tech/0020` retires the last thing shallow component coverage had been leaning on
  (module/hook mocks) — that coverage has to move somewhere real, without turning every component
  test into a slow, over-scoped integration test.
- `vitest.setup.ts` already wires Storybook's portable-stories mechanism
  (`setProjectAnnotations([a11yAddonAnnotations, previewAnnotations])`) into the "browser" Vitest
  project, commented as "the portable-stories wiring GC-08 calls for" — built and left unused until
  this phase; `composeStories` appeared nowhere outside `node_modules` before plan `02.1-01`.
- `02.1-CONTEXT.md` D-05 moves validation-copy/microcopy/edge-case-rendering coverage out of E2E
  entirely (`tech/0022`); that coverage needs a real destination, and a component's own stories are
  the natural place to author every visual/prop-driven state a `.test.tsx` would otherwise
  hand-build from scratch.
- `vitest.setup.ts:27-42`'s own comment records a hard, already-hit failure mode: importing
  `composeStories` from `@storybook/nextjs-vite` (rather than `@storybook/react`) eagerly pulls in
  real Next.js internals that only resolve under the Vite plugin the separate "storybook" Vitest
  project loads — this exact mistake produced the 01-33 Storybook stub files and must not recur.

## Considered Options

Not a fresh comparison — `vitest.setup.ts`'s wiring already picked the portable-stories mechanism
during an earlier plan (GC-08); this record is the first place that choice, and the specific
import-source pitfall guarding it, gets written down as project policy rather than left as a
setup-file comment nobody reads before authoring the next component test.

## Decision Outcome

Every component carries a co-located `*.stories.tsx` and a co-located `*.test.tsx`. The test file
imports those stories through `composeStories` and drives them with `.run()` (Storybook 10.x's
current API — not the pre-10.x pattern of rendering the composed component directly as JSX).
Shallow concerns — copy text, prop-driven variants, validation and error-state rendering — are
asserted through composed stories, not through a hand-built render, so the stories and the tests
can never describe a different component than the one Storybook itself renders.
`src/components/layout/sidebar/sidebar.test.tsx` (plan `02.1-01`) is the worked example:

```ts
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { test, expect } from "vitest";

import * as stories from "./sidebar.stories";

const { Populated, Empty, LoadFailed } = composeStories(stories);

test("renders one row per board and the matching ALL BOARDS caption when populated", async () => {
    await Populated.run();
    expect(screen.getByText("ALL BOARDS (3)")).toBeInTheDocument();
});
```

**Mechanism:** import `composeStories`/`setProjectAnnotations` from `@storybook/react`, never from
`@storybook/nextjs-vite` — `@storybook/nextjs-vite`'s main entry eagerly imports real Next.js
internals (an unresolvable `sb-original/image-context` virtual module, then
`next/dist/client/components/navigation.js`, which reads `process.env` at module-evaluation time)
that only resolve under `vite-plugin-storybook-nextjs`, the Vite plugin the *separate* "storybook"
Vitest project loads via `storybookTest()` — the "browser" project (where every component
`.test.tsx` lives per `CONVENTIONS.md`'s test-location table) does not load that plugin, by this
project's own design (no Next.js runtime in Vitest Browser Mode; every component under test that
needs `next/navigation` already gets its own `vi.mock`). `setProjectAnnotations` accepts an array
of annotation objects and composes them — the same mechanism `definePreview`'s own `addons: [...]`
composition uses under the hood — so passing the a11y addon's annotations alongside
`preview-annotations.tsx`'s raw config in `vitest.setup.ts` reproduces `.storybook/preview.tsx`'s
own composition without touching the Next.js framework package. `setProjectAnnotations` is wired in
`vitest.setup.ts` and must not be re-wired anywhere else — a second call in
`.storybook/vitest.setup.ts` (the "storybook" project's own setup file) would make
`@storybook/addon-vitest` disable its own automatic per-story annotation provisioning, leaving
every story without a render function (`SB_PREVIEW_API_0014 NoRenderFunctionError`). This
detection (`requiresProjectAnnotations` in `@storybook/addon-vitest`'s vitest plugin, as of
10.5.x) is a **naive substring match**, not an AST-aware check: it reads the raw text of every
`setupFiles` entry located directly in the Storybook `configDir` (`.storybook/`) and disables
auto-provisioning if the literal text `setProjectAnnotations` appears anywhere in that file —
including inside a comment. `.storybook/vitest.setup.ts` must never contain that identifier as
text, even to describe why it's absent (found the hard way during plan `02.1-14`'s comment
compression, which briefly wrote that word into a comment there and broke every Storybook Vitest
project test with `NoRenderFunctionError`, silently and only in that one project). `vitest.setup.ts`
and `.storybook/preview-annotations.tsx` — both outside `.storybook/`'s own `configDir` scan or not
listed as the "storybook" project's `setupFiles` — carry one-line pointers back to this record
instead of restating it inline; they are not subject to this constraint.

**Portable-stories composition surface (`.storybook/preview-annotations.tsx`):** the raw
project-annotations object is extracted to its own module — with no `@storybook/nextjs-vite`
import — precisely so `vitest.setup.ts` can register it via `@storybook/react`'s
framework-agnostic `setProjectAnnotations` above, without pulling in `@storybook/nextjs-vite`'s
browser preview bundle; `.storybook/preview.tsx` still owns the real `definePreview(...)` call and
spreads this module's exported value into it. The exported `previewAnnotations` object is
deliberately left without a `: Preview`/`satisfies Preview` type annotation — either one pins it to
`@storybook/react`'s `ReactRenderer`-specific shape, which then fails to structurally satisfy
`.storybook/preview.tsx`'s Next.js-augmented `definePreview` parameter type when spread in
(`ProjectAnnotations<TRenderer>` isn't assignable across two different `TRenderer`
instantiations) — left untyped, its natural object-literal inference (every string a literal, not
widened to `string`) satisfies both call sites. The file's two decorators are written inline inside
the `decorators` array, not extracted to named consts, so `docs/adr/tech/0016`'s
one-destructured-parameter rule doesn't apply to them — that rule's own carve-out excludes a
function/arrow expression whose arity is dictated by the API it's passed to, and Storybook's
decorator signature is always the API-dictated two-parameter `(Story, context)`. The
`DecoratorParams` type alias gives each inline decorator's `Story`/`context` parameters real types
instead of implicit `any` (there is no contextual type for an inline arrow function inside an
untyped object literal), satisfying strict-mode's `no-unsafe-*` lint rules without pinning anything
else in the object.

**Scope carve-out:** `app/**/error.tsx` and `app/**/layout.tsx`-style route files are exempt from
the stories requirement — they are thin route wrappers composing components that already carry
their own stories. `app/(dashboard)/layout.tsx`'s `SidebarBoards` wrapper (this phase's tracer) is
the worked example: it composes `Sidebar`, which owns the stories/tests pair; the wrapper's own
existing co-located behavioral coverage (where one exists, e.g. `ErrorFallback`'s route-level
test) stays as-is rather than gaining a redundant stories file for a thin composition shim.

**Hook carve-out (D-09):** non-visual hooks are tested with React Testing Library's `renderHook`
in the jsdom "unit" Vitest project (suffix `*.unit.test.ts`), never in Vitest Browser Mode. A hook
whose behavior depends on real layout measurement (`scrollWidth`/`clientWidth`, `ResizeObserver`)
is the stated exception and stays in the "browser" project — `useOverflowIndicator`
(`src/hooks/use-overflow-indicator.ts`, consumed by `Dropdown`) is the worked example and the
reason: its behavior cannot be verified against jsdom's non-functional layout engine, so it needs
the real browser Vitest Browser Mode provides.

## Consequences

- Every new component ships its stories and test together from first authorship — a component
  without a stories/test pair is a review-blocking gap, not a follow-up task.
- Coverage that used to live in E2E (validation copy, microcopy, edge-case rendering, per D-05) now
  lives here instead — `tech/0022`'s narrowed E2E scope depends on this record actually absorbing
  that coverage, not merely permitting the E2E narrowing in isolation.
- A component's `.stories.tsx` file becomes load-bearing for test coverage, not just Storybook's UI
  catalog/visual-regression source (`tech/0008`/`tech/0011`) — a story added carelessly (wrong
  props, missing a state) now silently narrows test coverage too, not just the visual catalog.

Unwind trigger: none anticipated — this record activates plumbing (`vitest.setup.ts`'s
`setProjectAnnotations`) a prior plan already built and left dormant; there is no simpler
alternative already paid for.

**Enforcement:** `pnpm test:browser` runs every composed-story test in the "browser" Vitest
project; a component without a stories/test pair is a review-blocking gap (code review, no
automated presence check exists yet).

Sources:

- `vitest.setup.ts` and `.storybook/preview-annotations.tsx` — the `@storybook/react` vs
  `@storybook/nextjs-vite` reasoning, the `setProjectAnnotations` wiring/placement rule, and the
  portable-stories composition surface documented above in full; both files now carry a one-line
  pointer back here instead of restating it (D-22 comment-length sweep, plan `02.1-14`).
- `docs/adr/tech/0018-no-mock-server.md` — the network-layer decision `tech/0020` extends, which
  this record's shallow-coverage move (replacing what mocked component tests used to assert) is
  downstream of.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  D-08, D-09.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-RESEARCH.md`
  Architecture Patterns §2.
- `src/components/layout/sidebar/sidebar.test.tsx`, `src/hooks/use-overflow-indicator.ts`,
  `src/hooks/use-overflow-indicator.test.tsx` — the worked examples this record cites.
- Storybook docs (`/storybookjs/storybook`) — `composeStories`/`.run()` API, Storybook 10.x.
