# Phase 3: Column Management - Pattern Map

**Mapped:** 2026-08-26
**Files analyzed:** 24 new/modified
**Analogs found:** 21 / 24

Every path below is real and was read this session. Excerpts are verbatim; line numbers are from the
files as they stand on branch `gsd/phase-03-column-management`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/boards/actions/create-column.ts` | action (server) | request-response (CRUD create) | `src/features/boards/actions/create-board.ts` + `rename-board.ts` | exact |
| `src/features/boards/actions/rename-column.ts` | action (server) | request-response (CRUD update) | `src/features/boards/actions/rename-board.ts` | exact |
| `src/features/boards/actions/reorder-column.ts` | action (server) | request-response (CRUD update) | `src/features/boards/actions/rename-board.ts` | role-match |
| `src/features/boards/actions/delete-column.ts` | action (server) | request-response (CRUD delete) | `src/features/boards/actions/delete-board.ts` | exact |
| `src/features/boards/hooks/use-create-column.ts` | hook | request-response | `src/features/boards/hooks/use-create-board.ts` | role-match (simpler — single phase, no column sub-phase) |
| `src/features/boards/hooks/use-rename-column.ts` | hook | optimistic + rollback | `src/features/boards/hooks/use-rename-board.ts` | exact |
| `src/features/boards/hooks/use-reorder-columns.ts` | hook | optimistic + rollback | `src/features/boards/hooks/use-rename-board.ts` | role-match (override is an order, not a field) |
| `src/features/boards/hooks/use-delete-column.ts` | hook | wait-for-server | `src/features/boards/hooks/use-delete-board.ts` | exact |
| `src/features/boards/components/board-view.tsx` (modified) | container component | event-driven | `src/features/boards/components/board-list.tsx` | exact (BoardList is the container template) |
| `src/features/boards/components/column-header.tsx` | presentational component | event-driven | `src/features/boards/components/board-card.tsx` | exact (kebab menu row) |
| `src/features/boards/components/add-column-modal.tsx` | presentational component | request-response (form) | `src/features/boards/components/add-board-modal.tsx` | role-match |
| `src/features/boards/components/rename-column-modal.tsx` | presentational component | request-response (form) | `src/features/boards/components/edit-board-modal.tsx` | exact |
| `src/features/boards/components/delete-column-confirm.tsx` | presentational component | request-response | `src/features/boards/components/delete-board-confirm.tsx` | exact (U-04: "mirroring exactly") |
| `src/features/boards/components/add-column-placeholder.tsx` | presentational component | event-driven | `board-list.tsx:157-165` (`+ Create New Board` button) | partial |
| `src/features/boards/model.ts` (modified) | model (pure) | transform | `src/features/boards/model.ts` (itself — same file, existing functions) | exact |
| `src/features/boards/schemas.ts` (modified) | schema | validation | `src/features/boards/schemas.ts` (`renameBoardInputSchema`, `deleteBoardInputSchema`) | exact |
| `src/lib/core/api-contract/external-paths.ts` (modified) | config | — | itself (`BOARD_DETAIL`, `BOARD_COLUMNS`) | exact |
| `src/test-utils/{create,rename,reorder,delete}-column-action-storybook-stub.ts` | test util | — | `src/test-utils/rename-board-action-storybook-stub.ts` | exact |
| `vitest.config.ts` (modified) | config | — | itself (`serverActionStubAlias`, lines 45-82) | exact |
| `src/features/boards/components/*.stories.tsx` (5 new) | story | — | `delete-board-confirm.stories.tsx`, `board-view.stories.tsx` | exact |
| `src/features/boards/components/*.test.tsx` (5 new) | test | — | `delete-board-confirm.test.tsx` | exact |
| `src/features/boards/actions/*-column.integration.test.ts` | test | request-response | `src/features/boards/actions/rename-board.integration.test.ts` | exact |
| `e2e/columns-*.e2e.spec.ts` | test | — | `e2e/boards-rename.e2e.spec.ts` | exact |
| `tokens/color.{tokens,light,dark}.tokens.json` + `tokens/style-dictionary.build.test.ts` | config + test | — | themselves (existing token entries) | exact |
| `scripts/probe-column-backend.mjs` (Wave 0) | script | request-response | `scripts/probe-board-backend.mjs` | exact (named by RESEARCH, not read this session) |

---

## Pattern Assignments

### `src/features/boards/actions/rename-column.ts` / `reorder-column.ts` / `create-column.ts` (server action, request-response)

**Analog:** `src/features/boards/actions/rename-board.ts` (delete uses `delete-board.ts`)

**Imports + result-type pattern** (`rename-board.ts:1-25`):

```ts
"use server";

import { refresh } from "next/cache";

import { BoardSchema, renameBoardInputSchema, type Board } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

export type RenameBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: Board }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };
```

**Auth-then-validate pattern — the fixed order, never deviate** (`rename-board.ts:41-59`):

```ts
const record = await verifySession();
if (!record) {
    return { status: RESULT_STATUS.UNAUTHENTICATED };
}

const parsed = renameBoardInputSchema.safeParse({ boardId, name, version });
if (!parsed.success) {
    return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
}

const { data, error } = await externalApi.PUT(EXTERNAL_PATH.BOARD_DETAIL, {
    params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
    body: { name: parsed.data.name, version: parsed.data.version },
});
```

> **Column deviation (RESEARCH Pitfall 2):** the column endpoints' generated `path` type omits
> `boardId`, and omitting it compiles and silently produces `%7BboardId%7D` in the URL. Always write
> `path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId }`.
> **Security invariant carried verbatim:** `query: { userId: record.id }` — never from the argument.

**Error handling pattern** (`rename-board.ts:61-82`):

```ts
const upstreamError: unknown = error;
if (upstreamError !== undefined) {
    return { status: mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code) };
}

const board = BoardSchema.safeParse(data);
if (!board.success) {
    return { status: RESULT_STATUS.ERROR };
}
```

Column version: `columnFullSchema` carries `tasks`, which `ColumnResponseDTO` does **not** return —
so parse the create/rename/reorder response with a new `columnSchema` (`id/name/version/position`,
i.e. `columnFullSchema.omit({ tasks: true })`), not with `columnFullSchema`.

**Success pattern** (`rename-board.ts:84-90`): `refresh()` from `next/cache` **inside the action**,
then return. Do **not** add `router.refresh()` in the hook (RESEARCH Pitfall 7 — CONVENTIONS.md is
stale here; follow the shipped code).

**Delete variant** (`delete-board.ts:44-64`): no response body, so no `safeParse` on the way back,
and it returns a bare `RESULT_STATUS.ERROR` rather than routing through `mapProblemCodeToStatus`:

```ts
const { error } = await externalApi.DELETE(EXTERNAL_PATH.BOARD_DETAIL, {
    params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
});

const upstreamError: unknown = error;
if (upstreamError !== undefined) {
    return { status: RESULT_STATUS.ERROR };
}

refresh();
return { status: RESULT_STATUS.SUCCESS };
```

> `delete-column.ts` should **not** copy this last part verbatim: UI-SPEC requires a distinct
> version-conflict branch, so route through `mapProblemCodeToStatus(parseProblemDetail(...)?.code)`
> like `rename-board.ts` does and add `CONFLICT`/`NOT_FOUND` to the result union.

---

### `src/features/boards/hooks/use-rename-column.ts` and `use-reorder-columns.ts` (hook, optimistic + rollback)

**Analog:** `src/features/boards/hooks/use-rename-board.ts` — the named reference for the
override-plus-derivation shape. There is **no query cache to patch** (ADR tech/0019).

**Copy-table pattern** (`use-rename-board.ts:11-36`) — copy tables live in the `.ts` hook file, never
in a `.tsx` (`pnpm tsx:check`):

```ts
const GENERIC_RENAME_FAILURE = { title: "Couldn't rename board.", description: "Try again." };

const RENAME_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.DUPLICATE]: {
        title: "A board with that name already exists.",
        description: "Choose a different name.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: { title: "Your session has expired.", description: "..." },
    [RESULT_STATUS.NOT_FOUND]: { title: "That board is no longer available.", description: "..." },
};
```

> Column deviation: `RESULT_STATUS.CONFLICT` is deliberately **absent** from the board table
> (`use-rename-board.ts:18-22` explains why). For columns it must be **present**, carrying UI-SPEC's
> "This board changed somewhere else." / "Refresh to see the latest."

**Override type + pure derivation** (`use-rename-board.ts:40-80`):

```ts
export type RenameOverride = { boardId: string; previousName: string; name: string };

export const applyRenameOverride = ({
    boards,
    override,
}: {
    boards: Board[];
    override: RenameOverride | null;
}): Board[] => {
    if (override === null) {
        return boards;
    }

    return boards.map((board) =>
        board.id === override.boardId && board.name === override.previousName
            ? { ...board, name: override.name }
            : board,
    );
};
```

**Core optimistic mutation pattern** (`use-rename-board.ts:87-123`):

```ts
export const useRenameBoard = ({ boards }: { boards: Board[] }) => {
    const toast = useToast();
    const [localOverride, setLocalOverride] = useState<RenameOverride | null>(null);
    const mutation = useMutation({ mutationFn: renameBoardAction, retry: false });

    const renameBoard = async ({ boardId, name, version }: RenameBoardArgs): Promise<{ didRename: boolean }> => {
        const previousName = boards.find((board) => board.id === boardId)?.name ?? name;

        setOverride({ boardId, previousName, name });

        const result = await mutation
            .mutateAsync({ boardId, name, version })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            setOverride(null);
            toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[result.status] ?? GENERIC_RENAME_FAILURE) });
            return { didRename: false };
        }

        return { didRename: true };
    };

    return { renameBoard, isPending: mutation.isPending, boards: applyRenameOverride({ boards, override }) };
};
```

Load-bearing details to carry: `.catch(() => ({ status: RESULT_STATUS.ERROR }) as const)` on every
`mutateAsync`; `retry: false`; the override is left in place on success and retires itself when the
refreshed props no longer match `previous…`; the hook returns the **derived** list, not the raw one.

**Reorder deviation:** the override is an order, not a field. Put `applyColumnOrderOverride` in
`model.ts` (it is pure — see the `model.ts` section), not in the hook, so the unit test asserts it
without rendering. The hook keeps only the `useState`/`mutateAsync`/`toast`/rollback wrapper above.

---

### `src/features/boards/hooks/use-delete-column.ts` (hook, wait-for-server)

**Analog:** `src/features/boards/hooks/use-delete-board.ts` — never optimistic (`use-delete-board.ts:19-23`
records exactly why, and ADR domain/0002 applies one containment level down for columns).

**Core pattern** (`use-delete-board.ts:12-37`):

```ts
const DELETE_FAILURE_COPY = { title: "Couldn't delete board.", description: "Try again." };

const mutation = useMutation({ mutationFn: deleteBoardAction, retry: false });

const deleteBoard = async ({ boardId }: { boardId: string }): Promise<{ didDelete: boolean }> => {
    const result = await mutation.mutateAsync({ boardId }).catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

    if (result.status !== RESULT_STATUS.SUCCESS) {
        toast.add({ type: "danger", ...DELETE_FAILURE_COPY });
        return { didDelete: false };
    }
    ...
```

Drop the `resolveDestinationAfterDelete`/`router.replace` tail — deleting a column never navigates.
Add the `CONFLICT` branch UI-SPEC requires.

---

### `src/features/boards/hooks/use-create-column.ts` (hook, request-response)

**Analog:** `src/features/boards/hooks/use-create-board.ts` — but copy only its **inline-error**
mechanism, not its two-phase/retry-toast orchestration (that is board-create-specific).

**Inline-error pattern** (`use-create-board.ts:14-28`, `55`, `60-62`, `118-125`):

```ts
const GENERIC_CREATE_FAILURE_MESSAGE = "Couldn't create board. Try again.";

const CREATE_FAILURE_MESSAGE: Partial<Record<ResultStatus, string>> = {
    [RESULT_STATUS.DUPLICATE]: "A board with that name already exists. Choose a different name.",
    [RESULT_STATUS.UNAUTHENTICATED]: "Your session has expired. Sign in again to create a board.",
};

const [errorMessage, setErrorMessage] = useState<string | null>(null);
const clearError = (): void => { setErrorMessage(null); };

// ...
if (result.status !== RESULT_STATUS.SUCCESS) {
    setErrorMessage(CREATE_FAILURE_MESSAGE[result.status] ?? GENERIC_CREATE_FAILURE_MESSAGE);
    return { didCreate: false };
}
```

D-03's 8-column toast nudge has no analog — the closest shipped toast-from-a-hook call is
`use-create-board.ts:93-107` (`toast.add({ id, type, title, timeout, actionProps })`). The nudge
needs no `id`/`timeout: 0`; a plain `toast.add({ type, title, description })` matches
`use-rename-board.ts:109`.

---

### `src/features/boards/components/delete-column-confirm.tsx` (presentational component)

**Analog:** `src/features/boards/components/delete-board-confirm.tsx` — U-04 says "mirroring exactly".
Copy the whole file and change the nouns.

**Props contract** (`delete-board-confirm.tsx:9-21`) — the ADR tech/0020 reason for `onSubmit` as a prop:

```tsx
type Props = {
    board: Board;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: { boardId: string }) => void;
    isPending: boolean;
};

/**
 * D-06's plain confirm modal — no type-the-name-to-confirm step. Deliberately takes `onSubmit` as a
 * prop rather than calling `useDeleteBoard()` itself, so its behavioural tests drive it with a real
 * local function instead of a module mock, which is banned outside stories (docs/adr/tech/0020).
 */
