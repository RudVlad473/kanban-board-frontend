# 0027 — What a `.tsx` file may declare

## Context

`CONVENTIONS.md`'s "What may live in a `.tsx` file" section (added 2026-08-24 by commit `dc63dc5`)
stated the rule and then ended "Enforcement: code review today; a lint rule restricting top-level
declarations in `.tsx` is the intended endpoint". Review did not hold it: `add-board-modal.tsx`
shipped declaring a zod schema, two derived value types, a default-row count, a row factory and a
path-template type beside its component.

The reason this is a defect rather than untidiness is concrete. A schema declared beside a component
cannot be unit-tested without rendering that component; it cannot be reused by the Server Action
that validates the same shape, because importing it drags a client component into a server module;
and it quietly becomes a second source of truth beside the feature's real `schemas.ts`. The same
argument holds for a pure transform (untestable without a render), a magic number (ungreppable from
the module that should own it) and a path-template type (whose type assertion then has to live
inside JSX).

This is a direct user decision (D-28, D-28a–c in
`.planning/phases/02-board-management/02-CONTEXT.md`), not a researched comparison — recorded as an
ADR because it is a project-wide declaration rule every future component is written to, and because
its exemption list needs one written home.

## Decision Outcome

**A `.tsx` file declares only components and their prop types. Everything else moves to a
non-`.tsx` module — a schema to the feature's `schemas.ts`, a pure transform to its `model.ts`, a
styling or copy constant to a sibling `.ts` beside the component.**

Exactly five top-level declaration kinds are permitted:

1. **A component** — a `const` whose initializer is an arrow function or function expression
   returning JSX, a function declaration containing JSX, or either wrapped in `memo(...)` /
   `forwardRef(...)` (the `React.`-namespaced forms included).
2. **A prop type** — a `type` alias or `interface` named `Props` or ending in `Props`.
3. **An `import`/`export` statement carrying no declaration of its own** — including
   `export default`.
4. **A compound-component namespace object** (D-28c) — an object literal every one of whose
   property values is an identifier naming a component declared earlier in the same file, e.g.
   `export const Toast = { Root, Title, Description }`. Recognised **structurally**, never by a list
   of exempt paths, so a future compound component is covered without editing the checker or this
   record.
5. **A framework-forced route export, in `app/` files only** — `metadata`, `generateMetadata`,
   `viewport`, `generateViewport`, `generateStaticParams`, `dynamic`, `dynamicParams`, `revalidate`,
   `fetchCache`, `runtime`, `preferredRegion`, `maxDuration`. Next.js reads these off the route
   module itself, so they cannot be moved out.

### Mechanism, and why it is not an ESLint rule

`scripts/check-tsx-declarations.mjs` — a hand-written, dependency-free checker parsing with the
already-installed `typescript` devDependency, following the four checkers already in `scripts/` and
globbing through the shared `scripts/glob-real-files.mjs` (D-28a).

ESLint cannot express this rule safely here. A `no-restricted-syntax` block scoped with `files`
**replaces** rather than merges with `eslint.config.mjs` section 8d's existing selector array for
every file matched by both, silently dropping the ADR tech/0016 named-parameter ban and the
raw-anchor ban for all `.tsx` files — the same flat-config hazard `docs/adr/tech/0020`'s Consequences
section already documents, and which `eslint.config.mjs` itself warns about twice (sections 4c and
8d-2). Adding selectors to 8d's array instead does not work either: esquery has no filename
predicate, so a selector cannot be limited to `.tsx`. `dependency-cruiser`, `ts-arch` and
`eslint-plugin-boundaries` were all rejected as module-graph-only — they see an import, never a
declaration — and the first two as new supply-chain surface this phase's Package Legitimacy Audit
had already ruled out.

## Consequences

Twenty-three declarations moved out of twelve `.tsx` files when this rule was turned on (plan 02-15,
Task 2), including all nine `cva(...)` variant constants across the seven primitives that carry them.
Each moved to a sibling `.ts` beside its component, so nothing crossed a feature boundary.

### Exemption list

An exemption is added **here and nowhere else** — never as an inline suppression comment, and never
as a `files`-scoped silence in a lint config. Two exist:

| Exemption | Reason |
|-----------|--------|
| Framework-forced route exports in `app/**/*.tsx` (the list under kind 5 above) | Next.js resolves these from the route module itself; moving one out breaks the route. |
| `src/test-utils/**` | Test infrastructure, never imported by application code, so none of the three defects this rule prevents (untestable-without-render, unreusable-by-a-Server-Action, second source of truth) can arise there. |

`*.stories.tsx` and `*.test.tsx` are out of the rule's scope entirely rather than exempted from it:
a story file's job is to declare `Meta` and `Story` objects and a test file's is to declare
fixtures, neither of which is what this rule is about.

Unwind trigger: revisit if the structural compound-component recognition (kind 4) starts producing
false positives on a legitimate shape, or if an ESLint flat-config release makes a filename-scoped
`no-restricted-syntax` block merge rather than replace — at which point the rule could move into
`eslint.config.mjs` and gain editor-inline feedback, which a CI-only checker does not give.

**Enforcement:** `pnpm tsx:check` (`scripts/check-tsx-declarations.mjs`) fails the build on any
top-level declaration outside the five kinds above, and runs as the "TSX declaration scope check"
step of CI's `quality` job, ahead of Build and Test. It is green across the entire repository with
no per-file baseline and no carve-out beyond the two exemptions tabled above. Its own behavior is
covered by `scripts/check-tsx-declarations.unit.test.mjs` in the `unit` Vitest project — a checker's
real failure mode is passing when it should not — and its failure path was exercised against a
deliberately introduced violation on 2026-08-25.

Sources:

- `docs/adr/tech/0012-enum-like-constant-pattern.md` — the short decision-only ADR shape this record
  follows.
- `docs/adr/tech/0020-no-mocking-policy.md` — the flat-config
  `no-restricted-syntax`-replaces-not-merges hazard that rules ESLint out as the mechanism.
- `docs/adr/tech/0023-comment-length-enforcement.md` — the enforcement-rule shape (mechanical,
  blocking, ADR-cited message) this record's checker follows.
- `CONVENTIONS.md`, "What may live in a `.tsx` file" — the rule text this record makes mechanical.
- `.planning/phases/02-board-management/02-CONTEXT.md` — D-28 and D-28a through D-28c, the user
  decisions this record writes down.
