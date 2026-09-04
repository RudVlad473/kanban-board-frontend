import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";

import type { Subtask, Task, TaskFull } from "@/lib/core/api-contract/task-schemas";
import { buildColumnBodyDroppableId } from "@/lib/core/drag/drag-items";

/*
 * The promotion rule covers contract SHAPES, and a caption formatter is presentation rather than
 * a shape — so `toSubtaskSummary` lands here rather than in the core ring, moved out of the boards
 * feature because after D-18 the tasks feature is its only consumer.
 */

/** The task card's meta line in the design's own "X of Y subtasks" wording (04-UI-SPEC Typography). */
export const toSubtaskSummary = (subtasks: { isCompleted: boolean }[]): string => {
    const completedCount = subtasks.filter((subtask) => subtask.isCompleted).length;

    return `${String(completedCount)} of ${String(subtasks.length)} subtasks`;
};

/**
 * The detail view's own parenthesised caption (Copywriting Contract "Detail view subtasks
 * caption"). Suppression at zero subtasks is the CALL SITE's decision, matching `toSubtaskSummary`.
 */
export const toSubtaskDetailCaption = (subtasks: { isCompleted: boolean }[]): string => {
    const completedCount = subtasks.filter((subtask) => subtask.isCompleted).length;

    return `Subtasks (${String(completedCount)} of ${String(subtasks.length)})`;
};

/**
 * The smallest column shape every derivation below reads. Declared structurally rather than as
 * `ColumnFull`, which lives in the boards feature this one may not import.
 */
export type TaskColumn = { id: string; tasks: TaskFull[] };

// comment-length-exempt: records the one index the wire semantics can be lost at, and the case that distinguishes the two readings — a correctness fact a future reader would otherwise re-derive (docs/adr/tech/0023)
/**
 * `targetPosition` for a completed drag: the moved task's FINAL 0-based index in the destination,
 * which T3 confirmed is what the backend means by the field. Computed against the destination with
 * the dragged task already removed, plus one step when the move is DOWNWARD inside a single column —
 * without that step a card dropped on the card below it lands back where it started. `overTaskId` is
 * null when the drop landed on the column body rather than on a card, which means "append".
 *
 * A CROSS-column drop has no such direction to read — the dragged card was never in this list, so
 * the step comes from `insertsAfterOverTask`, which the caller resolves from where the card
 * actually settled. Without it the last slot of a non-empty column is unreachable: hovering below
 * the last card still collides with that card, and every drop resolved to the index BEFORE it.
 */
export const toTaskMoveTargetPosition = ({
    destinationTaskIds,
    taskId,
    overTaskId,
    insertsAfterOverTask = false,
}: {
    destinationTaskIds: string[];
    taskId: string;
    overTaskId: string | null;
    insertsAfterOverTask?: boolean;
}): number => {
    const remaining = destinationTaskIds.filter((id) => id !== taskId);

    if (overTaskId === null) {
        return remaining.length;
    }

    const indexAfterRemoval = remaining.indexOf(overTaskId);
    if (indexAfterRemoval === -1) {
        return remaining.length;
    }

    const activeIndex = destinationTaskIds.indexOf(taskId);

    if (activeIndex === -1) {
        return insertsAfterOverTask ? indexAfterRemoval + 1 : indexAfterRemoval;
    }

    const overIndex = destinationTaskIds.indexOf(overTaskId);

    return activeIndex < overIndex ? indexAfterRemoval + 1 : indexAfterRemoval;
};

/**
 * The board as it reads with one move already applied — the reducer behind `useMoveTask`'s
 * optimistic write. A task id the board no longer holds yields the input untouched.
 */
export const moveTaskInColumns = <C extends TaskColumn>({
    columns,
    taskId,
    targetColumnId,
    targetIndex,
}: {
    columns: C[];
    taskId: string;
    targetColumnId: string;
    targetIndex: number;
}): C[] => {
    const movedTask = columns.flatMap((column) => column.tasks).find((task) => task.id === taskId);

    if (movedTask === undefined) {
        return columns;
    }

    return columns.map((column) => {
        if (column.id === targetColumnId) {
            const remaining = column.tasks.filter((task) => task.id !== taskId);

            return {
                ...column,
                tasks: [...remaining.slice(0, targetIndex), movedTask, ...remaining.slice(targetIndex)],
            };
        }

        return column.tasks.some((task) => task.id === taskId)
            ? { ...column, tasks: column.tasks.filter((task) => task.id !== taskId) }
            : column;
    });
};

