# Phase 4: Task & Subtask Workflow — Pattern Map

**Mapped:** 2026-08-28
**Files analyzed:** 41 new/changed files (28 new, 13 changed, plus 3 deleted groups)
**Analogs found:** 36 / 41 with a concrete in-repo analog (5 have none — see § No Analog Found)

> **Placement rule this map obeys (D-18).** `BoardView` moves to `src/components/layout/board-view/`.
> Task components/hooks/actions live in `src/features/tasks/`. Task/subtask zod schemas are promoted
> to `src/lib/core/api-contract/`. **No analog below implies a `features/boards -> features/tasks`
> import.** Composition goes `layout -> feature` in both directions, which
> `eslint.config.mjs:230-241` already allows (`from: layout`, `allow: [ui, feature, lib-core,
> lib-client]`); `from: feature` allows `[ui, layout, lib-core, lib-server, lib-client]` — never
> `feature`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| `scripts/vite-plugin-server-action-stub.mjs` | config/tooling | transform | `vitest.config.ts:45-99` (`serverActionStubAlias`) + spike appendix | partial |
| `src/test-utils/action-stub-registry.ts` | utility | event-driven | `src/test-utils/reorder-column-action-storybook-stub.ts` | role-match |
| `vitest.config.ts` (changed) | config | — | itself (lines 45-99, 142, 195-198) | exact |
| `vitest.setup.ts` (changed) | config | — | itself (lines 49-53, the D-04 `afterEach`) | exact |
| `.storybook/main.ts` (changed) | config | — | `vitest.config.ts:198` `plugins:` shape | partial |
| `src/lib/core/api-contract/task-schemas.ts` | model/schema | transform | `src/features/boards/schemas.ts:23-74` | exact |
| `src/features/boards/schemas.ts` (changed) | model/schema | transform | itself (lines 45-51, 70-74) | exact |
| `src/features/boards/server/fetch-board-full.ts` (changed) | server read | request-response | itself (lines 68-74) + `model.ts:103-104` | exact |
| `src/features/tasks/actions/create-task-action.ts` | action | CRUD-create | `boards/actions/create-column-action.ts` | exact |
| `src/features/tasks/actions/update-task-action.ts` | action | CRUD-update | `boards/actions/rename-column-action.ts` | exact |
| `src/features/tasks/actions/delete-task-action.ts` | action | CRUD-delete | `boards/actions/delete-column-action.ts` | exact |
| `src/features/tasks/actions/move-task-action.ts` | action | CRUD-update | `boards/actions/reorder-column-action.ts` | exact |
| `src/features/tasks/actions/create-task-subtasks-action.ts` (D-07 fan-out) | action | batch | `boards/actions/create-board-columns-action.ts` | exact |
| `src/features/tasks/actions/create-subtask-action.ts` | action | CRUD-create | `boards/actions/create-column-action.ts` | exact |
| `src/features/tasks/actions/update-subtask-action.ts` | action | CRUD-update | `boards/actions/rename-column-action.ts` | exact |
| `src/features/tasks/actions/delete-subtask-action.ts` | action | CRUD-delete | `boards/actions/delete-column-action.ts` | exact |
| `src/features/tasks/hooks/use-create-task.ts` | hook | request-response | `boards/hooks/use-create-column.ts` | exact |
| `src/features/tasks/hooks/use-update-task.ts` | hook | optimistic | `boards/hooks/use-rename-column.ts` | exact |
| `src/features/tasks/hooks/use-delete-task.ts` | hook | request-response | `boards/hooks/use-delete-column.ts` | exact |
| `src/features/tasks/hooks/use-move-task.ts` | hook | optimistic | `boards/hooks/use-reorder-columns.ts` | exact |
| `src/features/tasks/hooks/use-create-subtask.ts` | hook | optimistic | `use-create-column.ts` + `use-rename-column.ts` | role-match |
| `src/features/tasks/hooks/use-update-subtask.ts` (rename + toggle) | hook | optimistic | `boards/hooks/use-rename-column.ts` | exact |
| `src/features/tasks/hooks/use-delete-subtask.ts` | hook | optimistic | `use-rename-column.ts` (optimistic) not `use-delete-column.ts` | role-match |
| `src/features/tasks/hooks/use-task-drag-sensors.ts` | hook | event-driven | `boards/hooks/use-column-drag-sensors.ts` | exact |
| `src/features/tasks/model.ts` | model (pure) | transform | `src/features/boards/model.ts` | exact |
| `src/features/tasks/task-drag-model.ts` | model (dnd values) | transform | `src/features/boards/column-drag-model.ts` | exact |
| `src/features/tasks/components/task-card/task-card.tsx` | component | static+interactive | `sortable-column.tsx:91-108` (markup) + `column-header.tsx:82-116` (handle+sibling) | role-match |
| `src/features/tasks/components/task-detail-modal/` | component | request-response | `delete-column-confirm.tsx` (Modal shape) + `column-header.tsx` (kebab) | role-match |
| `src/features/tasks/components/add-task-modal/` | component | form | `add-board-modal.tsx` (`useFieldArray`) | exact |
| `src/features/tasks/components/edit-task-modal/` | component | form | `add-board-modal.tsx` + `rename-column-modal.tsx` | exact |
| `src/features/tasks/components/subtask-checklist-row/` | component | form | `checkbox.tsx` consumers + `add-board-modal.tsx:107-133` row shape | role-match |
| `src/features/tasks/components/subtask-editor-row/` | component | form | `add-board-modal.tsx:107-133` (TextField + ghost `X`) | exact |
| `src/features/tasks/components/delete-task-confirm/` | component | request-response | `delete-column-confirm.tsx` | exact |
| `src/components/ui/textarea/` | ui primitive | form | `src/components/ui/text-field/text-field.tsx` | exact |
| `src/components/layout/board-view/board-view.tsx` (**moved**) | layout component | event-driven | itself + `sidebar/` (existing layout-ring precedent) | exact |
| `src/features/boards/components/sortable-column/sortable-column.tsx` (changed) | component | list | itself (lines 91-108, 62-74) | exact |
| `src/lib/core/api-contract/external-paths.ts` (changed) | config | — | itself (lines 6-17) | exact |
| `src/features/tasks/actions/*.integration.test.ts` | test | request-response | `reorder-column-action.integration.test.ts` | exact |
| `e2e/tasks-*.e2e.spec.ts` | test | request-response | `e2e/columns-reorder.e2e.spec.ts` + `e2e/server-action.ts` | exact |
| `e2e/seed.sh` / `e2e/seed.ts` (changed) | test fixture | request-response | `cmd_column` / `seedColumn` | exact |
| `scripts/probe-task-backend.mjs` | script | request-response | `scripts/probe-column-backend.mjs` | exact |
| `tokens/typography.tokens.json` (+ build test) | config | — | existing `heading-s`/`body-m` entries | exact |

