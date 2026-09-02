"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";

import { ColumnHeader } from "@/features/boards/components/column-header/column-header";
import type { ColumnFull } from "@/features/boards/schemas";
import { buildColumnBodyDroppableId, DRAG_ITEM_TYPE } from "@/lib/core/drag/drag-items";
import { cn } from "@/lib/core/styling/cn";

type Props = {
    column: ColumnFull;
    /**
     * This column's task nodes, built by the layout ring and passed DOWN (D-18). A render prop
     * rather than an import: the boundaries policy disallows `feature -> feature` in both
     * directions, so this file must know nothing about the tasks feature at all.
     */
    renderTasks: () => ReactNode;
    /** UI-SPEC zero-one-many/exactly-1-column: a lone column has nowhere to go, so it gets no handle. */
    isReorderDisabled: boolean;
    /** T-03-31: this column was the one moved, and its reorder has not settled yet. */
    isReordering: boolean;
    onRename: (column: ColumnFull) => void;
    onDelete: (column: ColumnFull) => void;
};

/**
 * One column as a sortable item: the node ref goes on the `<section>`, the activator on the header's
 * handle button. Its own component because the sortable hook cannot be called inside the board
 * container's `map` — and because `pnpm tsx:check` allows one component per `.tsx`.
 */
export const SortableColumn = ({ column, renderTasks, isReorderDisabled, isReordering, onRename, onDelete }: Props) => {
    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { initializeWithValue: false });
    const {
        activeIndex,
        attributes,
        index,
        isDragging,
        isSorting,
        listeners,
        overIndex,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: column.id,
        disabled: isReorderDisabled,
        /* Declared so a drag handler branches on what was lifted rather than guessing from the id. */
        data: { type: DRAG_ITEM_TYPE.COLUMN },
        attributes: { roleDescription: "draggable column" },
    });

    /*
     * The card list is its own droppable, so a column holding no tasks is still a target — an empty
     * `<ul>` is zero-height and unreachable by pointer without the minimum height below.
     */
    // comment-length-exempt: an empirically-confirmed dnd-kit interaction a future reader would otherwise revert as unnecessary (docs/adr/tech/0023)
    /*
     * Disabled outside a TASK drag: `sortableKeyboardCoordinates` (the column keyboard sensor's own
     * coordinate getter) picks its candidate from every ENABLED droppable regardless of declared
     * type, so with this body left enabled during a COLUMN keyboard drag its rect (well below the
     * header row) kept winning the "closest" contest over the next column's own header, sending the
     * step downward instead of sideways and silently corrupting every arrow press after the first
     * (confirmed live: `collisionRect.top` advanced while `.left` stayed fixed). Read via
     * `useDndContext` rather than a prop: threading `active` down would recreate the render-prop
     * bridge D-18 already forbids.
     */
    const { active } = useDndContext();
    const isTaskDragActive = active?.data.current?.type === DRAG_ITEM_TYPE.TASK;
    const { isOver: isBodyOver, setNodeRef: setTaskListNodeRef } = useDroppable({
        id: buildColumnBodyDroppableId(column.id),
        data: { type: DRAG_ITEM_TYPE.COLUMN_BODY, columnId: column.id },
        disabled: !isTaskDragActive,
    });

    /* Read off the strategy's own indices, so the pointer path and the keyboard path indicate identically. */
    const isInsertionPoint = isSorting && overIndex === index && activeIndex !== index;
    /*
     * A hovered card carries its OWN insertion point (task-card.tsx); an empty column has no card to
     * carry one, so the body itself draws S-08's bar the moment a task drag is over it directly.
     */
    const isEmptyBodyInsertionPoint = isTaskDragActive && isBodyOver && column.tasks.length === 0;

    return (
        <section
            ref={setNodeRef}
            aria-labelledby={`board-column-${column.id}`}
            aria-busy={isReordering}
            style={{
                transform: CSS.Transform.toString(transform),
                /* The one motion the drag has; dropped entirely under reduce-motion rather than shortened. */
                transition: !prefersReducedMotion ? transition : undefined,
            }}
            className={cn("relative flex w-70 shrink-0 flex-col rounded-sm", isDragging && "opacity-50")}
        >
            {isInsertionPoint ? (
                /*
                 * Drawn in the gutter rather than left to the reflow alone: with unequal column
                 * heights a shifted preview reads ambiguously about which side the drop lands on.
                 */
                <span
                    aria-hidden="true"
                    className={cn(
                        "absolute inset-y-0 w-1 rounded-full bg-bg-primary",
                        activeIndex < index ? "-right-3.5" : "-left-3.5",
                    )}
                />
            ) : null}

            {/*
             * The scroll region, holding the header so it has real focusable content — which is what
             * axe's scrollable-region-focusable rule actually asks for (03-RESEARCH Pitfall 10).
             */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <ColumnHeader
                    column={column}
                    handleProps={
                        !isReorderDisabled ? { setNode: setActivatorNodeRef, attributes, listeners } : undefined
                    }
                    areMutationsDisabled={isReordering}
                    onRename={onRename}
                    onDelete={onDelete}
                />

                {/*
                 * S-07: 20px between cards, measured twice on the mock, correcting the shipped 16px.
                 * `min-h-22` is the 88px one-card floor an empty column needs to stay droppable.
                 */}
                <ul ref={setTaskListNodeRef} className="relative flex min-h-22 flex-col gap-5">
                    {renderTasks()}

                    {isEmptyBodyInsertionPoint ? (
                        /*
                         * S-08's own bar, drawn at the body's own top edge rather than a card's gap —
                         * an empty column has no gap to draw it inside.
                         */
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-full bg-bg-primary"
                        />
                    ) : null}
                </ul>
            </div>
        </section>
    );
};
