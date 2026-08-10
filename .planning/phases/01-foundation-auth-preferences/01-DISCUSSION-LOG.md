# Phase 1: Foundation, Auth & Preferences - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 1-Foundation, Auth & Preferences
**Areas discussed:** Token pipeline structure, Primitives set & order, Testing depth per component, Foundation-first sequencing, CI/CD, Pre-commit hooks, Code style conventions (all post-discussion additions)

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
| Should the whole foundation stack be Plan 1, gating everything else? | **Strictly sequential** — Plan 1 = tokens + harness + all 7 primitives; Plan 2+ = auth/theme feature work, consuming the already-built primitives — vs. allowing scaffold/tooling to run in parallel |
| Should ROADMAP.md's Phase 1 success criteria name this explicitly? | **Yes** — added as criterion 6 to Phase 1 in ROADMAP.md during this discussion |

**Notes:** This area directly reflects the user's stated top priority: "design token pipeline... and building out a primitives library... also setting up a robust testing framework that will allow us to add test coverage right after the component is created."

**Post-discussion correction (2026-08-10):** The user asked "are we going to initialize nextjs project first?" — surfacing that the original "Plan 2+ = scaffold, ..." phrasing was wrong. The Next.js project scaffold (package.json, App Router + TypeScript, pnpm, ESLint/Prettier/boundaries config, base folder structure) is an unavoidable prerequisite of Plan 1 itself — none of the token/harness/primitives work can exist without it. `01-CONTEXT.md`'s D-27 was corrected to open Plan 1 with the scaffold step.

**Post-discussion correction #2 (2026-08-10):** The user asked to verify the scaffold with a basic "hello world" check, mirroring D-24's harness smoke-test discipline. `01-CONTEXT.md`'s D-27 was extended: the scaffold step now ends with a verification checkpoint (`next build`/`next dev` succeeds, a default route actually renders) before tokens/harness/primitives work begins.

---

## CI/CD (post-discussion addition)

| Ask | Captured decision |
|---|---|
| Set up basic CI/CD — tests/lint/prettier/build, the common frontend checks | GitHub Actions workflow (`.github/workflows/ci.yml`) is a Plan 1 deliverable — lint, `prettier --check`, `next build`, and tests as required status checks (D-26b) |
| Verify it actually works via a real GitHub push, not just a valid YAML file | Confirmed `origin` remote already exists (`github.com/RudVlad473/kanban-board-frontend`) — CI must be verified by an actual push showing the Actions run trigger and report status (D-26c) |
| When does CI setup happen relative to the rest of Plan 1? | Build/lint/format checks as soon as scaffold exists; test job's scope grows as harness + primitives land; first push-and-verify happens right after the scaffold checkpoint, not held to the end (D-26d) |

**Notes:** This extends the same "verify it actually works" discipline already applied to the scaffold checkpoint and the harness smoke test to the CI pipeline itself. `docs/adr/tech/0007` and `DEFAULTS.md` C-012 already locked ESLint+Prettier-as-required-check and GitHub Actions respectively — this makes both concrete as a Plan 1 deliverable instead of an assumption. ROADMAP.md's Phase 1 criterion 5 was strengthened to name these checks and the real-push verification explicitly.

---

## Pre-commit hooks

| Question | Selected answer |
|---|---|
| Which pre-commit hook manager? | **Husky + lint-staged** — vs. simple-git-hooks + lint-staged |
| What should actually run on every commit? | **Staged-files-only for everything, skip the TS check pre-commit** — full `tsc --noEmit` deferred to CI's build step |
| Block or warn on failure? | **Block the commit on failure** |
| Relationship to CI (D-26b)? | **Pre-commit is a fast local subset; CI stays the authoritative full gate** |

**Notes:** Deliberately skips a full-project type check at commit time for speed — type errors surface at push time via CI instead, a conscious trade-off, not an oversight.

---

## Code style conventions

| Question | Selected answer |
|---|---|
| type vs interface? | **type everywhere by default** — interface only for declaration merging |
| Named vs default exports? | **Named everywhere**, except where Next.js's App Router forces default (page/layout/route files) |
| Function declaration vs const arrow for components? | **const arrow functions**, uniformly |
| React.FC vs plain prop typing? | **Plain prop typing**, no React.FC |
| Prettier specifics (free-text)? | **Semicolons on, double quotes, trailing commas, print width 120** (widened from Prettier's default 80) |
| ESLint strictness? | **typescript-eslint strict + type-checked**, `exhaustive-deps` as error |
| Unused vars handling? | **Error, with `_`-prefix escape hatch** for intentionally-unused params |
| Import ordering? | **Enforced via eslint-plugin-import/import-x**, auto-fixed on commit |
| Path aliases vs relative imports? | **TS path aliases** (`@/features/...` etc.) |
| File naming (free-text follow-up)? | **kebab-case for everything, including component files** — confirmed no Next.js-specific risk after the user asked directly |
| Barrel files? | **No barrel files** — import directly from source files |
| Boolean/event-handler prop naming? | **is/has prefix for booleans, on prefix for handlers** — matches Base UI |
| Variant/size/state styling approach? | **class-variance-authority (cva)** |
| className override escape hatch? | **Yes, every primitive accepts className**, merged via tailwind-merge |

**Notes:** The file-naming question came with a genuine follow-up question from the user ("can we use kebab-case for everything even components? is it going to cause problems with nextjs down the line?") — answered directly (no Next.js-specific risk; the only cross-platform risk is filesystem case-sensitivity, which applies equally to any casing convention) before re-presenting it as a real choice.

**Side discussion:** The user also asked whether `iluvatar` (the project's earlier idea-classification skill, a separate global skill in a different repo) should be updated to include a point about linting/formatting/folder-structure universality. Answered inline: linting/formatting is already covered by iluvatar's existing invariant #10 ("Verification — at what layers, what does each layer not cover"); iluvatar deliberately never selects a specific tool (that's `hairsplitter`'s job, per iluvatar's own "no technology names" guardrail). Folder structure is a worse fit for iluvatar specifically since it isn't domain-agnostic the way its other invariants are (a Next.js feature-folder layout means nothing to a CLI tool), and correctly ended up as a `hairsplitter` decision (ADR tech/0009) in this project's own history. No changes made to iluvatar — this was informational, not a CONTEXT.md decision, and touching a separate pinned/audited global skill was left as the user's explicit call.

---

## Claude's Discretion

None — every gray area discussed had a concrete user decision; no "you decide" selections were made in this round.

## Deferred Ideas

None — discussion stayed within Phase 1's scope. Card (as a generic primitive, distinct from feature-specific BoardCard/TaskCard) was considered and explicitly not selected, not deferred to a future phase.
