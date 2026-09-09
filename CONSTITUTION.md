# Constitution

A Next.js App Router frontend built against a versioned OpenAPI contract, dialing a deployed
backend directly with no fake HTTP layer at any layer. Every server entry point is a React Server
Component for reads or a Server Action for writes; code is arranged as a feature-folder hybrid
with no cross-feature imports, and gated by ESLint plus nine `scripts/check-*.mjs` gates in CI.

## 1. Feature Architecture

**Command:**

```bash
pnpm lint && pnpm folders:check && pnpm actions:check && pnpm routes:check && pnpm handlers:check && pnpm tsx:check
```

One domain's code lives in `src/features/<domain>/`; anything reusable across domains and
domain-agnostic lives in `src/components/`; `app/` is routing only and composes features without
holding business logic. Infrastructure splits into three rings by platform coupling — `lib/core/`
imports neither sibling, while `lib/server/` and `lib/client/` may import `lib/core/` but never
each other. A feature may import ui, layout and all three lib rings; it may never import another
feature, and that rule currently has no exceptions. `eslint-plugin-boundaries` enforces the whole
graph.

The tables below record how the next instance of each recurring entity kind is named. They were
compiled by a rushmore entity-taxonomy run on 2026-08-28 against Next.js 16.3.0, classifying each
kind on Role, Phase and Form; the full walk, including exempt kinds and the run's discrepancy
findings, is cached under `docs/rushmore/`. Every row was approved individually before landing
here.

`none` in an Enforcement cell always states why, and each was re-searched after this repository's
naming gates were built rather than carried forward from the first pass.

### Role: Domain

| Entity Kind           | Phase · Form                       | Convention                              | Enforcement                                         | Source                                  |
| --------------------- | ---------------------------------- | --------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| Feature schema module | compile/type-only · module-as-unit | `features/<domain>/schemas.ts`          | `check-file/filename-naming-convention`             | Project — ADR tech/0024                 |
| Zod schema constant   | compile/type-only · constant/value | `<noun>Schema`, camelCase               | `@typescript-eslint/naming-convention`              | Ecosystem — zod                         |
| Domain type           | compile/type-only · type/class     | `<Noun>` PascalCase, via `z.infer`      | `@typescript-eslint/naming-convention`              | Ecosystem — TypeScript                  |
| Feature model module  | runtime · module-as-unit           | `features/<domain>/model.ts`, pure only | `check-file/filename-naming-convention` — name only | Project — CONVENTIONS.md placement rule |

#### Notes

- **Feature model module** — `column-drag-model.ts` sits beside `model.ts` at the boards feature root, with an in-file reason (keeping a dnd-kit value import out of the server graph). See the Discrepancy Report.

### Role: Application/Orchestration

| Entity Kind      | Phase · Form       | Convention                                      | Enforcement                              | Source                                      |
| ---------------- | ------------------ | ----------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Server Action    | runtime · function | `actions/<kebab>-action.ts`, `<verbNoun>Action` | `pnpm actions:check` — verb set + symbol | Project — ADR tech/0017, tech/0019          |
| Mutation hook    | runtime · function | `hooks/use-<kebab>.ts`, `use<VerbNoun>`         | `check-file/filename-naming-convention`  | Project — CONVENTIONS.md code-lives table   |
| Generic hook     | runtime · function | `src/hooks/use-<kebab>.ts`, no domain           | `boundaries/dependencies`                | Ecosystem — React                           |
| Context provider | runtime · function | `<name>-provider/`, `<Name>Provider`            | `pnpm folders:check`                     | Derived from: React component, Generic hook |

#### Notes

- **Server Action** — also Boundary-In and Boundary-Out; recorded in all three Role tables per the taxonomy's one-or-more rule. The verb is governed by the HTTP priority rule, not by free choice; see the Discrepancy Report.

### Role: Boundary-In

| Entity Kind          | Phase · Form                   | Convention                                                     | Enforcement                                               | Source                                   |
| -------------------- | ------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| Route segment file   | runtime · module-as-unit       | `page` / `layout` / `loading` / `error` `.tsx`, default export | `pnpm handlers:check` bans `route.ts`                     | Framework — Next.js App Router           |
| Route group folder   | runtime · module-as-unit       | `(<kebab>)`, no URL segment                                    | none — framework-resolved at build                        | Framework — Next.js App Router           |
| Dynamic route folder | runtime · module-as-unit       | `[<camelId>]`                                                  | none — framework-resolved at build                        | Framework — Next.js App Router           |
| React component      | runtime · function             | `<kebab>/<kebab>.tsx`, `<Pascal>`, never `index`               | `pnpm folders:check` + `check-file`                       | Project — CONVENTIONS.md folder rule     |
| Component props type | compile/type-only · type/class | `Props`, or `<Name>Props` if compound                          | `pnpm tsx:check` + `@typescript-eslint/naming-convention` | Project — CONVENTIONS.md component props |
| Proxy (middleware)   | runtime · module-as-unit       | root `proxy.ts`                                                | none — framework-resolved at build                        | Framework — Next.js 16 rename            |
| Server Action        | runtime · function             | see Application/Orchestration                                  | `pnpm handlers:check` — placement only                    | Project — ADR tech/0017                  |