/*
 * Prefixed `with`, never `apply`: the `apply*` name made a reviewer read these live `setQueryData`
 * reducers as ADR 0029's deleted render-time `apply*Pending*` folds (docs/adr/tech/0030).
 */

/**
 * The board as it reads with one subtask's completion already flipped — the reducer behind
 * `useToggleSubtask`'s optimistic write. A subtask id the board no longer holds yields the input
 * untouched, mirroring `moveTaskInColumns`.
 */
export const withSubtaskCompletion = <C extends TaskColumn>({
    columns,
    taskId,
    subtaskId,
    isCompleted,
}: {
    columns: C[];
    taskId: string;
    subtaskId: string;
    isCompleted: boolean;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
            task.id === taskId
                ? {
                      ...task,
                      subtasks: task.subtasks.map((subtask) =>
                          subtask.id === subtaskId ? { ...subtask, isCompleted } : subtask,
                      ),
                  }
                : task,
        ),
    }));

/**
 * The board as it reads with one task's title and description already applied — the reducer behind
 * `useUpdateTask`'s optimistic write. A task id the board no longer holds yields the input untouched,
 * mirroring `moveTaskInColumns` and `withSubtaskCompletion`.
 */
export const withTaskUpdate = <C extends TaskColumn>({
    columns,
    taskId,
    title,
    description,
}: {
    columns: C[];
    taskId: string;
    title: string;
    description?: string;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, title, description } : task)),
    }));

/**
 * The board as it reads with one task already appended to a column — the reducer behind
 * `useCreateTask`'s optimistic insert. A columnId the board no longer holds yields the input
 * untouched, mirroring `moveTaskInColumns`.
 */
export const withTaskInsert = <C extends TaskColumn>({
    columns,
    columnId,
    task,
}: {
    columns: C[];
    columnId: string;
    task: TaskFull;
}): C[] => columns.map((column) => (column.id === columnId ? { ...column, tasks: [...column.tasks, task] } : column));

/**
 * The board as it reads with one task put BACK at `index` in its column — the inverse of
 * `withTaskRemove`. Spliced into whatever the column holds NOW, never a remembered copy; see
 * `withColumnRestore` for the concurrency defect that rule exists to avoid.
 */
export const withTaskRestore = <C extends TaskColumn>({
    columns,
    columnId,
    task,
    index,
}: {
    columns: C[];
    columnId: string;
    task: TaskFull;
    index: number;
}): C[] =>
    columns.map((column) =>
        column.id === columnId
            ? { ...column, tasks: [...column.tasks.slice(0, index), task, ...column.tasks.slice(index)] }
            : column,
    );

/**
 * The board as it reads with the task at `taskId` MERGED with `task` — how `useCreateTask` swaps its
 * placeholder for the server's real id, version and position. Merged rather than assigned because
 * `TaskResponseDTO` carries no `subtasks` (docs/adr/tech/0030 rule 2).
 */
export const withTaskReplace = <C extends TaskColumn>({
    columns,
    taskId,
    task,
}: {
    columns: C[];
    taskId: string;
    task: Task;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((entry) => (entry.id === taskId ? { ...entry, ...task } : entry)),
    }));

/**
 * The board as it reads with one subtask already appended — the reducer behind `useCreateSubtask`'s
 * optimistic insert (both the placeholder row on `onMutate` and the real-id swap on `onSuccess`). A
 * task id the board no longer holds yields the input untouched, mirroring `withSubtaskCompletion`.
 */
export const withSubtaskInsert = <C extends TaskColumn>({
    columns,
    taskId,
    subtask,
}: {
    columns: C[];
    taskId: string;
    subtask: Subtask;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
            task.id === taskId ? { ...task, subtasks: [...task.subtasks, subtask] } : task,
        ),
    }));

