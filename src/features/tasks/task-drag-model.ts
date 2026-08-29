"use client";

import {
    closestCenter,
    closestCorners,
    getFirstCollision,
    pointerWithin,
    rectIntersection,
    type CollisionDetection,
} from "@dnd-kit/core";

import { buildColumnBodyDroppableId, DRAG_ITEM_TYPE, type DragItemType } from "@/lib/core/drag/drag-items";

/*
 * Split out of `model.ts` so no VALUE import of `@dnd-kit/*` reaches the server graph: dnd-kit calls
 * `React.createContext` at module scope and `server-only` `fetch-board-full.ts` imports a feature's
 * `model.ts`. Revert the merge and `pnpm build` dies on /boards/[boardId] — see 03-14-SUMMARY.md.
 */

/** What every sortable on this board declares itself as, read back off `active.data.current`. */
export type DragItemData = { type: DragItemType; columnId?: string };

const DRAG_ITEM_TYPES: readonly string[] = Object.values(DRAG_ITEM_TYPE);

/**
 * The declared type of a dragged or hovered item, or `null` for anything that declared none. Guessing
 * instead — treating an unrecognised id as a column — is what makes `handleDragEnd`'s index lookup
 * return -1 for a task and silently no-op, which looks exactly like a drag that never registered.
 */
export const toDragItemData = (data: Record<string, unknown> | undefined): DragItemData | null => {
    const type = data?.type;
    if (typeof type !== "string" || !DRAG_ITEM_TYPES.includes(type)) {
        return null;
    }

    const columnId = data?.columnId;

    return { type: type as DragItemType, columnId: typeof columnId === "string" ? columnId : undefined };
};

// comment-length-exempt: records which strategy each drag kind gets and the bug a blanket `closestCenter(args)` call reintroduced — a settled branch a future reader would otherwise collapse into one strategy (docs/adr/tech/0023)
/**
 * The board's collision strategy, branched on the ACTIVE item's declared type. A column drag keeps
 * `closestCenter` narrowed to column-type droppables only: sharing one `DndContext` with tasks means
 * `args.droppableContainers` also holds every task card and column body, so an unfiltered call picks
 * a nearby card as "closest" instead of the column beside it (found live-debugging the 04-12
 * keyboard-announcement regression — every reorder's `over` resolved to a task id). A task drag takes
 * the classic multi-container strategy instead: pointer-within first, rect-intersection as the
 * fallback, then narrowed to the hovered column's own cards — centre distance lets a tall column's
 * centre beat a nearby card's, so drops land in the wrong column near container edges (04-RESEARCH
 * Pitfall 7).
 */
export const createTaskAwareCollisionDetection = ({
    columnTaskIds,
}: {
    columnTaskIds: { columnId: string; taskIds: string[] }[];
}): CollisionDetection => {
    return (args) => {
        if (toDragItemData(args.active.data.current)?.type !== DRAG_ITEM_TYPE.TASK) {
            return closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                    (container) => toDragItemData(container.data.current)?.type === DRAG_ITEM_TYPE.COLUMN,
                ),
            });
        }

        const pointerCollisions = pointerWithin(args);
        const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
        const overId = getFirstCollision(collisions, "id");

        if (overId === null) {
            return collisions;
        }

        const hovered = columnTaskIds.find(({ columnId }) => buildColumnBodyDroppableId(columnId) === String(overId));
        /* Already over a card, or over an empty column body — either way the first collision is the answer. */
        if (hovered === undefined || hovered.taskIds.length === 0) {
            return collisions;
        }

        const cardCollisions = closestCorners({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) =>
                hovered.taskIds.includes(String(container.id)),
            ),
        });

        return cardCollisions.length > 0 ? cardCollisions : collisions;
    };
};
