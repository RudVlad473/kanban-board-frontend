# Phase 1: Foundation, Auth & Preferences - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 1-Foundation, Auth & Preferences
**Areas discussed:** Token pipeline structure, Primitives set & order, Testing depth per component, Foundation-first sequencing

---

## Token pipeline structure

| Question | Selected answer |
|---|---|
| How should the DTCG token JSON be organized? | **Split by category** (color/spacing/typography/radius/etc.) — vs. single `tokens.json` |
| How many tiers should the token system have? | **Primitive + semantic (2-tier)** — vs. 3-tier with a component layer |
| What should Style Dictionary output for Tailwind to consume? | **CSS `@theme` block (Tailwind v4 native)** — vs. plain CSS custom properties + manual `tailwind.config.js` mapping |
| How should light/dark theme values be represented? | **Same semantic names, mode-scoped values** — vs. fully separate light/dark token files |
| Where do the DTCG token values come from? | **Hand-transcribed from the Figma PDF** — vs. Figma Variables/Tokens plugin export (no live Figma access exists) |
| What naming scale for primitive spacing/sizing tokens? | **Numeric step scale** (`space-1`...`space-12`) — vs. t-shirt sizing |
| Where should raw DTCG token JSON live? | **`tokens/` at repo root** — vs. `src/tokens/` |
| Should breakpoints be DTCG tokens too? | **Yes**, feeding Tailwind's `screens` config — vs. Tailwind defaults untouched |
| How should typography tokens be structured? | **Composite tokens** (one token per text style) — vs. separate scalar tokens |
| Elevation/shadow tokens needed now? | **Yes**, `shadow-sm/md/lg` defined now — vs. deferred until a component needs it |
| Storybook "Tokens" documentation page? | **Skip** — tokens are implementation detail; primitive stories are the documentation |

**Notes:** No live Figma file/API access exists per PROJECT.md — the PDF export is the sole design source, which locked the hand-transcription decision.

---

## Primitives set & order

| Question | Selected answer |
|---|---|
| Is CONVENTIONS.md's Button/TextField/Dropdown/Checkbox the right Phase 1 set? | **Expand the set now** — vs. keep exactly that set |
| Which additional primitives? | **Modal, IconButton, Switch/Toggle** (Card considered, not selected) |
| Build order? | **Button → IconButton → TextField → Checkbox → Switch → Dropdown → Modal** |
| Base UI wrapping vs. from scratch? | **Always wrap Base UI** where it has the primitive |
| Storybook stories part of "done"? | **Yes** — stories are required, also serve as the visual-regression baseline |
| Built-in error/invalid state for form primitives, now or later? | **Now** — needed immediately for auth-form validation errors (React Hook Form + Zod, C-005) |
| Consistent sm/md/lg size scale from day one? | **Yes**, on every primitive that visually varies by size |
| Dropdown API shape? | **Compound components** (`<Dropdown.Trigger>` etc.), mirroring Base UI's own Select/Menu shape — vs. simple prop-driven API |

**Notes:** Card was offered as a candidate addition but not selected — CONVENTIONS.md already treats BoardCard/TaskCard as feature-specific, not primitives.

---

## Testing depth per component

| Question | Selected answer |
|---|---|
| Minimum test bar per primitive? | **Vitest Browser Mode unit test + Storybook story, every primitive** — vs. story only, defer unit tests |
| axe-core wired from the first primitive (Button)? | **Yes**, before Button ships — vs. batched in after a few primitives exist |
| Playwright visual-regression baselines: per-primitive or batched? | **Captured as each primitive's stories ship** — vs. batched at end of Phase 1 |
| Test file location? | **Co-located** in the component's own folder — vs. mirrored top-level `tests/` tree |
| Harness setup: dedicated task first, or Button bootstraps it? | **Dedicated harness-setup task first**, verified with a smoke test, before Button |
| Storybook play-function interaction tests, or Vitest-only? | **Vitest-only** for behavior; stories stay visual-only — vs. both (duplicated coverage) |
| Test the token pipeline itself? | **Yes**, one pipeline-level test asserting generated CSS output — vs. rely on component tests to catch it indirectly |
| What assertion/testing-library stack? (free-text follow-up) | **Vitest's built-in `expect` + `@testing-library/jest-dom` + `@testing-library/react`** — confirmed compatible with Vitest Browser Mode and Next.js App Router |

**Notes:** The assertion-library question came as a genuine mid-discussion question from the user ("what is our assertion library") rather than a multiple-choice pick — answered inline, then a follow-up ("can we add react testing library at this point in time?") confirmed no technical blocker to adding `@testing-library/react` now.

---

## Foundation-first sequencing

| Question | Selected answer |
|---|---|
| Should the whole foundation stack be Plan 1, gating everything else? | **Strictly sequential** — Plan 1 = tokens + harness + all 7 primitives; Plan 2+ = scaffold/auth/theme, consuming the already-built primitives — vs. allowing scaffold/tooling to run in parallel |
| Should ROADMAP.md's Phase 1 success criteria name this explicitly? | **Yes** — added as criterion 6 to Phase 1 in ROADMAP.md during this discussion |

**Notes:** This area directly reflects the user's stated top priority: "design token pipeline... and building out a primitives library... also setting up a robust testing framework that will allow us to add test coverage right after the component is created."

---

## Claude's Discretion

None — every gray area discussed had a concrete user decision; no "you decide" selections were made in this round.

## Deferred Ideas

None — discussion stayed within Phase 1's scope. Card (as a generic primitive, distinct from feature-specific BoardCard/TaskCard) was considered and explicitly not selected, not deferred to a future phase.