---

## Pattern Assignments

### `src/features/tasks/actions/*.ts` — all seven mutations (action, CRUD)

**Analog:** `src/features/boards/actions/reorder-column-action.ts` (the closest, because it carries
`version` + `CONFLICT`). Create paths take `create-column-action.ts`; delete paths take
`delete-column-action.ts`.

**Imports block — copy verbatim** (`reorder-column-action.ts:1-12`, substituting the schema import
with the promoted core-ring module per D-16):

```ts
"use server";

import { refresh } from "next/cache";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";
```

**Result-union shape** (`reorder-column-action.ts:19-25`) — bare discriminants only, one union per
action, documented in a JSDoc that says *why* a branch is present or folded:

```ts
export type ReorderColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS; column: Column }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };
```

**Session-then-parse ordering + auth pattern** (`reorder-column-action.ts:43-56`):

```ts
const record = await verifySession();
if (!record) {
    return { status: RESULT_STATUS.UNAUTHENTICATED };
}

/*
 * Validated after the session check — a Server Action is callable over the wire with an
 * arbitrary payload regardless of compile-time types, so this is real runtime defense
 * (see docs/adr/tech/0024).
 */
const parsed = reorderColumnInputSchema.safeParse({ boardId, columnId, version, targetPosition });
if (!parsed.success) {
    return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
}
```

**Path-params pattern — the load-bearing one for RESEARCH Pitfall 2**
(`reorder-column-action.ts:58-68`; the comment must be carried forward and *widened*, since task ops
omit up to three ancestors, not one):

```ts
const { data, error } = await externalApi.PATCH(EXTERNAL_PATH.COLUMN_REORDER, {
    params: {
        /*
         * The generated `path` type omits `boardId`, and the serializer skips a missing path
         * parameter rather than throwing — so writing it is load-bearing (T-03-21).
         */
        path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId },
        query: { userId: record.id },
    },
    body: { version: parsed.data.version, targetPosition: parsed.data.targetPosition },
});
```

**Error handling + status folding** (`reorder-column-action.ts:70-84`). Copy the `unknown` widening
verbatim; the `DUPLICATE`-fold comment is the model for *any* fold, and D-12's `refresh()` on
`CONFLICT` is the one new line:

```ts
/*
 * The contract declares no error schema for this operation — widen through `unknown` rather
 * than trust the generated type, mirroring `renameColumnAction`.
 */
const upstreamError: unknown = error;
if (upstreamError !== undefined) {
    const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);
    return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
}
```

**Response parse + refresh** (`reorder-column-action.ts:86-101`) — the comment naming *which* schema
and why is the exact shape RESEARCH Pitfall 3 needs for `taskSchema` vs `taskFullSchema`:

```ts
/*
 * The tasks-less response schema, never the full-column one: the reorder response returns no
 * `tasks` array, so parsing with the full shape would fail on every successful call.
 */
const column = columnSchema.safeParse(data);
if (!column.success) {
    return { status: RESULT_STATUS.ERROR };
}

/*
 * The refresh belongs inside the action, not in the calling hook (docs/adr/tech/0019,
 * 03-RESEARCH.md Pitfall 7) — the refreshed props are what retire the optimistic override.
 */
refresh();

return { status: RESULT_STATUS.SUCCESS, column: column.data };
```

**Create-only variants:** `create-column-action.ts:72-77` folds `CONFLICT` into `ERROR` (a create
carries no version) and carries `DUPLICATE` instead. `delete-column-action.ts:82-89` parses nothing
back and documents the cascade.

---

### `src/features/tasks/actions/create-task-subtasks-action.ts` (action, batch — D-07)

**Analog:** `src/features/boards/actions/create-board-columns-action.ts` (whole file, 82 lines).

**Result shape carrying what did NOT land** (lines 14-22):

```ts
/**
 * `createBoardColumnsAction`'s own result — `SUCCESS` carries the names that did NOT land, empty
 * when everything did. A partial result is kept, never rolled back (ADR domain/0003).
 */
export type CreateBoardColumnsResult =
    | { status: typeof RESULT_STATUS.SUCCESS; failedNames: string[] }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.ERROR };
```

**Sequential fan-out loop with per-item validation** (lines 46-73) — copy the serial-by-requirement
comment, the "malformed name never leaves this app's server" branch, and the non-aborting failure:

```ts
const failedNames: string[] = [];

for (const name of parsed.data.names) {
    const validName = columnNameSchema.safeParse(name);
    if (!validName.success) {
        // A malformed name never leaves this app's server — recorded as failed, no call made.
        failedNames.push(name);
        continue;
    }

    const { error } = await externalApi.POST(EXTERNAL_PATH.BOARD_COLUMNS, { /* … */ });

    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        failedNames.push(name);
    }
}

refresh();
return { status: RESULT_STATUS.SUCCESS, failedNames };
```

Also note this file's line 3, the coverage pointer `// Covered by: \`e2e/boards-create.e2e.spec.ts\``
(enforced by `scripts/check-coverage-pointers.mjs`).

---

### `src/features/tasks/hooks/use-move-task.ts` (hook, optimistic — TASK-04/D-11/D-12)

**Analog:** `src/features/boards/hooks/use-reorder-columns.ts` (whole file, 122 lines) plus
`model.ts:120-150` (`applyColumnOrderOverride`).

**Header + coverage pointer + imports** (`use-reorder-columns.ts:1-13`):

```ts
"use client";

// Covered by: `src/features/boards/components/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { reorderColumnAction } from "@/features/boards/actions/reorder-column-action";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
```

*(the pointer must be re-aimed at the new test path once `BoardView` lands under
`src/components/layout/board-view/`.)*

**Per-status toast table** (`use-reorder-columns.ts:15-39`) — the exact structure D-12/C-08 amends;
only the `CONFLICT` **description** becomes `"Refreshing to show the latest."`:

```ts
const GENERIC_REORDER_FAILURE = { title: "Couldn't reorder columns.", description: "Try again." };

