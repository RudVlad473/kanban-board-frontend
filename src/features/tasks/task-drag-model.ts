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

/**
 * Whether the dragged card came to rest past the midpoint of the card it landed on — the "insert
 * after, not before" half of a cross-column drop, which no collision result carries on its own.
 *
 * Centres, not edges: an edge test needs the card dragged fully clear of the one below it, and the
 * collision has already switched to the NEXT card by then, so the last slot stays unreachable.
 * `translated` is null before the first pointer move, which cannot be a drop.
 */
export const isPastOverTaskCentre = ({
    activeRect,
    overRect,
}: {
    activeRect: ClientRect | null;
    overRect: ClientRect;
}): boolean => activeRect !== null && activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2;

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
