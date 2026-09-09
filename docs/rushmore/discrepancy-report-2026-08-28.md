# Discrepancy Report — kanban-board-frontend

**Generated:** 2026-08-28 · Companion to `entity-router-nextjs-16.3.0.md`

Existing instances checked against the Convention each Router row settles. Inspection, never a
judgment on whether the Convention or the outlier should change (ADR 0010) — but this run's
findings were then dispositioned by the repository owner in the same session, so the `Disposition`
column records what was decided rather than leaving the reader to guess. A kind with nothing to
report is still listed, as `0 found`.

**Not folded into `CONSTITUTION.md`** — this is a time-bound observation, not standing
architecture.

| Entity Kind           | Found | Instance                                                          | Actual                     | Disposition                      |
| --------------------- | ----- | ----------------------------------------------------------------- | -------------------------- | -------------------------------- |
| React component       | 1     | `src/components/ui/skeleton/skeleton-row.tsx`                     | folder `skeleton/`         | fixed — moved to `skeleton-row/` |
| Zod schema constant   | 1     | `src/features/boards/schemas.ts`                                  | `BoardSchema`              | fixed — renamed `boardSchema`    |
| Unit test             | 1     | `src/lib/server/session.test.ts`                                  | ran via a literal path     | fixed — `session.node.test.ts`   |
| Server Action         | 3     | `rename-board`, `rename-column`, `reorder-column`                 | `rename*`, `reorder*`      | kept — verb set codified         |
| Feature model module  | 1     | `src/features/boards/column-drag-model.ts`                        | `column-drag-model.ts`     | kept — documented in-file        |
| Unit test             | 7     | `scripts/*.unit.test.mjs`                                         | `.unit.test.mjs` in `node` | kept — test table row added      |
| Component test        | 1     | `tokens/style-dictionary.build.test.ts`                           | `tokens` project           | kept — test table row added      |
| E2E spec              | 5     | `auth`, `theme`, `cookie-policy`, `route-guard`, `session-bridge` | bare topic                 | kept — Convention widened        |
| Mutation hook         | 1     | `src/features/boards/hooks/use-reorder-columns.ts`                | plural `Columns`           | open — see Notes                 |
| Fixture factory       | 0     | all 10 factory exports                                            | —                          | 0 found                          |
| Enum-like constant    | 0     | `RESULT_STATUS`, `ROUTE`, `EXTERNAL_PATH`, `COOKIE`, `THEME`      | —                          | 0 found                          |
| RSC read function     | 0     | `fetchBoards`, `fetchBoardFull`                                   | —                          | 0 found                          |
| Story                 | 0     | all 31 stories files                                              | —                          | 0 found                          |
| Integration test      | 0     | all 7 co-located action tests                                     | —                          | 0 found                          |
| Feature schema module | 0     | `auth/schemas.ts`, `boards/schemas.ts`                            | —                          | 0 found                          |

## Notes

- **Server Action, kept** — `VERB-VOCABULARY.md`'s HTTP priority rule maps PUT/PATCH to `update*`, which these three are not. Resolved by codifying a closed verb set in `CONVENTIONS.md` that admits `rename`, `reorder` and `move` as narrower domain verbs, now checked by `pnpm actions:check`. The alternative, renaming three actions across roughly fifteen files, was weighed and declined.
- **E2E spec, kept** — the Convention was mis-derived on the first pass. Nine specs are `<domain>-<verb>` and five name a cross-cutting concern; both shapes are consistent within themselves, so the honest derived rule is two shapes, not one with five violations.
- **Unit test, fixed** — `session.test.ts` ran only because its literal path was listed in `vitest.config.ts`, so a second such file would silently never have run. Renamed to `session.node.test.ts` and the literal replaced with a pattern.
- **Mutation hook, open** — `useReorderColumns` is plural where `useCreateColumn`, `useRenameColumn` and `useDeleteColumn` are singular. Arguably correct, since a reorder rewrites the whole ordered set rather than one column. Left as the one undisposed row rather than resolved by fiat.
- **Not a naming discrepancy, resolved separately** — `CONVENTIONS.md` and Phase 4's `04-CONTEXT.md` disagreed on whether a tasks feature may add a `boards -> tasks` boundary edge. Resolved on 2026-08-28 in favour of the convention doc: the task and subtask schemas are promoted to `lib/core/api-contract/` and no boundary exception is added. `04-CONTEXT.md` D-15 through D-17 are revised accordingly.
