"use client";

import {
    closestCenter,
    closestCorners,
    getFirstCollision,
    pointerWithin,
    rectIntersection,
    type ClientRect,
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

const toCentreY = (rect: ClientRect): number => rect.top + rect.height / 2;

/**
 * Whether the dragged card sits BELOW the card it is hovering — the "insert after, not before"
 * half of a cross-column drop, which no collision result carries on its own. Centres, not edges:
 * an edge test only reads true once the collision has moved to the next card.
 */
export const isDraggedBelowCard = ({
    draggedRect,
    cardRect,
}: {
    draggedRect: ClientRect | null;
    cardRect: ClientRect;
}): boolean => draggedRect !== null && toCentreY(draggedRect) > toCentreY(cardRect);

// comment-length-exempt: records which strategy each drag kind gets and the regression a blanket swap would cause — a settled branch a future reader would otherwise collapse into one strategy (docs/adr/tech/0023)
/**
 * The board's collision strategy, branched on the ACTIVE item's declared type. A column drag keeps
 * `closestCenter` verbatim, because 60 `board-view.test.tsx` blocks assert that behaviour and a
 * blanket swap risks all of them — but it is run against the COLUMN droppables only, never the whole
 * `args.droppableContainers`. Before this plan the column sortables were the only droppables on the
 * board; this plan added one column-BODY droppable per column so an empty column stays reachable, and
 * an unfiltered `closestCenter` picks one of those over a column just as often, handing `over.id` a
 * `column-body-*` id no column-reorder announcement or index lookup recognises — the announcement
 * silently drops and every keyboard block making progress off it hangs. A task drag takes the classic
 * multi-container strategy instead: pointer-within first, rect-intersection as the fallback, then
 * narrowed to the hovered column's own cards — centre distance lets a tall column's centre beat a
 * nearby card's, so drops land in the wrong column near container edges (04-RESEARCH Pitfall 7).
 */
export const createTaskAwareCollisionDetection = ({
    columnTaskIds,
}: {
    columnTaskIds: { columnId: string; taskIds: string[] }[];
}): CollisionDetection => {
    return (args) => {
        if (toDragItemData(args.active.data.current)?.type !== DRAG_ITEM_TYPE.TASK) {
            const filtered = args.droppableContainers.filter(
                (container) => toDragItemData(container.data.current)?.type === DRAG_ITEM_TYPE.COLUMN,
            );

            return closestCenter({ ...args, droppableContainers: filtered });
        }

        const pointerCollisions = pointerWithin(args);
        const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
        const overId = getFirstCollision(collisions, "id");

        if (overId === null) {
            return collisions;
        }

        // comment-length-exempt: records the third droppable a task drag can land on and the dead strip that ignoring it leaves, a slot-unreachable bug this file has now shipped twice (docs/adr/tech/0023)
        /*
         * Which column the pointer is in, from EITHER of the two droppables that can answer it: the
         * column-body list, or the column's own sortable `<section>`.
         *
         * The section is what the pointer is inside anywhere the list is not — the header band above
         * the first card — and its data carries no `columnId`, so a drop there resolved to no column
         * and issued no request at all. Reading the column off its droppable id instead makes every
         * point inside a column a drop into that column, which is what leaves no dead strips.
         */
        const hovered = columnTaskIds.find(
            ({ columnId }) => buildColumnBodyDroppableId(columnId) === String(overId) || columnId === String(overId),
        );

        /* Nothing this board owns, or an empty column — either way the first collision is the answer. */
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
