# Tooling Proposals — kanban-board-frontend

**Generated:** 2026-08-28 · Companion to `entity-router-nextjs-16.3.0.md`

Tooling for a Router row whose Enforcement search settled at `none`. The search behind each was a
read of `eslint.config.mjs`, the `scripts/check-*.mjs` gates, `lint-staged.config.mjs`, the husky
pre-commit hook, and both CI workflows; at first generation no naming or filename rule existed in
any of them. Five of the eight rows below were adopted the same day and are now wired into CI.

**Not folded into `CONSTITUTION.md`** — a wishlist dates the moment the tool landscape moves.

| Row(s)                  | Gap                          | Tool                                   | Rule                         | Cost                     |
| ----------------------- | ---------------------------- | -------------------------------------- | ---------------------------- | ------------------------ |
| 12 rows                 | identifier naming unchecked  | `@typescript-eslint/naming-convention` | sections 10/10a/10b          | adopted — config only    |
| 14 rows                 | filename shape unchecked     | `eslint-plugin-check-file`             | `filename-naming-convention` | adopted — one dev dep    |
| React component         | folder must match file       | `scripts/check-component-folders.mjs`  | `pnpm folders:check`         | adopted — custom, tested |
| Server Action           | verb must be in the set      | `scripts/check-action-verbs.mjs`       | `pnpm actions:check`         | adopted — custom, tested |
| Unit test               | suffix must map to a project | `vitest.config.ts`                     | pattern replaces literal     | adopted — config only    |
| Factory function        | `create<Thing>` prefix       | none found                             | n/a                          | left at `none`           |
| Boolean name            | past-tense verb phrase       | none found                             | n/a                          | left at `none`           |
| Pure transform function | verb-first prefix            | none found                             | n/a                          | left at `none`           |

## Notes

- **Adopted, not merely proposed.** ADR 0001 keeps rushmore itself out of the scaffolding business; the adoptions below were made by the repository owner in the same session, outside the skill, and are recorded here so the Router's Enforcement column and reality agree.
- **Result.** Rows at `Enforcement: none` fell from 28 of 47 to 13 of 47. A first pass of the strict identifier rules reported 571 violations; 570 were framework-forced PascalCase (React components, Storybook story exports, compound-component members) or external wire syntax (HTTP headers, `aria-*`, CSS properties), and were scoped in the config. The one real defect it found was a PascalCase zod schema constant among 24 camelCase siblings.
- **The three verb-prefix rows keep `none` honestly.** A naming rule can require a prefix from a fixed list, but `create<Thing>` applies only to a function whose entire purpose is producing its return value, which no lint rule can determine. Requiring the prefix everywhere would flag every correct query and predicate.