```

**Focus + dismissal guard pattern** (`delete-board-confirm.tsx:27-43`):

```tsx
const keepBoardRef = useRef<HTMLButtonElement>(null);

const handleOpenChange = (nextIsOpen: boolean): void => {
    if (isPending) {
        return;
    }
    onOpenChange(nextIsOpen);
};

return (
    <Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange} isDismissableOnBackdropClick={!isPending}>
        <Modal.Content initialFocus={keepBoardRef}>
```

**Body + footer pattern** (`delete-board-confirm.tsx:44-79`):

```tsx
<div className="flex flex-col gap-6">
    <Modal.Title className="text-text-danger">Delete this board?</Modal.Title>

    <Modal.Description className="break-words">
        {`Are you sure you want to delete the '${board.name}' board? ...`}
    </Modal.Description>

    <Modal.Footer>
        <Button type="button" variant="destructive" isLoading={isPending} className="w-full"
            onClick={() => { onSubmit({ boardId: board.id }); }}>
            Delete Board
        </Button>

        <Button ref={keepBoardRef} type="button" variant="secondary" className="w-full"
            onClick={() => { handleOpenChange(false); }}>
            Keep Board
        </Button>
    </Modal.Footer>
</div>
```

---

### `src/features/boards/components/rename-column-modal.tsx` (presentational component, form)

**Analog:** `src/features/boards/components/edit-board-modal.tsx` — single-field RHF + zodResolver.

**Form pattern** (`edit-board-modal.tsx:27-37`, `51-84`):

```tsx
const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<EditBoardFormValues>({
    resolver: zodResolver(editBoardFormSchema),
    mode: "onTouched",
    defaultValues: { name: board.name },
});