### Role: Boundary-Out

| Entity Kind         | Phase · Form             | Convention                                    | Enforcement                                         | Source                                    |
| ------------------- | ------------------------ | --------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| RSC read function   | runtime · function       | `server/fetch-<kebab>.ts`, `fetch<Noun>`      | `check-file/filename-naming-convention` — name only | Project — ADR tech/0019 + HTTP GET rule   |
| External API client | runtime · module-as-unit | `lib/server/`, carries `import "server-only"` | `boundaries/dependencies`                           | Project — CONVENTIONS.md three-ring split |
| Cookie I/O module   | runtime · module-as-unit | `lib/server/cookies/<name>-cookie.ts`         | `boundaries/dependencies` + `check-file`            | Project — ADR tech/0001                   |
| Server Action       | runtime · function       | see Application/Orchestration                 | `pnpm handlers:check` — placement only              | Project — ADR tech/0019                   |

### Role: Contract/Transfer

| Entity Kind            | Phase · Form                   | Convention                                       | Enforcement                                          | Source                                          |
| ---------------------- | ------------------------------ | ------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| Action result union    | compile/type-only · type/class | `<VerbNoun>Result`, `RESULT_STATUS` discriminant | `@typescript-eslint/naming-convention` — casing only | Derived from: Server Action, Enum-like constant |
| Shared prop-trait type | compile/type-only · type/class | `src/types/props.ts`, `<Name>Prop`               | `@typescript-eslint/naming-convention` — casing only | Project — ADR tech/0013                         |
| Design token file      | build-time · module-as-unit    | `tokens/<category>.tokens.json`, DTCG            | `pnpm tokens:build`                                  | Ecosystem — DTCG / Style Dictionary             |
| Generated API types    | build-time · module-as-unit    | exempt — generated, never hand-edited            | `pnpm api:generate` diff check in CI                 | Taxonomy scoping rule                           |

#### Notes

- **Generated API types** — exempt from a naming rule by the taxonomy's generated-code carve-out; the row exists so the exemption is visible rather than an omission.

### Role: Composition/Wiring

| Entity Kind        | Phase · Form                           | Convention                                       | Enforcement                              | Source                        |
| ------------------ | -------------------------------------- | ------------------------------------------------ | ---------------------------------------- | ----------------------------- |
| Build/tool config  | build-time · module-as-unit            | root `<tool>.config.{ts,mjs}`                    | none — outside every linted path         | Ecosystem — Node              |
| Vitest project     | dev/test-time · constant/value         | `name:` one lowercase word                       | none — a config value, not an identifier | Ecosystem — Vitest            |
| Storybook config   | dev/test-time · module-as-unit         | `.storybook/<name>.ts(x)`                        | none — framework-resolved at startup     | Framework — Storybook         |
| CI workflow        | deploy/migration-time · module-as-unit | `.github/workflows/<kebab>.yml`                  | none — platform-resolved on push         | Framework — GitHub Actions    |
| Git hook           | dev/test-time · module-as-unit         | `.husky/<hook-name>`, no extension               | none — husky resolves by hook name       | Ecosystem — husky             |
| CVA variant module | runtime · constant/value               | `<component>-variants.ts`, `<component>Variants` | `check-file/filename-naming-convention`  | Derived from: React component |

### Role: Verification/Support

| Entity Kind          | Phase · Form                   | Convention                                        | Enforcement                                          | Source                              |
| -------------------- | ------------------------------ | ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| Component test       | dev/test-time · module-as-unit | co-located `<name>.test.tsx`                      | `pnpm renders:check`, `pnpm coverage:check`          | Project — ADR tech/0025             |
| Unit test            | dev/test-time · module-as-unit | `<name>.unit.test.{ts,tsx}`, `.node.test.ts`      | `pnpm coverage:check` + Vitest include               | Project — CONVENTIONS.md test table |
| Integration test     | dev/test-time · module-as-unit | co-located `<name>.integration.test.ts`           | `pnpm coverage:check`                                | Project — CONVENTIONS.md test table |
| Story                | dev/test-time · module-as-unit | co-located `<name>.stories.tsx`, no `play`        | `pnpm stories:check`                                 | Project — ADR tech/0025             |
| E2E spec             | dev/test-time · module-as-unit | `e2e/<domain>-<verb>` or `e2e/<concern>`          | `check-file/filename-naming-convention` — kebab only | Project — ADR tech/0022             |
| Visual spec          | dev/test-time · module-as-unit | `visual/<scope>.visual.spec.ts`                   | `check-file/filename-naming-convention`              | Project — ADR tech/0011             |
| Fixture factory      | dev/test-time · function       | `test-utils/factories/<kebab>.ts`, `create<Noun>` | `check-file` + `naming-convention`                   | Project — ADR tech/0020             |
| Check script         | dev/test-time · module-as-unit | `scripts/check-<what>.mjs`, script `<what>:check` | its own `<name>.unit.test.mjs`                       | Derived from: Unit test             |
| Backend probe script | dev/test-time · module-as-unit | `scripts/probe-<noun>-backend.mjs`                | `check-file/filename-naming-convention`              | Derived from: Check script          |
| E2E seed             | dev/test-time · module-as-unit | `e2e/seed.sh` + `e2e/seed.ts`, `seed<Noun>`       | `check-file/filename-naming-convention`              | Project — ADR tech/0022             |
| Server Action stub   | dev/test-time · module-as-unit | `test-utils/<action>-action-storybook-stub.ts`    | none — the alias register is hand-kept               | Project — ADR tech/0020             |
| Screenshot baseline  | dev/test-time · module-as-unit | exempt — generated by the runner                  | n/a                                                  | Taxonomy scoping rule               |

