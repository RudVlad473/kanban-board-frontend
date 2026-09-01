import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";

import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { buildColumnBodyDroppableId } from "@/lib/core/drag/drag-items";

/*
 * D-16's promotion rule covers contract SHAPES, and a caption formatter is presentation rather than
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
 */
export const toTaskMoveTargetPosition = ({
    destinationTaskIds,
    taskId,
    overTaskId,
}: {
    destinationTaskIds: string[];
    taskId: string;
    overTaskId: string | null;
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
    const overIndex = destinationTaskIds.indexOf(overTaskId);
    const isDownwardWithinColumn = activeIndex !== -1 && activeIndex < overIndex;

    return isDownwardWithinColumn ? indexAfterRemoval + 1 : indexAfterRemoval;
};

/**
 * The board as it reads with one move already applied — the reducer behind `useMoveTask`'s
 * `useOptimistic`. A task id the board no longer holds yields the input untouched.
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

        return column === undefined
            ? null
            : {
                  column: column.name,
                  position: String(column.tasks.length + 1),
                  total: String(column.tasks.length + 1),
              };
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
                event.over === null || event.over.id === event.active.id ? null : resolveTarget(event.over.id);
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

            const target = event.over === null ? null : resolveTarget(event.over.id);

            return target === null
                ? undefined
                : `${task.title} dropped in ${target.column} at position ${target.position} of ${target.total}.`;
        },

        onDragCancel: (event) => {
            const task = resolveTask(event.active.id);

            return task === null
                ? fallback.onDragCancel(event)
                : `Move cancelled. ${task.title} returned to ${task.column}, position ${task.position} of ${task.total}.`;
        },
    };
};

/** UI-SPEC "populated/Add New Task modal": the mock's own two seeded draft rows. */
export const DEFAULT_SUBTASK_ROW_COUNT = 2;

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

/** The two seeded rows' own placeholders (PDF p6); every row after them repeats the first. */
const SUBTASK_ROW_PLACEHOLDERS = ["e.g. Make coffee", "e.g. Drink coffee & smile"];

/** Kept out of the `.tsx` because a bare array index there trips `pnpm tsx:check`'s top-level rule. */
export const toSubtaskRowPlaceholder = (index: number): string =>
    SUBTASK_ROW_PLACEHOLDERS[index] ?? SUBTASK_ROW_PLACEHOLDERS[0];