/**
 * The board as it reads with one subtask put BACK at `index` in its task — the inverse of
 * `withSubtaskRemove`. Spliced into whatever the task holds NOW, never a remembered copy; see
 * `withColumnRestore` for the concurrency defect that rule exists to avoid.
 */
export const withSubtaskRestore = <C extends TaskColumn>({
    columns,
    taskId,
    subtask,
    index,
}: {
    columns: C[];
    taskId: string;
    subtask: Subtask;
    index: number;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
            task.id === taskId
                ? { ...task, subtasks: [...task.subtasks.slice(0, index), subtask, ...task.subtasks.slice(index)] }
                : task,
        ),
    }));

/**
 * The board as it reads with one subtask's title already changed — the reducer behind
 * `useRenameSubtask`'s optimistic write. A subtask id the board no longer holds yields the input
 * untouched, mirroring `withSubtaskCompletion`.
 */
export const withSubtaskRename = <C extends TaskColumn>({
    columns,
    taskId,
    subtaskId,
    title,
}: {
    columns: C[];
    taskId: string;
    subtaskId: string;
    title: string;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
            task.id === taskId
                ? {
                      ...task,
                      subtasks: task.subtasks.map((subtask) =>
                          subtask.id === subtaskId ? { ...subtask, title } : subtask,
                      ),
                  }
                : task,
        ),
    }));

/**
 * The board as it reads with one subtask already removed — behind `useDeleteSubtask`'s optimistic
 * write, and reused by `useCreateSubtask`'s success handler to drop its own placeholder row first.
 * A subtask id the board no longer holds yields the input untouched.
 */
export const withSubtaskRemove = <C extends TaskColumn>({
    columns,
    taskId,
    subtaskId,
}: {
    columns: C[];
    taskId: string;
    subtaskId: string;
}): C[] =>
    columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
            task.id === taskId
                ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId) }
                : task,
        ),
    }));

/**
 * The board as it reads with one task already gone — the reducer behind `useDeleteTask`'s
 * optimistic write. A task id the board no longer holds yields the input untouched.
 */
export const withTaskRemove = <C extends TaskColumn>({ columns, taskId }: { columns: C[]; taskId: string }): C[] =>
    columns.map((column) => ({ ...column, tasks: column.tasks.filter((task) => task.id !== taskId) }));

/** A column as the announcement strings read it — its own name, plus the tasks they count against. */
export type NamedTaskColumn = TaskColumn & { name: string };

// comment-length-exempt: records why one announcements object serves two drag kinds and what happens to an id it does not own — a composition contract a future reader would otherwise split in two (docs/adr/tech/0023)
/**
 * dnd-kit's four move announcements in 04-UI-SPEC's own wording. One `DndContext` takes exactly one
 * announcements object, so this WRAPS the column reorder's rather than replacing it: an id this
 * board holds no task for falls through to `fallback`, which is what keeps Phase 3's column strings
 * verbatim and unretro-edited. A factory because the strings need the live board, and because
 * `pnpm tsx:check` forbids declaring it in the consuming `.tsx`. dnd-kit renders the live region
 * itself; this supplies strings only.
 */