const REORDER_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refresh to see the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to reorder this board's columns.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That column is no longer available.",
        description: "Refresh to see this board's current columns.",
    },
};
```

**Override lifecycle — the retirement-by-reference-equality core** (`use-reorder-columns.ts:48-67`):

```ts
export const useReorderColumns = ({ columns }: { columns: ColumnFull[] }) => {
    const toast = useToast();
    const [override, setOverride] = useState<ColumnOrderOverride | null>(null);
    const [movedColumnId, setMovedColumnId] = useState<string | null>(null);
    const mutation = useMutation({ mutationFn: reorderColumnAction, retry: false });

    const renderedColumns = applyColumnOrderOverride({ columns, override });

    /*
     * The helper hands back the props array ITSELF once the server's own order has moved on, so
     * reference equality is the retirement signal — nothing has to clear this.
     */
    const isOverrideApplied = renderedColumns !== columns;

    const reorderingColumnId = mutation.isPending || isOverrideApplied ? movedColumnId : null;
```

**Mutate + rollback + toast** (`use-reorder-columns.ts:79-113`) — note `previousOrder` is the
**server's** order, the single-request comment, and the `.catch(...)` that RESEARCH Pattern 2 says
must NOT be relied on to surface an unqueued-stub throw:

```ts
setOverride({
    previousOrder: columns.map((column) => column.id),
    order: reorderColumns({ columns: renderedColumns, fromIndex, toIndex }).map((column) => column.id),
});
setMovedColumnId(movedColumn.id);

// Exactly one request per completed move — intermediate arrow steps never reach here (T-03-12).
const result = await mutation
    .mutateAsync({ boardId, columnId: movedColumn.id, version: movedColumn.version,
        targetPosition: toReorderTargetPosition({ toIndex }) })
    .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

if (result.status !== RESULT_STATUS.SUCCESS) {
    setOverride(null);
    setMovedColumnId(null);
    toast.add({ type: "danger", ...(REORDER_FAILURE_COPY[result.status] ?? GENERIC_REORDER_FAILURE) });
    return { didReorder: false };
}

// Left in place on success: it retires itself once the refreshed props carry the new order.
return { didReorder: true };
```

**Pure derivation to copy for `applyTaskMoveOverride`** (`src/features/boards/model.ts:120-150`):

```ts
export type ColumnOrderOverride = { previousOrder: string[]; order: string[] };

export const applyColumnOrderOverride = ({ columns, override }) => {
    if (override === null) return columns;

    const serverOrder = columns.map((column) => column.id);
    const isStale =
        serverOrder.length !== override.previousOrder.length ||
        serverOrder.some((id, index) => id !== override.previousOrder[index]);

    if (isStale) return columns;

    /* `flatMap` with an empty-array fallback, so an id the server no longer has drops out rather than becoming `undefined`. */
    return override.order.flatMap((id) => columns.find((column) => column.id === id) ?? []);
};
```

---

### `src/features/tasks/hooks/use-update-task.ts`, `use-update-subtask.ts`, `use-delete-subtask.ts` (hook, optimistic)

**Analog:** `src/features/boards/hooks/use-rename-column.ts` — including the fact that the pure
override helper is **exported from the hook file itself** here (not `model.ts`), because exactly one
container consumes it:

```ts
/**
 * The one column whose name the UI is asserting ahead of the server. `previousName` is what the
 * header showed at submit time, and it is what retires the override: see `applyColumnRenameOverride`.
 */
export type ColumnRenameOverride = { columnId: string; previousName: string; name: string };

export const applyColumnRenameOverride = ({ columns, override }): ColumnFull[] => {
    if (override === null) return columns;

    return columns.map((column) =>
        column.id === override.columnId && column.name === override.previousName
            ? { ...column, name: override.name }
            : column,
    );
};
```
(`use-rename-column.ts:41-68`)

Apply/rollback (`use-rename-column.ts:86-104`):

```ts
const previousName = columns.find((column) => column.id === columnId)?.name ?? name;

// Optimistic: the header asserts the new name before the action is called.
setOverride({ columnId, previousName, name });

const result = await mutation.mutateAsync({ boardId, columnId, name, version })
    .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

if (result.status !== RESULT_STATUS.SUCCESS) {
    // Dropping the override restores the previous name exactly — the raw props still carry it.
    setOverride(null);
    toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[result.status] ?? GENERIC_RENAME_FAILURE) });
    return { didRename: false };
}
```

**D-08's in-flight lockout** (further toggles ignored while one is in flight) has its analog in
`use-reorder-columns.ts:67`'s `reorderingColumnId` derivation — a per-entity id gate derived from
`mutation.isPending || isOverrideApplied`, consumed downstream as `areMutationsDisabled`
(`column-header.tsx:28-29, 122, 133`).

---

### `src/features/tasks/hooks/use-delete-task.ts` (hook, request-response — deliberately NOT optimistic)

**Analog:** `src/features/boards/hooks/use-delete-column.ts` (whole file, 69 lines). Copy the JSDoc
rationale verbatim with the entity substituted — it is the same ADR domain/0002 cascade argument
D-09 uses to split task-delete from subtask-delete:

```ts
/**
 * COLUMN-04's delete (U-05). Deliberately NOT optimistic, unlike its rename sibling: the column
 * stays on the board until the server agrees, because the cascade to its tasks and subtasks is
 * irreversible (ADR domain/0002) and there would be nothing to roll back to if the delete failed.
 */
export const useDeleteColumn = () => {
    const toast = useToast();
    const mutation = useMutation({ mutationFn: deleteColumnAction, retry: false });
    /* … */
        if (result.status !== RESULT_STATUS.SUCCESS) {
            // Nothing to undo — the board was never changed, so the toast is the whole response.
            toast.add({ type: "danger", ...(DELETE_FAILURE_COPY[result.status] ?? GENERIC_DELETE_FAILURE) });
            return { didDelete: false };
        }
        return { didDelete: true };
    };

    return { deleteColumn, isPending: mutation.isPending };
};
```

---

### `src/features/tasks/hooks/use-create-task.ts` (hook, request-response — inline error, no toast)

**Analog:** `src/features/boards/hooks/use-create-column.ts:41-78`. The distinguishing pattern is
`errorMessage`/`clearError` local state instead of a toast, plus a message *string* table rather
than a `{title, description}` one:

```ts
const GENERIC_CREATE_FAILURE_MESSAGE = "Couldn't create column. Try again.";

const CREATE_FAILURE_MESSAGE: Partial<Record<ResultStatus, string>> = {
    [RESULT_STATUS.DUPLICATE]: "A column with that name already exists on this board.",
    [RESULT_STATUS.UNAUTHENTICATED]: "Your session has expired. Sign in again to create a column.",
};

