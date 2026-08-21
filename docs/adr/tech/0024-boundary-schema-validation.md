# 0024 — Boundary schema validation with zod

## Context

The committed OpenAPI contract declares no `required` array for its response schemas, so every
generated DTO is all-optional at the type level regardless of what the backend actually sends —
`BoardResponseDTO` (`src/lib/core/api-contract/generated-types.ts:283-288`) and
`ColumnResponseDTO` (same file, `:294-301`) both declare `id?`, `name?`, `version?` as optional,
even though every real response includes all three. Casting straight from `openapi-fetch`'s
response `data` to this project's own `Board`/`Column` types was a lie the type checker could not
catch — the hand-written `isBoard`/`isBoardArray` `typeof`-chain guards in the now-deleted
`src/features/boards/types.ts` existed specifically to cover this gap, and every additional DTO
(Column, Task, Subtask) repeats the identical "declares no `required` array" problem as those
domains are built in Phases 3 and 4.

## Decision Outcome

Runtime shape validation at every boundary uses zod (D-12). The schema is the single source of
truth, and the TypeScript type is derived from it via `z.infer` — never declared separately, so
the two cannot drift apart. Always `.safeParse()`, never `.parse()` — a bad upstream shape resolves
to a handled error branch, matching every existing guard's behavior in this codebase (`.parse()`
throws, turning a shape mismatch into an unhandled exception instead of the recoverable
`{status: "error"}` result every call site in this project already expects).

`src/features/boards/schemas.ts` (plan `02.1-01`) is the shipped pattern every future DTO follows:

```ts
import { z } from "zod";

export const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
});

export const boardsSchema = BoardSchema.array();
export type Board = z.infer<typeof BoardSchema>;
```

Call sites use `boardsSchema.safeParse(data)` and branch on `.success`, exactly as
`src/features/boards/server/load-boards.ts` and the pre-existing `updateThemeAction`
(`src/features/theme/actions/update-theme.ts:18,37`, this project's first zod consumer via
`z.enum(...).safeParse()`) already do.

**Placement:** feature-owned (`features/<domain>/schemas.ts`) while a shape belongs to one domain
— this mirrors where `isBoard`/`Board` already lived (`features/boards/types.ts`, domain-owned
data model). Promoted to `lib/core/api-contract/` only once a second domain genuinely needs the
identical shape, per `CONVENTIONS.md`'s existing placement rule (step 2: belongs to exactly one
domain → that domain's folder; only cross-domain infrastructure lives in `lib/core/`).

## Consequences

- `isBoard`/`isBoardArray` are deleted outright (plan `02.1-01`), not kept alongside the zod
  schema — the two would drift, and only one can be the actual boundary check a reviewer trusts.
- Column, Task, and Subtask get the identical treatment (a `<Entity>Schema` + `.safeParse()` at
  its own read/write boundary) as they are built in Phases 3 and 4 — this record is written before
  those domains exist specifically so their first author doesn't re-derive the pattern or
  reintroduce a hand-written guard.
- A schema mismatch anywhere in the chain (an unexpected backend response shape, a contract drift
  not yet reflected in the committed OpenAPI spec) now fails safely into an existing error branch
  instead of shipping a value that satisfies TypeScript but not reality.

Unwind trigger: none anticipated — zod was already a `package.json` dependency before this phase,
unused until `update-theme.ts`'s narrow `z.enum` usage; this record only extends an existing,
already-adopted tool to its natural boundary-validation role.

**Enforcement:** code review — no automated check currently confirms every DTO consumer calls
`.safeParse()` rather than casting directly; a direct cast from an `openapi-fetch` response to a
domain type without a zod parse in between is a review-blocking gap.

Sources:

- `src/lib/core/api-contract/generated-types.ts:283-301` — the `BoardResponseDTO`/
  `ColumnResponseDTO` all-optional shapes this record's Context cites verbatim.
- `src/features/theme/actions/update-theme.ts:18,37` — the pre-existing zod precedent this record
  extends rather than introduces fresh.
- `src/features/boards/schemas.ts`, `src/features/boards/server/load-boards.ts` — the shipped
  pattern (plan `02.1-01`) every future DTO follows.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  D-12.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-RESEARCH.md`
  Architecture Patterns §3 — the zod schema-first pattern and placement recommendation.
- `CONVENTIONS.md`'s Placement rule (step 2) — the existing rule this record's placement guidance
  follows rather than reinvents.