const nameErrorMessage = forceNameError ?? errors.name?.message;

// ...
<form
    noValidate
    onSubmit={(event) => {
        void handleSubmit((values) => {
            onSubmit({ boardId: board.id, name: values.name, version: board.version });
        })(event);
    }}
    className="flex flex-col gap-6"
>
    <Modal.Title>Edit Board</Modal.Title>

    <TextField
        label="Board Name"
        type="text"
        placeholder="e.g. Web Design"
        hasError={Boolean(nameErrorMessage)}
        errorMessage={nameErrorMessage}
        {...register("name")}
    />

    <Modal.Footer>
        <Button type="submit" variant="primary" isLoading={isPending} className="w-full">
            Save Changes
        </Button>
    </Modal.Footer>
</form>
```

Note `forceNameError?: string` — the Storybook-only staging prop (`edit-board-modal.tsx:17-18`) that
lets a story render the error state with no real submit. `add-column-modal.tsx` follows the same
shape (`add-board-modal.tsx:55-105`) plus `use-create-column`'s `errorMessage` rendered as the
still-open modal's inline alert.

---

### `src/features/boards/components/column-header.tsx` (presentational component, event-driven)

**Analog:** `src/features/boards/components/board-card.tsx` — the shipped kebab-menu row.

**Menu pattern** (`board-card.tsx:55-97`) — `Menu.Trigger render={<IconButton .../>}`, `isDisabled`,
`isDestructive`:

```tsx
<Menu.Root defaultOpen={defaultIsMenuOpen}>
    <Menu.Trigger
        render={
            <IconButton
                label={`Board actions for ${board.name}`}
                icon={<EllipsisVertical />}
                className={cn("absolute top-1/2 right-6 -translate-y-1/2", ...)}
            />
        }
    />

    <Menu.Content>
        <Menu.Item isDisabled={isEditDisabled} onClick={() => { onEdit(board); }}>
            Edit Board
        </Menu.Item>

        <Menu.Item isDestructive onClick={() => { onDelete(board); }}>
            Delete Board
        </Menu.Item>
    </Menu.Content>