#### Notes

- **Server Action stub** — Phase 4's D-01 deletes this entity kind outright, replacing the twelve modules and the alias register with a build-time transform. The row records today's state; it should be struck at the next update rather than carried forward.
- **Screenshot baseline** — exempt by the generated-code carve-out, recorded so the exemption is visible.

### Role: Utility/Primitive

| Entity Kind              | Phase · Form                       | Convention                                       | Enforcement                                                  | Source                                    |
| ------------------------ | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| Enum-like constant       | runtime · constant/value           | `SCREAMING_SNAKE` `as const`, keys mirror values | `@typescript-eslint/naming-convention` + `pnpm routes:check` | Project — ADR tech/0012                   |
| lib/core module          | runtime · module-as-unit           | `lib/core/<concern>/<kebab>.ts`                  | `boundaries/dependencies`                                    | Project — CONVENTIONS.md three-ring split |
| Factory function         | runtime · function                 | `create<Thing>`, never a bare noun phrase        | none — verb-prefix rule not expressible                      | Project — CONVENTIONS.md linting rules    |
| Delimited-string builder | runtime · function                 | `build<Thing>String`                             | none — verb-prefix rule not expressible                      | Project — CONVENTIONS.md linting rules    |
| Boolean name             | compile/type-only · constant/value | past-tense verb phrase, `didLoadFail`            | none — see Notes                                             | Project — CONVENTIONS.md linting rules    |
| Pure transform function  | runtime · function                 | verb-first `to*`/`parse*`/`format*`/`flatten*`   | none — verb-prefix rule not expressible                      | Ecosystem — VERB-VOCABULARY.md            |

#### Notes

- **Boolean name** — the one rule deliberately left unenforced. A lint rule can require a prefix from a fixed set; it cannot tell a past-tense verb phrase (`didLoadFail`) from a past-participle compound noun (`loadFailed`), so the approximation would license exactly the shape the rule rejects.

## 2. Testing Architecture

**Command:**

```bash
none
```

_Not yet compiled._ This project has a testing architecture — four Vitest projects, two Playwright
projects, and the test-kind table in `CONVENTIONS.md` — but no rushmore run has walked it, so
nothing is recorded here. That is different from `_Not yet established._`, which would claim the
layer does not exist. Run `rushmore init` to compile Sections 2 through 6.

## 3. Style Architecture

**Command:**

```bash
none
```

_Not yet compiled._ See Section 2.

## 4. Security Architecture

**Command:**

```bash
none
```

_Not yet compiled._ See Section 2.

## 5. Architecture Enforcement

**Command:**

```bash
none
```

_Not yet compiled._ See Section 2.

## 6. Deployment Architecture

**Command:**

```bash
none
```

_Not yet compiled._ See Section 2.

## How to Maintain

Run `rushmore update` when any of the following happens. Every trigger below is keyed to what this
project actually has, not a generic checklist.

- **A new recurring entity kind appears** that no Role table above names — the first Vitest
  project of a new kind, a new `scripts/check-*.mjs` gate, a new `lib/` ring.
- **A Server Action needs a verb outside the closed set** (`create`, `update`, `delete`, `rename`,
  `reorder`, `move`, `sign`) — the set is a `CONVENTIONS.md` edit plus a `scripts/check-action-verbs.mjs`
  edit, never a per-file judgement.
- **Phase 4 deletes the Server Action stub entity kind.** Its row under Verification/Support should
  be struck, not amended, once the build-time transform replaces the twelve stub modules.
- **A `tasks` feature is created.** Section 1's prose says the no-cross-feature-imports rule has no
  exceptions; Phase 4 keeps that true by promoting shared schemas to `lib/core/api-contract/`. If a
  future phase adds an exception instead, this section is wrong the moment it lands.
- **Next.js moves off 16.3.0.** The Router is stamped with that version; a framework-fixed row
  (route segment files, the root `proxy.ts` rename) can change inside a major.
- **Sections 2 through 6 are compiled** — replace this trigger with the ones that run produces.
