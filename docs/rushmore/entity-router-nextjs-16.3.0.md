# Entity Router — kanban-board-frontend

**Framework:** Next.js 16.3.0 (App Router) · **Generated:** 2026-08-28 · **Skill:** rushmore,
entity-taxonomy build from `custom-ai-skills` branch `wt/rushmore-entity-naming`

**Enforcement pass, 2026-08-28.** Every `Enforcement` cell below was re-settled after mechanical
checks were built for this repository, so no row records a tool that is not actually wired up. The
`none` rows that remain each state why, and each was re-searched rather than carried forward.

Cached audit trail for this project's Section 1 compile. Every one of the taxonomy's eight Roles
has at least one entity kind here, so no Role is recorded as not applicable to this stack. The
approved subset folds into `CONSTITUTION.md` Section 1; this file keeps the full walk, exemptions
included.

**Provenance marker deviation.** ADR 0008 defines three tiers: Framework, Ecosystem, Derived. This
project has a fourth and stronger source for most rows — its own `CONVENTIONS.md`, each rule
already carrying an ADR reference. Those rows are marked `Project — <ADR or section>` rather than
being forced into Framework or Ecosystem, which would misattribute them. Flagged here rather than
applied silently.

**Verification.** No markdown linter is available in this environment: neither `markdownlint-cli2`
nor `markdownlint` is on `PATH` or in the project's dependencies. Tables below were self-checked by
eye for a consistent header separator, a consistent column count per row, and no unescaped pipe
inside a cell, then column-padded mechanically. Saying so plainly, per ADR 0009, rather than
implying a lint pass happened.

## Role: Domain

| Entity Kind           | Phase · Form                       | Convention                              | Enforcement                                         | Source                                  |
| --------------------- | ---------------------------------- | --------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| Feature schema module | compile/type-only · module-as-unit | `features/<domain>/schemas.ts`          | `check-file/filename-naming-convention`             | Project — ADR tech/0024                 |
| Zod schema constant   | compile/type-only · constant/value | `<noun>Schema`, camelCase               | `@typescript-eslint/naming-convention`              | Ecosystem — zod                         |
| Domain type           | compile/type-only · type/class     | `<Noun>` PascalCase, via `z.infer`      | `@typescript-eslint/naming-convention`              | Ecosystem — TypeScript                  |
| Feature model module  | runtime · module-as-unit           | `features/<domain>/model.ts`, pure only | `check-file/filename-naming-convention` — name only | Project — CONVENTIONS.md placement rule |

### Notes

- **Feature model module** — `column-drag-model.ts` sits beside `model.ts` at the boards feature root, with an in-file reason (keeping a dnd-kit value import out of the server graph). See the Discrepancy Report.

## Role: Application/Orchestration

| Entity Kind      | Phase · Form       | Convention                                      | Enforcement                              | Source                                      |
| ---------------- | ------------------ | ----------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Server Action    | runtime · function | `actions/<kebab>-action.ts`, `<verbNoun>Action` | `pnpm actions:check` — verb set + symbol | Project — ADR tech/0017, tech/0019          |
| Mutation hook    | runtime · function | `hooks/use-<kebab>.ts`, `use<VerbNoun>`         | `check-file/filename-naming-convention`  | Project — CONVENTIONS.md code-lives table   |
| Generic hook     | runtime · function | `src/hooks/use-<kebab>.ts`, no domain           | `boundaries/dependencies`                | Ecosystem — React                           |
| Context provider | runtime · function | `<name>-provider/`, `<Name>Provider`            | `pnpm folders:check`                     | Derived from: React component, Generic hook |

### Notes

- **Server Action** — also Boundary-In and Boundary-Out; recorded in all three Role tables per the taxonomy's one-or-more rule. The verb is governed by the HTTP priority rule, not by free choice; see the Discrepancy Report.

## Role: Boundary-In

| Entity Kind          | Phase · Form                   | Convention                                                     | Enforcement                                               | Source                                   |
| -------------------- | ------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| Route segment file   | runtime · module-as-unit       | `page` / `layout` / `loading` / `error` `.tsx`, default export | `pnpm handlers:check` bans `route.ts`                     | Framework — Next.js App Router           |
| Route group folder   | runtime · module-as-unit       | `(<kebab>)`, no URL segment                                    | none — framework-resolved at build                        | Framework — Next.js App Router           |
| Dynamic route folder | runtime · module-as-unit       | `[<camelId>]`                                                  | none — framework-resolved at build                        | Framework — Next.js App Router           |
| React component      | runtime · function             | `<kebab>/<kebab>.tsx`, `<Pascal>`, never `index`               | `pnpm folders:check` + `check-file`                       | Project — CONVENTIONS.md folder rule     |
| Component props type | compile/type-only · type/class | `Props`, or `<Name>Props` if compound                          | `pnpm tsx:check` + `@typescript-eslint/naming-convention` | Project — CONVENTIONS.md component props |
| Proxy (middleware)   | runtime · module-as-unit       | root `proxy.ts`                                                | none — framework-resolved at build                        | Framework — Next.js 16 rename            |
| Server Action        | runtime · function             | see Application/Orchestration                                  | `pnpm handlers:check` — placement only                    | Project — ADR tech/0017                  |