</Menu.Root>
```

Also carry `defaultIsMenuOpen?: boolean` (`board-card.tsx:20-21`) — the Storybook-only staging prop
that opens the menu without a play function (`pnpm stories:check` bans play functions).

**Typography/weight + truncation pattern** (`board-card.tsx:46-52`, and `board-view.tsx:44-49` for the
caption itself):

```tsx
className="sticky top-0 bg-bg-app pb-6 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase"
// ...
<span className="truncate">{board.name}</span>
```

Never `font-bold`/`font-medium` — always `[font-weight:var(--font-weight-{token})]`.

---

### `src/features/boards/components/board-view.tsx` (modified — becomes the container)

**Analog:** `src/features/boards/components/board-list.tsx` — the container template.

**Container state pattern** (`board-list.tsx:1-16`, `41-76`):

```tsx
"use client";
// ...
import { useBoolean } from "usehooks-ts";

const { value: isAddBoardOpen, setValue: setIsAddBoardOpen, setFalse: closeAddBoard } =
    useBoolean(defaultIsAddBoardOpen);
const [boardBeingRenamed, setBoardBeingRenamed] = useState<Board | null>(
    defaultRenameTargetIndex === undefined ? null : (boards[defaultRenameTargetIndex] ?? null),
);
const [pendingRenameBoardId, setPendingRenameBoardId] = useState<string | null>(null);
const [boardBeingDeleted, setBoardBeingDeleted] = useState<Board | null>(...);