/**
 * COLUMN-01's create orchestration. A failure is reported inline rather than as a toast: nothing
 * was created, so there is nothing to reconcile and the modal stays open holding the typed name.
 */
export const useCreateColumn = ({ columnCount }: { columnCount: number }) => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const clearError = (): void => { setErrorMessage(null); };
    /* … */
    return { createColumn, isPending: mutation.isPending, errorMessage, clearError };
};
```

---

### `src/features/tasks/hooks/use-task-drag-sensors.ts` (hook, event-driven)

**Analog:** `src/features/boards/hooks/use-column-drag-sensors.ts` (whole file, 118 lines).

Sensor set to copy (lines 107-118) — mouse+touch rather than pointer, and no lift-key override:

```ts
/**
 * COLUMN-03's three drag sensors. Mouse and touch rather than the combined pointer one: that keeps
 * real touch support while staying reachable by automation, and it sidesteps the pointer sensor's
 * complete absence of an interactive-element guard (03-RESEARCH Pitfall 5, T-03-32).
 */
export const useColumnDragSensors = () =>
    useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        /* No lift-key override: D-06 keeps the library's defaults, so both space and enter lift. */
        useSensor(ColumnKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
```

The subclass-and-narrow pattern (lines 67-105) is the analog for RESEARCH Pitfall 8's required
guard — `ColumnKeyboardSensor.handleKeyDown` falls through to `super.handleKeyDown(event)` for every
case it does not narrow. A task drag must be one of those fall-through cases (branch on
`active.data.current?.type`), or the sensor measures the column's own `overflow-y-auto` box:

```ts
class ColumnKeyboardSensor extends BaseKeyboardSensor {
    handleKeyDown(event: Event): void {
        const move = resolveVisibleDestinationMove({ event, props: this.props });

        if (move === null) {
            super.handleKeyDown(event);
            return;
        }

        /* The library's own move, verbatim: reference coordinates first, then the translate from them. */
        event.preventDefault();
        this.referenceCoordinates ??= move.currentCoordinates;
        this.props.onMove(subtract(move.newCoordinates, this.referenceCoordinates));
    }
}
```

Note the narrowing set at line 23 (`HORIZONTAL_STEP_CODES = new Set([KeyboardCode.Right,
KeyboardCode.Left])`) — the task path adds Up/Down as *unnarrowed* steps.

---

### `src/features/tasks/task-drag-model.ts` (model, dnd-kit values)

**Analog:** `src/features/boards/column-drag-model.ts` — 25 lines, exists solely to hold the value
import. Copy the file's whole rationale block, it is the ADR-grade record RESEARCH Pitfall 14 cites:

```ts
"use client";

import { arrayMove } from "@dnd-kit/sortable";

/*
 * Split out of `model.ts` so no VALUE import of `@dnd-kit/*` reaches the server graph: dnd-kit calls
 * `React.createContext` at module scope and `server-only` `fetch-board-full.ts` imports `model.ts`.
 * Revert the merge and `pnpm build` dies on /boards/[boardId] — see 03-14-SUMMARY.md.
 */

export const reorderColumns = ({ columns, fromIndex, toIndex }): ColumnFull[] =>
    arrayMove(columns, fromIndex, toIndex);
```

A `type`-only dnd-kit import is fine in `model.ts` — `src/features/boards/model.ts:1` already does
`import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";`.

---

### `src/features/tasks/model.ts` (model, pure)

**Analog:** `src/features/boards/model.ts`. Three specific things to copy:

1. **Announcements factory** (`model.ts:173+`, `createColumnReorderAnnouncements`) — the UI-SPEC's
   keyboard-move strings go through this exact shape, with the 1-based-speech conversion encoded
   once:
   ```ts
   /* Speech is 1-based while the wire's `targetPosition` is 0-based, so the conversion is encoded once here. */
   const resolveColumn = (id: UniqueIdentifier): { name: string; position: string } | null => {
       const index = columns.findIndex((column) => column.id === id);
       return index === -1 ? null : { name: columns[index].name, position: String(index + 1) };
   };
   ```
2. **Sort-at-the-read helper** (`model.ts:99-104`) — the analog for D-11's task sort:
   ```ts
   /**
    * `position` is the backend's ordering authority — the response array's own order carries no
    * guarantee and only looked like one because every fixture is authored in creation order. Copies
    * first: the input is `cache()`d RSC data other derivations also read (03-14-SUMMARY.md).
    */
   export const sortColumnsByPosition = (columns: ColumnFull[]): ColumnFull[] =>
       [...columns].sort((left, right) => left.position - right.position);
   ```
3. **`toSubtaskSummary`** (`model.ts:20-24`) — already written and shipped; it *moves* with the
   schemas under D-16, it is not re-authored. The zero-subtask suppression is a **call-site** change
   at `sortable-column.tsx:103`, per UI-SPEC.

---

### `src/lib/core/api-contract/task-schemas.ts` (schema — D-16 promotion)

**Analog:** `src/features/boards/schemas.ts:17-74` — move these declarations, do not re-author them.
The `description` normalisation comment is load-bearing (an observed backend behaviour, dated):

```ts
export const subtaskSchema = z.object({
    id: z.string(), title: z.string(), isCompleted: z.boolean(), version: z.number(),
});

export const taskFullSchema = z.object({
    id: z.string(),
    title: z.string(),
    /*
     * The contract declares `description` optional, but the backend sends an explicit `null` for a
     * task created without one (observed 2026-08-27, plan 03-12) — normalised to the one absent
     * value, so a consumer never has to handle two spellings of the same thing.
     */
    description: z.string().nullish().transform((value) => value ?? undefined),
    version: z.number(),
    position: z.number(),
    subtasks: subtaskSchema.array(),
});
```

**Mutation-response schema** (RESEARCH Pitfall 3) — mirror `schemas.ts:70-74` exactly, comment
included:

```ts
/*
 * What a column mutation's own response parses as. Derived rather than restated so the two can never
 * drift: `ColumnResponseDTO` returns no tasks, so `columnFullSchema` would fail every successful call.
 */
export const columnSchema = columnFullSchema.omit({ tasks: true });
```

**Title-bounds split** (RESEARCH Pitfall 4) — `schemas.ts:126-140`:

```ts
const COLUMN_NAME_LENGTH_MESSAGE = "Column name must be between 3 and 32 characters.";

/** The backend's own enforced bounds, mirrored verbatim (02-BACKEND-FACTS.md P6). */
export const columnNameSchema = z.string().trim()
    .min(3, COLUMN_NAME_LENGTH_MESSAGE).max(32, COLUMN_NAME_LENGTH_MESSAGE);

/*
 * Deliberately separate from `columnNameSchema`, not a relaxation of it: a blank row is now a user
 * error to correct rather than input to drop (D-02a), and it earns the required-field copy, not the
 * length copy. `.pipe` rather than stacked `.min`s so the blank case can never report length.
 */
export const columnNameRowSchema = z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).pipe(columnNameSchema);
```

---

### `src/features/boards/server/fetch-board-full.ts` (changed — D-11's task sort)

**Analog:** itself, lines 68-74. The task sort goes **inside** this return, at the one ordering site:

```ts
/*
 * The ONE ordering site: every consumer downstream of here is position-ordered by construction,
 * so no component sorts and the optimistic `arrayMove` composes with display order (COLUMN-03).
 */
return {
    status: RESULT_STATUS.SUCCESS,
    board: { ...parsed.data, columns: sortColumnsByPosition(parsed.data.columns) },
};
```

Also note lines 12-16 — the recorded no-barrel rule for `server/`, which RESEARCH Anti-patterns
extends to `features/tasks/actions/`.

---

### `src/components/ui/textarea/` (ui primitive, form)

**Analog:** `src/components/ui/text-field/text-field.tsx` (92 lines) — mirror its anatomy exactly and
change only the rendered element and `min-h-28`. Folder contents to mirror:
`text-field-variants.ts`, `text-field.stories.tsx`, `text-field.test.tsx`, `text-field.tsx`
(`scripts/check-component-folders.mjs` enforces the shape).

**Props contract** (lines 9-26) — the `label` required-prop rule and the `isLoading` axis:

```ts
type Props = Omit<ComponentProps<typeof Field.Control>, "className" | "disabled" | "size" | "children"> &
    Pick<VariantProps<typeof textFieldVariants>, "size"> &
    ClassNameProp & {
        /** Required — an unlabelled input must not be constructible. */
        label: string;
        description?: string;
        errorMessage?: string;
        hasError?: boolean;
        isDisabled?: boolean;
        /**
         * Transient "a request is in flight" state; composes into `disabled` (`isDisabled ||
         * isLoading`), matching Button/IconButton/Checkbox/Dropdown's isLoading pattern.
         */
        isLoading?: boolean;
    };
```

**Field composition + error mount** (lines 41-89):

```ts
<Field.Root invalid={hasError} disabled={isDisabled || isLoading} className="flex w-full flex-col gap-1">
    <Field.Label className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary">
        {label}
    </Field.Label>

    <Field.Control aria-busy={isLoading} className={cn(textFieldVariants({ /* … */ }), className)} {...props} />

    {hasError && errorMessage ? (
        <Field.Error match={true} className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger">
            {errorMessage}
        </Field.Error>
    ) : null}
</Field.Root>
```

For the `<textarea>` element, use Base UI's `render` prop (`Field.Control render={<textarea />}`) —
`text-field.tsx:53` passes `type` to an `<input>`, which is the thing that must change.

**Visual baseline:** ADR tech/0011 scopes Playwright visual regression to `components/ui/`, so this
primitive — unlike everything else in this phase — needs a baseline, verified with `CI=1`.

---

### `src/features/tasks/components/task-card/task-card.tsx` (component)

**Analog A — the markup being replaced** (`sortable-column.tsx:91-108`, note RESEARCH Pitfall 17:
the UI-SPEC's line cites are off by ~2; `<ul>` is line 91, the `<li>` spans 94-105):

```tsx
<ul className="flex flex-col gap-4">
    {column.tasks.map((task) => {
        return (
            <li key={task.id} className="flex flex-col gap-2 rounded-lg bg-bg-surface px-4 py-6 shadow-sm">
                <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary">
                    {task.title}
                </p>
                <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                    {toSubtaskSummary(task.subtasks)}
                </p>
            </li>
        );
    })}
</ul>
```

**Analog B — the handle-plus-sibling shape S-04 prescribes** (`column-header.tsx:82-116`). Copy
three things: the handle is a plain `<button type="button">` carrying `ref={setHandleNode}` +
`{...handleAttributes} {...handleListeners}` with **no `onClick`**; the sibling `IconButton` is
outside it; and the ref/attribute destructuring happens above the JSX for the eslint reason at
lines 51-57:

```tsx
/*
 * Read out here rather than inside the JSX: `react-hooks/refs` treats a property access feeding
 * a `ref=` as reaching into a ref object during render, and fails the whole object's reads.
 */
const setHandleNode = handleProps?.setNode;
const handleAttributes = handleProps?.attributes;
const handleListeners = handleProps?.listeners;
```

```tsx
/*
 * D-06: no click handler of its own — enter LIFTS the column, so a handle that also
 * activated on enter would be ambiguous.
 */
<button
    type="button"
    ref={setHandleNode}
    {...handleAttributes}
    {...handleListeners}
    className="flex min-h-11 w-full cursor-grab items-center gap-4 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none aria-pressed:cursor-grabbing"
>
```

```tsx
{/*
  * A sibling of the heading, never inside it (D-06), which is also the first of the two
  * defences against a kebab click starting a drag: it never receives the drag listeners.
  */}
<IconButton variant="ghost" size="md" label={`Column actions for ${column.name}`} icon={<EllipsisVertical />} />
```

**Analog C — the `useSortable` wiring and drop indicator** (`sortable-column.tsx:27-74`). S-08's
horizontal bar is this, axis-flipped:

```tsx
const { activeIndex, attributes, index, isDragging, isSorting, listeners, overIndex,
    setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: column.id,
    disabled: isReorderDisabled,
    attributes: { roleDescription: "draggable column" },
});

/* Read off the strategy's own indices, so the pointer path and the keyboard path indicate identically. */
const isInsertionPoint = isSorting && overIndex === index && activeIndex !== index;
```

```tsx
style={{
    transform: CSS.Transform.toString(transform),
    /* The one motion the drag has; dropped entirely under reduce-motion rather than shortened. */
    transition: prefersReducedMotion ? undefined : transition,
}}
className={cn("relative flex w-70 shrink-0 flex-col rounded-sm", isDragging && "opacity-50")}
```

```tsx
{!isInsertionPoint ? null : (
    /*
     * Drawn in the gutter rather than left to the reflow alone: with unequal column
     * heights a shifted preview reads ambiguously about which side the drop lands on.
     */
    <span aria-hidden="true"
        className={cn("absolute inset-y-0 w-1 rounded-full bg-bg-primary",
            activeIndex < index ? "-right-3.5" : "-left-3.5")} />
)}
```

---

### `add-task-modal/` and `edit-task-modal/` (component, form)

**Analog:** `src/features/boards/components/add-board-modal/add-board-modal.tsx`.

**RHF + zodResolver + `useFieldArray`** (lines 46-63) — the subtask draft rows:

```ts
const { register, control, handleSubmit, formState: { errors } } = useForm<AddBoardFormValues>({
    resolver: zodResolver(addBoardFormSchema),
    mode: "onTouched",
    defaultValues: { name: "", columns: createEmptyColumnRows(DEFAULT_COLUMN_ROW_COUNT) },
});

const { fields, append, remove } = useFieldArray({ control, name: "columns" });
```

**Both dismissal guards** (lines 65-80 + 76) — required together, and the reason is recorded:

```ts
/*
 * Both guards are required together: Base UI's Dialog fires `onOpenChange(false)` on Escape
 * regardless of the backdrop-dismissal prop (documented in `modal.tsx` itself).
 */
const handleOpenChange = (nextIsOpen: boolean): void => {
    if (isPending) return;
    onOpenChange(nextIsOpen);
};
```
```tsx
<Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange} isDismissableOnBackdropClick={!isPending}>
```

**Submit wrapper** (lines 81-92) — RHF's `(values, event)` signature is deliberately not passed
through:

```tsx
onSubmit={(event) => {
    /*
     * Wrapped rather than passed straight through: React Hook Form calls its
     * callback with `(values, event)`, and this component's contract is values.
     */
    void handleSubmit((values) => {
        onSubmit({ name: values.name, columns: values.columns.map((column) => column.value) });
    })(event);
}}
```

**The editable row + ghost `X`** (lines 107-133) — this is `SubtaskEditorRow` verbatim, with
`mt-6` aligning the icon against the label:

```tsx
<div key={field.id} className="flex items-start gap-2">
    <TextField label={rowLabel} type="text" placeholder="e.g. Todo"
        hasError={Boolean(rowErrorMessage)} errorMessage={rowErrorMessage}
        {...register(buildColumnRowPath(index))} />

    <IconButton type="button" variant="ghost" label={`Remove ${rowLabel}`} icon={<X />}
        className="mt-6" onClick={() => { remove(index); }} />
</div>
```

**Presentational-by-prop rule** (JSDoc at lines 30-34) — every modal takes `onSubmit` as a prop
rather than calling its hook, and the JSDoc says why. Copy this rationale into each new modal:

> Deliberately takes `onSubmit` as a prop rather than calling `useCreateBoard()` itself — that is
> what lets its behavioural tests drive it with a real local function instead of a module mock,
> which is banned outside stories (docs/adr/tech/0020).

**Field-path template helper** (`model.ts:31-37`) — `buildColumnRowPath` exists because a bare
numeric interpolation trips `restrict-template-expressions`; the subtask rows need the same.

---

### `delete-task-confirm/` (component)

**Analog:** `src/features/boards/components/delete-column-confirm/delete-column-confirm.tsx` — copy
whole, substituting copy strings. The three load-bearing pieces:

```tsx
/*
 * The cascade has no undo (ADR domain/0002), so the irreversible action must not sit under a
 * reflexive Enter on an opening modal — initial focus goes to the non-destructive one (T-03-08).
 */
const keepColumnRef = useRef<HTMLButtonElement>(null);
```
```tsx
<Modal.Content initialFocus={keepColumnRef}>
    <Modal.Title className="text-text-danger">Delete this column?</Modal.Title>

    {/* Prose, not a label — it wraps (UI-SPEC long-text row), and `break-words` keeps
        an unbroken name from widening the panel instead of wrapping inside it. */}
    <Modal.Description className="break-words">{/* … */}</Modal.Description>

    {/* No error banner of its own — U-05 makes a failed delete a toast raised by the hook. */}
    <Modal.Footer>
        <Button type="button" variant="destructive" isLoading={isPending} className="w-full" /* … */>
```

---

### `subtask-checklist-row/` (component)

**Analog:** `src/components/ui/checkbox/checkbox.tsx:24-30, 66-75`. The primitive already ships the
opt-in strikethrough and names this phase in its own doc comment:

```ts
/**
 * Opt-in strikethrough on the label when checked. Defaults to `false` — the Phase 4
 * subtask row turns this on; the auth forms consuming this primitive in plan 01-12 do
 * not want it.
 */
hasStrikethroughWhenChecked?: boolean;
```
```tsx
<Field.Label className={cn(
    "font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary",
    hasStrikethroughWhenChecked && "peer-data-[checked]:line-through",
)}>
    {label}
</Field.Label>
```

**RESEARCH Pitfall 16 applies here:** the label colour the UI-SPEC requires
(`text-text-primary/50`) is not reachable through `className`, which targets the box
(`checkbox.tsx:57-60`). That is a `components/ui/` change with a Playwright baseline attached —
plan it as such, not as a row-local class.

---

### `src/components/layout/board-view/board-view.tsx` — the relocation (D-18)

**Analog:** itself, plus `src/components/layout/sidebar/` as the existing layout-ring precedent
(named in `eslint.config.mjs:227-229` as the reason `layout -> feature` exists: *"Sidebar composing
`useBoards()`"*).

**Full footprint that moves with the file** (measured, not estimated):

| Artefact | Path today | Size |
|----------|------------|------|
| Component | `src/features/boards/components/board-view/board-view.tsx` | 310 lines |
| Stories | `.../board-view/board-view.stories.tsx` | 231 lines, 20 composed stories |
| Test | `.../board-view/board-view.test.tsx` | 1,334 lines, 60 `it()` × 2 devices |
| Vitest screenshots | `.../board-view/__screenshots__/board-view.test.tsx/*.png` | **52 files** |
| Coverage pointers | `use-rename-column.ts:3`, `use-create-column.ts:3`, `use-reorder-columns.ts:3`, `use-column-drag-sensors.ts:3`, `use-delete-column.ts:3` | 5 comment lines, gated by `scripts/check-coverage-pointers.mjs` |
| Route importer | `app/(dashboard)/boards/[boardId]/page.tsx:5` | 1 import |
| Prose cross-references | `column-header.stories.tsx:18`, `sortable-column.stories.tsx:55`, `add-column-placeholder.stories.tsx:22` | 3 comments |

Notes that keep the move cheap:
- The 52 screenshot **filenames** derive from the test titles (`BoardView--DESKTOP--…`), not the
  folder, so only the containing directory path changes — no re-baseline is needed if the titles
  and rendered output are untouched.
- `BoardViewSkeleton` is a **different** component (`board-view-skeleton/`) with three importers
  (`page.tsx:6`, `boards/loading.tsx:2`, `boards/[boardId]/loading.tsx:2`) — it is not part of this
  move.
- Playwright visual regression does not cover `features/**` (ADR tech/0011), so no `test:visual`
  baseline moves. The only visual baseline this phase adds is the new `Textarea`.

**Composition pattern for passing task nodes down** — there is no exact in-repo render-prop analog.
The nearest structural precedent is `board-view.tsx:224-235`'s `map` handing per-column props to
`SortableColumn`, and `column-header.tsx:22-27`'s `handleProps` object prop (a bundle of ref +
attributes + listeners threaded from a parent that owns the hook). The `ReactNode`/render-prop
bundle D-18 needs is that same shape widened.

**dnd-kit context wiring to extend** (`board-view.tsx:201-213`) — the stable-id and announcements
comments both matter:

```tsx
/*
 * The context id is derived from the board's own id, not left to the library: its
 * description ids come from a module-scope counter that drifts between the server
 * render and a fresh client, producing an `aria-describedby` hydration mismatch.
 */
<DndContext
    id={`board-columns-${board.id}`}
    sensors={sensors}
    collisionDetection={closestCenter}
    accessibility={{ announcements: createColumnReorderAnnouncements({ columns: renderedColumns }) }}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onDragCancel={handleDragCancel}
>
```

**`handleDragEnd`'s one-request rule** (`board-view.tsx:156-176`) — RESEARCH Pitfall 7's warning
lands exactly here; `findIndex` returns `-1` for a task id and silently no-ops:

```tsx
/*
 * One completed move, one request (T-03-12). A drop with no target, or one that ended where it
 * began, is not a move — every intermediate arrow step stayed inside the library.
 */
const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    setLiftedColumnId(null);
    if (over === null || active.id === over.id) return;

    /* Both indices come from the RENDERED array, which is the same order the sortable items are in. */
    const fromIndex = renderedColumns.findIndex((column) => column.id === active.id);
    const toIndex = renderedColumns.findIndex((column) => column.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    void requestReorder({ boardId: board.id, fromIndex, toIndex });
};
```

**Chained-hook ordering** (`board-view.tsx:63-73`) — the task hooks chain onto this same output:

```tsx
/* The DERIVED columns, not the raw props — that array is what carries the optimistic name. */
const { renameColumn, columns: renamedColumns } = useRenameColumn({ columns: board.columns });
/* Chained onto the rename's own output, so a column can be renamed and moved in the same session. */
const { reorderColumns: requestReorder, columns: renderedColumns, reorderingColumnId } =
    useReorderColumns({ columns: renamedColumns });
```

**DragOverlay + reduce-motion** (`board-view.tsx:242-263`) — the task clone follows this exactly:

```tsx
{/* The full-opacity preview that follows the pointer while the column itself stays
    in place at reduced opacity; the settle is dropped entirely under reduce-motion. */}
<DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
```

---

### The stub tooling (`scripts/vite-plugin-server-action-stub.mjs`, `action-stub-registry.ts`)

**Analog for the recorder's control surface:** `src/test-utils/reorder-column-action-storybook-stub.ts`
(92 lines) — the queue/hold/settle/reset skeleton being generalized. The exact five exports the
generic recorder must subsume (lines 30-58):

```ts
const queuedOutcomes: ReorderColumnFailureStatus[] = [];
let shouldHoldNextCall = false;
let settleHeldCall: (() => void) | null = null;

export const reorderColumnActionCalls: ReorderColumnCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueReorderColumnFailure = (status) => { queuedOutcomes.push(status); };

/** Leaves the next call unresolved, so a test can observe the in-flight window an optimistic apply opens. */
export const holdNextReorderColumn = () => { shouldHoldNextCall = true; };

export const settleReorderColumn = () => { settleHeldCall?.(); settleHeldCall = null; };

export const resetReorderColumnStub = () => { /* … */ };
```

…and the hold mechanism (lines 81-92), which the generic recorder must preserve:

```ts
if (!shouldHoldNextCall) return Promise.resolve(result);
shouldHoldNextCall = false;
return new Promise((resolve) => { settleHeldCall = () => { resolve(result); }; });
```

The `queued === undefined` success default at lines 68-79 is exactly what **D-02 deletes**.

**Analog for what the plugin replaces:** `vitest.config.ts:40-99` — the 12-entry register, including
the prefix-matching comment (lines 62-66) that must be carried into the ADR amendment rather than
lost. Wiring sites: `:142` (`browser`), `:195-198` (`storybook`, alongside `plugins:
[storybookTest(...)]` — the plugin-array precedent), and `.storybook/main.ts` (19 lines, **no
`viteFinal` today** — this is RESEARCH Pattern 3's third row and the folded todo's root cause).

**Analog for D-04's global reset:** `vitest.setup.ts:44-53` — the existing centralized `afterEach`
the reset joins:

```ts
/*
 * D-04: single centralized cleanup for the "browser" project, replacing the 11 per-file
 * `document.body.innerHTML = ""` copies. Calls each render mechanism's own `cleanup()` rather
 * than a raw DOM wipe, which broke `.run()`'s next call in the same file (docs/adr/tech/0025).
 */
afterEach(async () => {
    cleanupTestingLibraryRender();
    await cleanupVitestBrowserReactRender();
    clearAllMocks();
});
```

**Analog for the four rewritten test files' import shape:** `board-view.test.tsx:11-41` — five
grouped stub imports (25 symbols) that all disappear, replaced by `actionStub(<realAction>)`. The
composed-story import at `:43` and `composeStories` block at `:45-66` stay unchanged (ADR
tech/0025).

---

### Tests: integration, e2e, probe

**Integration test analog:** `src/features/boards/actions/reorder-column-action.integration.test.ts`.
Copy its scope-contract header verbatim in structure — it records why the action itself is *not*
imported, which is the single most re-litigated question about these suites:

```ts
// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `reorderColumnAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project…
 */
```

…plus its URL builder (lines 30-48), which reproduces `openapi-fetch`'s placeholder-leaving
behaviour — directly reusable for the task paths' three missing ancestors:

```ts
/*
 * An unsupplied segment is left as its literal placeholder rather than blanked — that is what
 * `openapi-fetch`'s own serializer produces (03-RESEARCH.md Pitfall 2).
 */
const withBoard = boardId === undefined ? path : path.replace("{boardId}", boardId);
```

**E2E analog:** `e2e/columns-reorder.e2e.spec.ts` (multi-step pointer drag, announcement-gated
waits) and `e2e/server-action.ts:26-29`:

```ts
export const createServerActionSettled = (page: Page): Promise<Response> =>
    page.waitForResponse(
        (response) => response.request().method() === "POST" && "next-action" in response.request().headers(),
    );
```
Its header records the two rules that decay: **created before the click**, and never a timer.
The reorder spec's own gates are the model for a task drag: `DRAG_MOVE_STEPS = 10`,
`expectMoveAnnounced` before every drop, and `onDragStart`'s announcement as the lift gate.

**Seeding analog:** `e2e/seed.ts:39-66` (`seedColumn`) + `seed.sh`'s `cmd_column`; the one-function-
per-entity shape, `build_json`, and the `SEED_PASSWORD`/`SEED_DISPLAY_NAME` constants (`seed.sh:13-16`).

**Probe analog:** `scripts/probe-column-backend.mjs:1-50` — the never-in-CI banner and the
two-session-cap guard (`signInCounts`) are both required, not optional.

---

## Shared Patterns

### Authentication (every action)
**Source:** `src/features/boards/actions/reorder-column-action.ts:43-46` · **Apply to:** all seven actions
```ts
const record = await verifySession();
if (!record) {
    return { status: RESULT_STATUS.UNAUTHENTICATED };
}
```
`userId` comes **only** from `record.id`, never from an argument, even where the contract declares it
client-suppliable. `query: { userId: record.id }` at every call site.

### Error mapping
**Source:** `src/lib/core/api-contract/map-problem-code.ts` + `problem-detail.ts` · **Apply to:** all seven actions
```ts
const upstreamError: unknown = error;
if (upstreamError !== undefined) {
    const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);
    if (status === RESULT_STATUS.CONFLICT) refresh();   // D-12, the one new line
    return { status };
}
```
`RESULT_STATUS.CONFLICT` already exists as a distinct branch (`result-status.ts:30`); no new status.

### Validation
**Source:** `zodErrorToFieldErrors` + `.safeParse` at the action boundary · **Apply to:** all seven actions
```ts
const parsed = <x>InputSchema.safeParse({ … });
if (!parsed.success) {
    return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
}
```
RHF + `zodResolver` in the modal is UX only (`add-board-modal.tsx:47-50`).

### Toast copy tables
**Source:** `use-reorder-columns.ts:15-39` · **Apply to:** every hook that toasts
`GENERIC_<X>_FAILURE` object + `Partial<Record<ResultStatus, {title, description}>>` table +
`toast.add({ type: "danger", ...(TABLE[result.status] ?? GENERIC) })`. Authored strings only — the
action returns bare discriminants so nothing the backend said can reach a toast.

### Optimistic override + pure-derivation retirement
**Source:** `model.ts:120-150` + `use-rename-column.ts:52-68` · **Apply to:** move, update, subtask add/rename/toggle/delete
Guard on the *previous server value*; return the props array itself when stale; rollback is
`setOverride(null)`. No `useEffect` clears anything.

### Coverage pointers
**Source:** `use-reorder-columns.ts:3`, `create-board-columns-action.ts:3` · **Apply to:** every new hook and every action without its own test
`// Covered by: \`<path>\`` on line 3, gated by `scripts/check-coverage-pointers.mjs`.

### Component-folder + one-component-per-file shape
**Source:** `src/components/ui/text-field/` · **Apply to:** every new component folder
`<name>/<name>.tsx`, `<name>.stories.tsx`, `<name>.test.tsx`, optional `<name>-variants.ts`.
Enforced by `scripts/check-component-folders.mjs`, `check-tsx-declarations.mjs`,
`check-story-only-renders.mjs`, `check-no-play-functions.mjs`.

### Action verb set
**Source:** `scripts/check-action-verbs.mjs:22` · **Apply to:** all seven action filenames
`toggle` is **not** in the closed set — a subtask completion toggle is an `update-subtask-action`.

### Weight utilities
**Source:** `button-variants.ts` comment, used everywhere · **Apply to:** every new styled component
`[font-weight:var(--font-weight-{token})]`, never `font-bold`/`font-medium`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/vite-plugin-server-action-stub.mjs` | build plugin | transform | No Vite plugin is authored in this repo — every plugin used is third-party. The only source is the spike's appendix (`.planning/spikes/action-stub-automation/FINDINGS.md`), verbatim in `04-RESEARCH.md` § Code Examples. `vitest.config.ts:198` is the only in-repo `plugins:` array shape to mirror. |
| dnd-kit **multi-container** wiring (`board-view.tsx` drag rewrite) | layout component | event-driven | The repo has exactly one `DndContext` with one `SortableContext` and `closestCenter` (`board-view.tsx:201-236`). Nested per-column `SortableContext`s, `useDroppable` on a column body, an `onDragOver` cross-container preview, and a type-branched collision strategy have no precedent here. **Do not fetch this from Context7/dndkit.com** — RESEARCH Pitfall 6 verified those document the incompatible `@dnd-kit/react` rewrite. Use the installed `.d.ts` and the classic `MultipleContainers` story. |
| `BoardView`'s `ReactNode`/render-prop bridge into `SortableColumn` | layout composition | — | No render-prop component exists in the repo. Nearest structural precedents are `column-header.tsx:22-27`'s `handleProps` bundle and `board-view.tsx:224-235`'s per-item prop threading. |
| Task detail view (kebab + `Current Status` dropdown in one modal) | component | request-response | No shipped modal composes a `Menu` and a `Dropdown`. Assemble from `column-header.tsx:106-141` (Menu.Root/Trigger/Content/Item, `isDestructive`) and `dropdown.tsx` (Root/Trigger/Content/Item, `isLoading` chevron→spinner) as two separate analogs. |
| Empty-column droppable minimum-height target | component | event-driven | Nothing in the repo is a `useDroppable` non-sortable target. UI-SPEC calls this *"the likeliest regression in this phase"* (88px minimum hit area). |

---

## Metadata

**Analog search scope:** `src/features/boards/{actions,hooks,components,server}`, `src/features/auth`,
`src/features/theme`, `src/components/ui`, `src/components/layout`, `src/lib/core/api-contract`,
`src/test-utils`, `e2e/`, `scripts/`, `vitest.config.ts`, `vitest.setup.ts`, `.storybook/main.ts`,
`eslint.config.mjs` §7.
**Files scanned:** ~35 read in full or in targeted ranges; ~230 enumerated.
**Pattern extraction date:** 2026-08-28