## Role: Boundary-Out

| Entity Kind         | Phase · Form             | Convention                                    | Enforcement                                         | Source                                    |
| ------------------- | ------------------------ | --------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| RSC read function   | runtime · function       | `server/fetch-<kebab>.ts`, `fetch<Noun>`      | `check-file/filename-naming-convention` — name only | Project — ADR tech/0019 + HTTP GET rule   |
| External API client | runtime · module-as-unit | `lib/server/`, carries `import "server-only"` | `boundaries/dependencies`                           | Project — CONVENTIONS.md three-ring split |
| Cookie I/O module   | runtime · module-as-unit | `lib/server/cookies/<name>-cookie.ts`         | `boundaries/dependencies` + `check-file`            | Project — ADR tech/0001                   |
| Server Action       | runtime · function       | see Application/Orchestration                 | `pnpm handlers:check` — placement only              | Project — ADR tech/0019                   |

## Role: Contract/Transfer

| Entity Kind            | Phase · Form                   | Convention                                       | Enforcement                                          | Source                                          |
| ---------------------- | ------------------------------ | ------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| Action result union    | compile/type-only · type/class | `<VerbNoun>Result`, `RESULT_STATUS` discriminant | `@typescript-eslint/naming-convention` — casing only | Derived from: Server Action, Enum-like constant |
| Shared prop-trait type | compile/type-only · type/class | `src/types/props.ts`, `<Name>Prop`               | `@typescript-eslint/naming-convention` — casing only | Project — ADR tech/0013                         |
| Design token file      | build-time · module-as-unit    | `tokens/<category>.tokens.json`, DTCG            | `pnpm tokens:build`                                  | Ecosystem — DTCG / Style Dictionary             |
| Generated API types    | build-time · module-as-unit    | exempt — generated, never hand-edited            | `pnpm api:generate` diff check in CI                 | Taxonomy scoping rule                           |

### Notes

- **Generated API types** — exempt from a naming rule by the taxonomy's generated-code carve-out; the row exists so the exemption is visible rather than an omission.

## Role: Composition/Wiring

| Entity Kind        | Phase · Form                           | Convention                                       | Enforcement                              | Source                        |
| ------------------ | -------------------------------------- | ------------------------------------------------ | ---------------------------------------- | ----------------------------- |
| Build/tool config  | build-time · module-as-unit            | root `<tool>.config.{ts,mjs}`                    | none — outside every linted path         | Ecosystem — Node              |
| Vitest project     | dev/test-time · constant/value         | `name:` one lowercase word                       | none — a config value, not an identifier | Ecosystem — Vitest            |
| Storybook config   | dev/test-time · module-as-unit         | `.storybook/<name>.ts(x)`                        | none — framework-resolved at startup     | Framework — Storybook         |
| CI workflow        | deploy/migration-time · module-as-unit | `.github/workflows/<kebab>.yml`                  | none — platform-resolved on push         | Framework — GitHub Actions    |
| Git hook           | dev/test-time · module-as-unit         | `.husky/<hook-name>`, no extension               | none — husky resolves by hook name       | Ecosystem — husky             |
| CVA variant module | runtime · constant/value               | `<component>-variants.ts`, `<component>Variants` | `check-file/filename-naming-convention`  | Derived from: React component |

## Role: Verification/Support

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

### Notes

- **Server Action stub** — Phase 4's D-01 deletes this entity kind outright, replacing the twelve modules and the alias register with a build-time transform. The row records today's state; it should be struck at the next update rather than carried forward.
- **Screenshot baseline** — exempt by the generated-code carve-out, recorded so the exemption is visible.

## Role: Utility/Primitive

| Entity Kind              | Phase · Form                       | Convention                                       | Enforcement                                                  | Source                                    |
| ------------------------ | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| Enum-like constant       | runtime · constant/value           | `SCREAMING_SNAKE` `as const`, keys mirror values | `@typescript-eslint/naming-convention` + `pnpm routes:check` | Project — ADR tech/0012                   |
| lib/core module          | runtime · module-as-unit           | `lib/core/<concern>/<kebab>.ts`                  | `boundaries/dependencies`                                    | Project — CONVENTIONS.md three-ring split |
| Factory function         | runtime · function                 | `create<Thing>`, never a bare noun phrase        | none — verb-prefix rule not expressible                      | Project — CONVENTIONS.md linting rules    |
| Delimited-string builder | runtime · function                 | `build<Thing>String`                             | none — verb-prefix rule not expressible                      | Project — CONVENTIONS.md linting rules    |
| Boolean name             | compile/type-only · constant/value | past-tense verb phrase, `didLoadFail`            | none — see Notes                                             | Project — CONVENTIONS.md linting rules    |
| Pure transform function  | runtime · function                 | verb-first `to*`/`parse*`/`format*`/`flatten*`   | none — verb-prefix rule not expressible                      | Ecosystem — VERB-VOCABULARY.md            |

### Notes

- **Boolean name** — the one rule deliberately left unenforced. A lint rule can require a prefix from a fixed set; it cannot tell a past-tense verb phrase (`didLoadFail`) from a past-participle compound noun (`loadFailed`), so the approximation would license exactly the shape the rule rejects.