const { renameBoard, isPending: isRenamePending, boards: renderedBoards } = useRenameBoard({ boards });
const { deleteBoard, isPending: isDeletePending } = useDeleteBoard({ boards, currentBoardId: ... });
const { createBoard, isPending, errorMessage, clearError } = useCreateBoard();
```

**Storybook-staging props pattern** (`board-list.tsx:26-31`) — this is how modal-open states get
staged without a play function; copy it for the column modals:

```tsx
/** Storybook-only staging for the create modal's open state — no real caller passes this. */
defaultIsAddBoardOpen?: boolean;
/** Storybook-only staging — seeds the rename modal open on the board at this index. */
defaultRenameTargetIndex?: number;
/** Storybook-only staging — seeds the delete confirmation open on the board at this index. */
defaultDeleteTargetIndex?: number;
```

**Submit-handler pattern, incl. the scoped-pending trick** (`board-list.tsx:87-113`):

```tsx
const handleSubmit = (values: AddBoardSubmitValues): void => {
    void createBoard({ name: values.name, columnRows: values.columns }).then((outcome) => {
        if (outcome.didCreate) { closeAddBoard(); }
    });
};

const handleRenameSubmit = (values: RenameBoardArgs): void => {
    setPendingRenameBoardId(values.boardId);
    void renameBoard(values).finally(() => { setPendingRenameBoardId(null); });
    setBoardBeingRenamed(null);
};

