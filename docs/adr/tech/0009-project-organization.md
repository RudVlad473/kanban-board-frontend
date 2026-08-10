# 0009 — Project / component organization methodology

## Decision Drivers

- Explicit stated concern: "not let our project turn to mess along the
  way where we have 50 components living in `/components`" — the
  structure must answer "where does X go" with near-zero deliberation
  for a solo maintainer.
- The project already leans on Next.js App Router's own primitives
  (route groups, Server/Client Component split) — a structure that
  fights those conventions creates permanent friction.
- ~5-6 real domains (boards, columns, tasks, subtasks, auth, activity
  log), starting around 15-20 components — not a huge sprawling app,
  but real UI surface across several distinct domains plus a genuinely
  separate design-system/primitives layer (Base UI wrapped, with its own
  Storybook stories).
- This decision was discovered late — during `/gsd-ingest-docs`, after
  hairsplitter's original Phase 1-5 had already run and validated clean
  — because `HIGH-LEVEL-ARCHITECTURE.md`'s Cross-cutting section (built
  from iluvatar's fixed 13-invariant checklist) has no invariant asking
  how source code itself is organized. See `TRIAGE.md`'s note on C-017.

## Considered Options

**Feature-folder hybrid** (`features/<domain>/` + `components/ui/`)
(recommended)
- Pros: a two-tier placement rule that's trivial to apply ("one domain →
  `features/<domain>/`; reusable and domain-agnostic → `components/ui`");
  no naming collisions with App Router's own `app/` folder; what
  Bulletproof React (35.7k GitHub stars) and multiple independent 2026
  community templates converge on for projects at this scale.
- Cons: nothing mechanically enforces the boundary by default — that gap
  is closed separately below via `eslint-plugin-boundaries`.

**Next.js official colocation only** (route-local `_components` +
shared top-level `components/`/`lib`/`hooks`, no global `features/`)
- Pros: zero friction with App Router — it IS the framework's own
  default, confirmed directly against Next.js's own docs.
- Cons: deliberately unopinionated about where shared-but-not-route-
  local domain code goes — precisely the gap that produces a flat,
  unstructured `/components` dump, which is the exact problem this
  decision exists to avoid.
- Why not the recommendation: "unopinionated" is a feature for the
  framework and a liability for a solo dev who explicitly wants a rule,
  not a blank page.

**Feature-Sliced Design (FSD)**
- Pros: the most rigorously specified of the options — named layers,
  enforced unidirectional imports, a public-API-per-slice convention,
  and its own linter (`steiger`).
- Cons: requires real workarounds to coexist with App Router (renaming
  its own `app` layer to `_app` to dodge App Router's folder, an
  `index.server.ts` split to manage the RSC boundary) — friction layered
  on top of the framework, not working with it; FSD's own docs reserve
  it for 20+ features, well past this project's ~6 domains.
- Why not the recommendation: more ceremony (import-direction rules,
  public-API discipline, a linter to configure and heed alone) than a
  single maintainer needs at this scale, and it fights the framework
  rather than extending it.

**Atomic Design**
- Pros: harmless to App Router itself; a familiar vocabulary.
- Cons: FSD's own competitor analysis and multiple 2026 sources describe
  it as providing no guidance for domain logic or feature boundaries —
  it's a design-system categorization scheme, not an app-architecture
  answer.
- Why not the recommendation: doesn't actually solve the stated
  problem — it says nothing about where `TaskDetailModal` or
  `useMoveTask` live, only about primitives.

## Decision Outcome

Chosen: **Feature-folder hybrid**, with `eslint-plugin-boundaries`
(verified current: v7.2.0 released 2026-08-09, ~1.5M weekly downloads,
ESLint 9/10 flat-config compatible) enforcing the boundary between
`features/<domain>/` folders and the shared `components/ui/` layer.
Confirmed by the user after two follow-up passes: a completeness check
(confirming the original 4-option comparison wasn't missing a better
alternative) and an enforcement-tool verification (confirming
`eslint-plugin-boundaries` is real, current, and solo-dev-realistic
rather than an unverified name-drop) — user: "yep, let's go with these
options."

The concrete directory structure and the full "where does X go"
placement rule are recorded in the project's conventions documentation
under "Project organization," not duplicated here — that is what a
future session or contributor should read first.

## Consequences

Unwind trigger: the project grows well past its initial ~6 domains
toward the 20+ features FSD's own guidance targets, and the lighter
hybrid's lack of enforced public-API boundaries starts causing real
cross-feature coupling problems `eslint-plugin-boundaries` alone doesn't
catch → re-evaluate migrating to FSD.

Sources:
- https://feature-sliced.design/docs/guides/tech/with-nextjs and
  /blog/nextjs-app-router-guide — fetched 2026-08-10 (primary-docs).
- https://nextjs.org/docs/app/getting-started/project-structure —
  fetched 2026-08-10 (primary-docs, v16.3.0).
- https://raw.githubusercontent.com/alan2207/bulletproof-react/master/docs/project-structure.md
  — fetched 2026-08-10 (independent, 35.7k GitHub stars).
- https://github.com/arhamkhnz/next-colocation-template — fetched
  2026-08-10 (independent).
- https://github.com/feature-sliced/steiger — fetched 2026-08-10
  (primary-docs).
- Completeness-check sweep (Turborepo/Nx, Vercel's own docs, "domain-
  driven"/"vertical slice" Next.js structures) — fetched 2026-08-10,
  see `PROPOSITIONS.md` P-009 for the full query/source list.
- `eslint-plugin-boundaries` GitHub Releases API + npm registry —
  fetched 2026-08-10 (primary): v7.2.0 published 2026-08-09.
- https://eslint.org (ESLint v10.0.0 release announcement) — fetched
  2026-08-10 (independent): confirms ESLint 9 EOL 2026-08-06.
