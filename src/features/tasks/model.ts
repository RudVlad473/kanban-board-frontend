import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";

import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

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
 * One in-flight move, recorded against the SERVER's own task ids in each column it touches — the
 * task-level twin of `ColumnOrderOverride`, and the same retirement contract.
 */
export type TaskMoveOverride = {
    taskId: string;
    targetColumnId: string;
    targetIndex: number;
    previousTaskIds: { columnId: string; taskIds: string[] }[];
};

/**
 * The optimistic move as rendered, retiring itself the moment the server's own task order stops
 * matching `previousTaskIds` — nothing ever clears it (04-RESEARCH Pattern 5). Returns the props
 * array ITSELF when the override is stale, so reference equality is the retirement signal.
 */
export const applyTaskMoveOverride = <C extends TaskColumn>({
    columns,
    override,
}: {
    columns: C[];
    override: TaskMoveOverride | null;
}): C[] => {
    if (override === null) {
        return columns;
    }

    const isStale = override.previousTaskIds.some(({ columnId, taskIds }) => {
        /* A column the server no longer has reads as an empty list, which is itself a change of order. */
        const currentIds = (columns.find((column) => column.id === columnId)?.tasks ?? []).map((task) => task.id);

        return currentIds.length !== taskIds.length || currentIds.some((id, index) => id !== taskIds[index]);
    });

    const movedTask = columns.flatMap((column) => column.tasks).find((task) => task.id === override.taskId);

    if (isStale || movedTask === undefined) {
        return columns;
    }

    return columns.map((column) => {
        if (column.id === override.targetColumnId) {
            const remaining = column.tasks.filter((task) => task.id !== override.taskId);

            return {
                ...column,
                tasks: [
                    ...remaining.slice(0, override.targetIndex),
                    movedTask,
                    ...remaining.slice(override.targetIndex),
                ],
            };
        }

        return column.tasks.some((task) => task.id === override.taskId)
            ? { ...column, tasks: column.tasks.filter((task) => task.id !== override.taskId) }
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
            const target = event.over === null || event.over.id === event.active.id ? null : resolveTask(event.over.id);
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

            const target = event.over === null ? null : resolveTask(event.over.id);

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

/* RED skeleton (04-15 Task 2) — type-checks so the pre-commit hook's type-aware lint can run. */
export const createEmptySubtaskRows = (count: number): { value: string }[] =>
    Array.from({ length: count }, () => ({ value: "" }));

export type SubtaskRowPath = `subtasks.${number}.value`;

export const buildSubtaskRowPath = (index: number): SubtaskRowPath =>
    `subtasks.${String(index)}.wrong` as SubtaskRowPath;

export const toSubmittedSubtaskTitles = (rows: string[]): string[] => rows;