const handleDeleteSubmit = (values: { boardId: string }): void => {
    void deleteBoard(values).finally(() => { setBoardBeingDeleted(null); });
};
```

**Keyed conditional-modal pattern** (`board-list.tsx:176-206`) — the modal is unmounted when there is
no target and keyed on the target's id so reopening on another row reseeds it:

```tsx
{boardBeingDeleted === null ? null : (
    <DeleteBoardConfirm
        key={boardBeingDeleted.id}
        board={boardBeingDeleted}
        isOpen
        onOpenChange={(nextIsOpen) => { if (!nextIsOpen) { setBoardBeingDeleted(null); } }}
        onSubmit={handleDeleteSubmit}
        isPending={isDeletePending}
    />
)}
```

**What is being replaced** (`board-view.tsx:28-49`) — the current markup this phase edits:

```tsx
<div className="flex min-h-0 flex-1 gap-6 overflow-x-auto bg-bg-app p-6">
    {board.columns.map((column) => (
        <section
            key={column.id}
            tabIndex={0}                                    // ← REMOVE (RESEARCH Pitfall 10)
            aria-labelledby={`board-column-${column.id}`}
            className="flex w-70 shrink-0 flex-col overflow-y-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
        >
            <h2 id={`board-column-${column.id}`} className="sticky top-0 bg-bg-app pb-6 font-heading-s ...">
                {toColumnCaption({ name: column.name, taskCount: column.tasks.length })}
            </h2>
```

`board-view.tsx:4-7` and `13-18` also carry the "dead control is worse than no control" comments that
this phase's CTA wiring makes obsolete — update, don't leave stale.

**No analog for:** `DndContext`/`SortableContext` composition and `AddColumnPlaceholder`'s gradient
ghost column. Use RESEARCH.md's Code Examples section (lines 528-563) verbatim, including the
mandatory `id={\`board-columns-${board.id}\`}` (Pitfall 3). Nearest shipped shape for the ghost
column's button is `board-list.tsx:157-165`.

---

### `src/features/boards/model.ts` (modified — pure functions)

**Analog:** the same file. Existing shapes to match — one exported arrow function per concept, a
one-line JSDoc naming the decision, object-destructured params:

```ts
/** The ALL-CAPS column caption with its task count, as the PDF renders it ("TODO (4)"). */
export const toColumnCaption = ({ name, taskCount }: { name: string; taskCount: number }): string =>
    `${name} (${String(taskCount)})`;

/** The board list as it will read once a delete lands, with the rest left in the order given. */
export const removeBoard = ({ boards, boardId }: { boards: Board[]; boardId: string }): Board[] =>
    boards.filter((board) => board.id !== boardId);
```

Note `${String(taskCount)}` — bare numeric interpolation trips `restrict-template-expressions`
(`model.ts:31-35` records this and is why `buildColumnRowPath` lives here at all). New additions:
`toColumnDotToken`, `applyColumnOrderOverride`, `reorderColumns`,
`createColumnReorderAnnouncements` (the last one because `.tsx` may not declare it — Pitfall 8).

---

### `src/features/boards/schemas.ts` (modified — input schemas)

**Analog:** the same file, `schemas.ts:82-99`:

```ts
/*
 * `version` is required here because the board *update* body requires it while the create body has
 * no such field — a rename built by analogy to create is rejected on every attempt.
 */
export const renameBoardInputSchema = z.object({
    boardId: z.string().min(1),
    name: boardNameSchema,
    version: z.number().int(),
});

export type RenameBoardInput = z.infer<typeof renameBoardInputSchema>;

export const deleteBoardInputSchema = z.object({ boardId: z.string().min(1) });
```

**Reuse, do not re-derive** (`schemas.ts:110-118`):

```ts
const COLUMN_NAME_LENGTH_MESSAGE = "Column name must be between 3 and 32 characters.";

/** The backend's own enforced bounds, mirrored verbatim (02-BACKEND-FACTS.md P6). */
export const columnNameSchema = z.string().trim().min(3, ...).max(32, ...);
```

New: `createColumnInputSchema` (`{ boardId, name: columnNameSchema }`), `renameColumnInputSchema`,
`reorderColumnInputSchema` (`targetPosition: z.number().int().min(0)`), `deleteColumnInputSchema`,
plus a `columnSchema` (no `tasks`) for parsing `ColumnResponseDTO`, and the RHF form schemas
(`addColumnFormSchema` / `renameColumnFormSchema`) modelled on `editBoardFormSchema` (`schemas.ts:105`).

---

### `src/lib/core/api-contract/external-paths.ts` (modified)

**Analog:** itself:

```ts
export const EXTERNAL_PATH = {
    BOARDS: "/boards",
    BOARD_DETAIL: "/boards/{boardId}",
    BOARD_FULL: "/boards/{boardId}/full",
    BOARD_COLUMNS: "/boards/{boardId}/columns",
    ...
} as const;
```

Add `COLUMN_DETAIL: "/boards/{boardId}/columns/{columnId}"` and
`COLUMN_REORDER: "/boards/{boardId}/columns/{columnId}/reorder"`. `BOARD_COLUMNS` already exists —
reuse it for create.

---

### `src/test-utils/{create,rename,reorder,delete}-column-action-storybook-stub.ts`

**Analog:** `src/test-utils/rename-board-action-storybook-stub.ts` — copy the whole queue/hold/reset
shape verbatim (this is the file RESEARCH names as the reference).

**Module-state pattern** (`rename-board-action-storybook-stub.ts:28-60`):

```ts
const queuedOutcomes: RenameBoardFailureStatus[] = [];
let shouldHoldNextCall = false;
let settleHeldCall: (() => void) | null = null;

export const renameBoardActionCalls: RenameBoardCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueRenameBoardFailure = (status: RenameBoardFailureStatus): void => {
    queuedOutcomes.push(status);
};

/** Leaves the next call unresolved, so a test can observe the in-flight window an optimistic apply opens. */
export const holdNextRenameBoard = (): void => { shouldHoldNextCall = true; };

export const settleRenameBoard = (): void => { settleHeldCall?.(); settleHeldCall = null; };

export const resetRenameBoardStub = (): void => {
    queuedOutcomes.length = 0;
    renameBoardActionCalls.length = 0;
    shouldHoldNextCall = false;
    settleHeldCall = null;
};
```

**Call pattern** (`rename-board-action-storybook-stub.ts:62-82`):

```ts
export const renameBoardAction = ({ boardId, name, version }: RenameBoardCall): Promise<RenameBoardResult> => {
    renameBoardActionCalls.push({ boardId, name, version });

    const queued = queuedOutcomes.shift();
    const result: RenameBoardResult =
        queued === undefined
            ? { status: RESULT_STATUS.SUCCESS, board: { id: boardId, name, version: version + 1 } }
            : { status: queued };

    if (!shouldHoldNextCall) { return Promise.resolve(result); }
    shouldHoldNextCall = false;

    return new Promise((resolve) => { settleHeldCall = () => { resolve(result); }; });
};
```

The result type is **re-declared locally** (lines 9-16), not imported from the real action — that is
deliberate and must be repeated.

---

### `vitest.config.ts` (modified — `serverActionStubAlias`)

**Analog:** itself, `vitest.config.ts:45-82`:

```ts
/*
 * The columns entry must precede the board one — Vite matches a string `find` by prefix, so
 * `create-board` would otherwise swallow `create-board-columns` too.
 */
{
    find: "@/features/boards/actions/create-board-columns",
    replacement: path.resolve(rootDir, "src/test-utils/create-board-columns-action-storybook-stub.ts"),
},
{
    find: "@/features/boards/actions/create-board",
    replacement: path.resolve(rootDir, "src/test-utils/create-board-action-storybook-stub.ts"),
},
```

The four new entries (`create-column`, `rename-column`, `reorder-column`, `delete-column`) share no
prefix with each other or with the existing board entries, so plain appends are safe — but re-check
that rule when adding, per the shipped comment. The alias list is applied at `vitest.config.ts:120`
(`browser` project) and again for `storybook`.

---

### Stories files (`*.stories.tsx`, 5 new)

**Analog:** `src/features/boards/components/delete-board-confirm.stories.tsx` (modal) and
`board-view.stories.tsx` (board-view-level).

**Meta pattern** (`delete-board-confirm.stories.tsx:1-31`):

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { createBoard } from "@/test-utils/factories/board";

import { DeleteBoardConfirm } from "./delete-board-confirm";

/*
 * Visual-only CSF3 (D-25). Both handlers are `fn()` spies so a test asserts by reading these args,
 * never by spreading props onto a composed story.
 */
const meta: Meta<typeof DeleteBoardConfirm> = {
    component: DeleteBoardConfirm,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        board: createBoard({ id: "8okxhwo6oq2o", name: "Platform Launch", version: 3 }),
        isOpen: true,
        isPending: false,
        onOpenChange: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof DeleteBoardConfirm>;

export const Default: Story = {};
export const Deleting: Story = { args: { isPending: true } };
```

**Stateful-host pattern for a state the component does not own** (`delete-board-confirm.stories.tsx:41-63`)
— note the host lives in the **stories** file, not the test file (ADR tech/0025):

```tsx
const SettlingHost = (props: ComponentProps<typeof DeleteBoardConfirm>) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <DeleteBoardConfirm {...props} isOpen={isOpen} onOpenChange={setIsOpen}
            onSubmit={(values) => { props.onSubmit(values); setIsOpen(false); }} />
    );
};

export const SubmitSettles: Story = { render: (args) => <SettlingHost {...args} /> };
```

**Bounded-height decorator + factory-driven args** (`board-view.stories.tsx:12-42`) — the shape the
new column stories should reuse, including `createColumnsFull({ count, taskCount })`:

```tsx
const meta: Meta<typeof BoardView> = {
    component: BoardView,
    parameters: { layout: "fullscreen" },
    decorators: [(Story) => (<div className="flex h-150 flex-col"><Story /></div>)],
};

export const ManyColumns: Story = { args: { board: createBoardFull({ columns: createColumnsFull({ count: 8 }) }) } };
```

No play functions anywhere (`pnpm stories:check`).

---

### Test files (`*.test.tsx`, 5 new)

**Analog:** `src/features/boards/components/delete-board-confirm.test.tsx`.

**Imports + composition pattern** (`delete-board-confirm.test.tsx:1-15`) — `pnpm renders:check`
requires new tests render composed stories, never manual props:

```tsx
/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./delete-board-confirm.stories";

const { Default, Deleting, LongBoardName, SubmitSettles } = composeStories(stories);
```

**Suite + Arrange/Act/Assert pattern** (`delete-board-confirm.test.tsx:35-66`):

```tsx
describeForEachDevice({
    name: "DeleteBoardConfirm modal",
    body: () => {
        it("renders the Copywriting Contract's confirmation title", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Delete this board?" })).toBeVisible();
        });
```

---

### Integration tests (`src/features/boards/actions/*-column.integration.test.ts`)

**Analog:** `src/features/boards/actions/rename-board.integration.test.ts`.

Key structural facts carried over (`rename-board.integration.test.ts:1-32`): it deliberately does
**not** import the action (`verifySession()`/`refresh()` cannot run in the `node` project); it dials
the real deployed backend with `process.env.EXTERNAL_API_BASE_URL`; it resolves `EXTERNAL_PATH`
templates itself; it signs up once and reuses the sign-up response's `JSESSIONID` because the backend
caps an account at two concurrent sessions; and it carries a `// comment-length-exempt:` line for its
scope-contract docblock (`pnpm comments:check`).

```ts
const buildUpstreamUrl = ({ path, boardId = "", userId }: { path: string; boardId?: string; userId: string }): string =>
    `${baseUrl}${path.replace("{boardId}", boardId)}?userId=${userId}`;
```

Extend this helper to also replace `{columnId}` — and per Pitfall 2, the column integration test is
the **only** thing that catches a dropped `boardId`, so assert the resolved URL or a real 2xx.

---

### `e2e/columns-*.e2e.spec.ts`

**Analog:** `e2e/boards-rename.e2e.spec.ts` — `seedAccount()`/`seedBoard()` (and `seedColumn()`,
already present in `e2e/seed.ts`), sign in through the real form, structural assertions only
(ADR tech/0022), `randomUUID().slice(0, 8)` name suffixes, `// comment-length-exempt:` on the scope
docblock. Its menu-driving lines are the exact template for a column kebab:

```ts
await sidebar.getByRole("button", { name: `Board actions for ${originalName}` }).click();
await page.getByRole("menuitem", { name: "Edit Board" }).click();
```

---

### `tokens/color.{tokens,light,dark}.tokens.json` (+ build test)

**Analog:** the same files. Two-layer DTCG structure — a raw palette entry in `color.tokens.json`,
then a semantic alias per theme:

```jsonc
// tokens/color.tokens.json — raw value + a $description recording the evidence
"purple": {
    "500": { "$type": "color", "$value": "#635FC7", "$description": "Primary CTA background, ..." }
}
```

```jsonc
// tokens/color.light.tokens.json — semantic alias referencing the raw entry
"bg": {
    "primary": { "$type": "color", "$value": "{color.purple.500}", "$description": "Primary CTA background" }
}
```

The five UI-SPEC tokens are theme-identical for the three dots and theme-split for the two gradient
stops, so the dots get one raw entry each aliased identically in both theme files. `$description`
must record the PDF page + sampled coordinate (matching how the existing entries record their
contrast-adjustment rationale). Assertions go in `tokens/style-dictionary.build.test.ts`, whose
`buildFullCss()` helper (lines 38-45) concatenates light + dark output for a single string match.

---

## Shared Patterns

### Server-action security triad
**Source:** `src/features/boards/actions/rename-board.ts:41-58`
**Apply to:** all four new column actions
1. `const record = await verifySession(); if (!record) return { status: RESULT_STATUS.UNAUTHENTICATED };` — first line, always.
2. `zodSchema.safeParse(...)` of the action's **own arguments**, after the session check.
3. `query: { userId: record.id }` — never from the argument.

### Bare-discriminant error contract
**Source:** `src/lib/core/api-contract/{result-status,map-problem-code,problem-detail}.ts`, used at `rename-board.ts:65-72`
**Apply to:** all four actions + all four hooks
Actions return only `RESULT_STATUS` discriminants; **all** user-facing copy is authored in the hook's
copy table. No upstream `detail` string ever reaches a toast.

```ts
const upstreamError: unknown = error;
if (upstreamError !== undefined) {
    return { status: mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code) };
}
```

### `refresh()` inside the action, not `router.refresh()` in the hook
**Source:** `rename-board.ts:88`, `delete-board.ts:61`, and the rationale at `use-delete-board.ts:39-42`
**Apply to:** all four actions. Follow the shipped code, not CONVENTIONS.md (RESEARCH Pitfall 7).

### Presentational component + container
**Source:** `delete-board-confirm.tsx:17-21` (the docstring states the reason)
**Apply to:** all five new components
Modals/headers take `isOpen`/`onOpenChange`/`onSubmit`/`isPending` and call no hook of their own,
because ADR tech/0020 bans `vi.mock` outside stories.

### Base UI Dialog double-guard
**Source:** `delete-board-confirm.tsx:29-42`, repeated verbatim in `edit-board-modal.tsx:39-52` and `add-board-modal.tsx:67-79`
**Apply to:** all three new modals — `if (isPending) return;` in `handleOpenChange` **and**
`isDismissableOnBackdropClick={!isPending}`. Both are required; Escape ignores the backdrop prop.

### Storybook-only staging props
**Source:** `board-list.tsx:26-31`, `board-card.tsx:20-21`, `edit-board-modal.tsx:17-18`
**Apply to:** every new component with internal state a story needs to reach. Prefixed `default*` or
`force*`, JSDoc'd as Storybook-only. This is what replaces the banned play function.

### `mutateAsync` failure normalisation
**Source:** `use-rename-board.ts:102-104`, `use-delete-board.ts:30`, `use-create-board.ts:69-71`
**Apply to:** every hook
```ts
const result = await mutation.mutateAsync(args).catch(() => ({ status: RESULT_STATUS.ERROR }) as const);
```
with `useMutation({ mutationFn, retry: false })`.

### Font-weight arbitrary property
**Source:** `board-view.tsx:46`, `board-card.tsx:46`, `board-list.tsx:117`
**Apply to:** every new `.tsx`. `[font-weight:var(--font-weight-{token})]`, never `font-bold`/`font-medium`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `board-view.tsx`'s `DndContext`/`SortableContext` block | container | event-driven | No drag-and-drop exists anywhere in the repo. Use RESEARCH.md Code Examples (lines 528-583) — sensors, the mandatory `DndContext id`, `horizontalListSortingStrategy`, `handleDragEnd`. |
| `column-header.tsx`'s `useSortable` wiring | component | event-driven | Same. `setActivatorNodeRef` on the header `<button>` only (RESEARCH lines 382, 556-563). |
| `add-column-placeholder.tsx` | component | event-driven | No gradient ghost surface exists. UI-SPEC "The `+ New Column` ghost column" section is the full spec; nearest shipped button shape is `board-list.tsx:157-165`. |
| `model.ts`'s `createColumnReorderAnnouncements` | model | transform | No live-region factory exists. UI-SPEC Copywriting Contract's announcement strings + dnd-kit's `Announcements` type. |
| D-04 post-create auto-scroll | component | — | No scroll-into-view code in the repo. RESEARCH line 605-607 prescribes `scrollIntoView({ inline: "end", block: "nearest" })` with no `behavior`, plus `scroll-smooth motion-reduce:scroll-auto` on the row. |

---

## Metadata

**Analog search scope:** `src/features/boards/**`, `src/test-utils/**`, `src/lib/core/api-contract/**`,
`src/components/ui/**` (referenced), `tokens/**`, `e2e/**`, `vitest.config.ts`
**Files scanned:** 68 listed, 18 read in full or in targeted ranges
**Pattern extraction date:** 2026-08-26