export const createTaskMoveAnnouncements = ({
    columns,
    fallback,
}: {
    columns: NamedTaskColumn[];
    fallback: Announcements;
}): Announcements => {
    /* Speech is 1-based while the wire's `targetPosition` is 0-based, so the conversion is encoded once here. */
    const resolveTask = (
        id: UniqueIdentifier,
    ): { title: string; column: string; position: string; total: string } | null => {
        for (const column of columns) {
            const index = column.tasks.findIndex((task) => task.id === id);

            if (index !== -1) {
                return {
                    title: column.tasks[index].title,
                    column: column.name,
                    position: String(index + 1),
                    total: String(column.tasks.length),
                };
            }
        }

        return null;
    };

    /*
     * An empty column is the one destination with no card to resolve — the collision detection hands
     * back its BODY droppable instead, which `resolveTask` cannot name. The counts are the column as
     * it will read once the drop lands, so the wording matches every other destination.
     */
    const resolveColumnBody = (id: UniqueIdentifier): { column: string; position: string; total: string } | null => {
        const column = columns.find((entry) => buildColumnBodyDroppableId(entry.id) === String(id));

        return column !== undefined
            ? {
                  column: column.name,
                  position: String(column.tasks.length + 1),
                  total: String(column.tasks.length + 1),
              }
            : null;
    };

    /** Whatever the drag is over: another card, or an empty column's body. */
    const resolveTarget = (id: UniqueIdentifier): { column: string; position: string; total: string } | null =>
        resolveTask(id) ?? resolveColumnBody(id);

    return {
        onDragStart: (event) => {
            const task = resolveTask(event.active.id);

            return task === null
                ? fallback.onDragStart(event)
                : `Picked up ${task.title} from ${task.column}, position ${task.position} of ${task.total}. Use arrow keys to move, space to drop, escape to cancel.`;
        },

        onDragOver: (event) => {
            const task = resolveTask(event.active.id);
            if (task === null) {
                return fallback.onDragOver(event);
            }

            /* The library fires this once on the lift, over the item's own slot — announcing that would overwrite "Picked up …". */
            const target =
                event.over !== null && event.over.id !== event.active.id ? resolveTarget(event.over.id) : null;
            if (target === null) {
                return undefined;
            }

            /* The two Copywriting Contract wordings: the column reads first only when it changes. */
            return task.column === target.column
                ? `${task.title} moved to position ${target.position} of ${target.total} in ${target.column}.`
                : `${task.title} moved to ${target.column}, position ${target.position} of ${target.total}.`;
        },

        onDragEnd: (event) => {
            const task = resolveTask(event.active.id);
            if (task === null) {
                return fallback.onDragEnd(event);
            }

            const target = event.over !== null ? resolveTarget(event.over.id) : null;

            return target !== null
                ? `${task.title} dropped in ${target.column} at position ${target.position} of ${target.total}.`
                : undefined;
        },

        onDragCancel: (event) => {
            const task = resolveTask(event.active.id);

            return task === null
                ? fallback.onDragCancel(event)
                : `Move cancelled. ${task.title} returned to ${task.column}, position ${task.position} of ${task.total}.`;
        },
    };
};

/*
 * Zero, deliberately diverging from the mock's two seeded rows (PDF p6, 04-UI-SPEC.md "populated/
 * Add New Task modal"): a blank row BLOCKS the submit (product-owner decision 2026-09-03), so
 * seeded rows would open the modal invalid. Changing this back requires changing that rule too.
 */
export const DEFAULT_SUBTASK_ROW_COUNT = 0;

export const createEmptySubtaskRows = (count: number): { value: string }[] =>
    Array.from({ length: count }, () => ({ value: "" }));

/** The exact template type React Hook Form's `register` needs for a subtask row's field path. */
export type SubtaskRowPath = `subtasks.${number}.value`;

/*
 * A bare numeric interpolation trips `restrict-template-expressions`, so the index is stringified
 * and the result asserted back onto the template type, mirroring `buildColumnRowPath`.
 */
export const buildSubtaskRowPath = (index: number): SubtaskRowPath =>
    `subtasks.${String(index)}.value` as SubtaskRowPath;

/**
 * The draft subtask rows as the fan-out will POST them: trimmed, and a blank row DROPPED rather
 * than blocking submission (UI-SPEC empty/add-task-modal) — the opposite of the board modal's own
 * column rows, which a blank one blocks.
 */
export const toSubmittedSubtaskTitles = (rows: string[]): string[] =>
    rows.map((row) => row.trim()).filter((row) => row !== "");

/** The inline row, and the create/rename schemas' own row-level required-field copy. */
export const SUBTASK_ROW_REQUIRED_FIELD_MESSAGE = "Can't be empty";

/** The two seeded rows' own placeholders (PDF p6); every row after them repeats the first. */
const SUBTASK_ROW_PLACEHOLDERS = ["e.g. Make coffee", "e.g. Drink coffee & smile"];

/** Kept out of the `.tsx` because a bare array index there trips `pnpm tsx:check`'s top-level rule. */
export const toSubtaskRowPlaceholder = (index: number): string =>
    SUBTASK_ROW_PLACEHOLDERS[index] ?? SUBTASK_ROW_PLACEHOLDERS[0];
