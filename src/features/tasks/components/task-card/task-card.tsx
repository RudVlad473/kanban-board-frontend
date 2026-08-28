"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { toSubtaskSummary } from "@/features/tasks/model";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { DRAG_ITEM_TYPE } from "@/lib/core/drag/drag-items";
import { cn } from "@/lib/core/styling/cn";

type Props = {
    task: TaskFull;
    /** The column this card currently sits in, declared so a drag handler can read it off the item. */
    columnId: string;
    /** Opens the detail view for this task — nothing is mutated from here (D-13). */
    onOpenDetail: (task: TaskFull) => void;
    /** UI-SPEC zero-one-many: one column holding one task is the only board with nowhere to drag to. */
    isMoveDisabled: boolean;
    /** T-04: this card was the one moved, and its PATCH has not settled yet. */
    isMoving: boolean;
};

/**
 * One task as a sortable item: the node ref goes on the `<li>`, the activator on the handle beside
 * it. Presentational by design — it owns no mutation state and calls no mutation hook, so its tests
 * drive it with a real local callback rather than a module mock (ADR tech/0020).
 */
export const TaskCard = ({ task, columnId, onOpenDetail, isMoveDisabled, isMoving }: Props) => {
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
        id: task.id,
        disabled: isMoveDisabled || isMoving,
        data: { type: DRAG_ITEM_TYPE.TASK, columnId },
        attributes: { roleDescription: "draggable task" },
    });

    /* Read off the strategy's own indices, so the pointer path and the keyboard path indicate identically. */
    const isInsertionPoint = isSorting && overIndex === index && activeIndex !== index;
    /* A card lifted from ANOTHER column reports -1 here, and a cross-column drop inserts before this one. */
    const isInsertionBelow = activeIndex !== -1 && activeIndex < index;

    /*
     * UI-SPEC "Card caption": suppression at zero subtasks is this CALL SITE's decision, so the
     * shipped `toSubtaskSummary` stays total and the board agrees with the detail view's own
     * `Subtasks (0 of 0)` suppression.
     */
    const subtaskSummary = task.subtasks.length === 0 ? null : toSubtaskSummary(task.subtasks);

    return (
        <li
            ref={setNodeRef}
            aria-busy={isMoving}
            style={{
                transform: CSS.Transform.toString(transform),
                /* The one motion the drag has; dropped entirely under reduce-motion rather than shortened. */
                transition: prefersReducedMotion ? undefined : transition,
            }}
            className={cn(
                "relative flex items-center rounded-lg bg-bg-surface py-6 pr-2 pl-4 shadow-sm",
                isDragging && "opacity-50",
            )}
        >
            {!isInsertionPoint ? null : (
                /*
                 * S-08's axis-flipped twin of the column indicator: a full-width bar drawn in the
                 * 20px inter-card gap, so the insertion point reads without waiting for a reflow.
                 */
                <span
                    aria-hidden="true"
                    className={cn(
                        "absolute inset-x-0 h-1 rounded-full bg-bg-primary",
                        isInsertionBelow ? "-bottom-2.5" : "-top-2.5",
                    )}
                />
            )}

            {/*
             * D-13: the content button carries neither the activator ref nor the listeners, and stops
             * pointer-event propagation so a press on it can never reach the drag sensor.
             */}
            <button
                type="button"
                onPointerDown={(event) => {
                    event.stopPropagation();
                }}
                onClick={() => {
                    onOpenDetail(task);
                }}
                className="flex min-w-0 flex-1 flex-col gap-2 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none"
            >
                {/* C-07: the title WRAPS rather than truncating, and the card is never height-clamped. */}
                <span className="font-heading-m text-heading-m [font-weight:var(--font-weight-heading-m)] break-words text-text-primary">
                    {task.title}
                </span>

                {/* UI-SPEC empty/task-card: at zero subtasks there is no caption element at all. */}
                {subtaskSummary === null ? null : (
                    <span className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                        {subtaskSummary}
                    </span>
                )}
            </button>

            {/*
             * S-04: a 44x44 ghost handle at the card's right edge, always rendered and never
             * hover-only. A SIBLING of the content button, which never receives the drag listeners.
             */}
            <IconButton
                ref={setActivatorNodeRef}
                variant="ghost"
                size="md"
                isDisabled={isMoveDisabled || isMoving}
                label={`Reorder ${task.title}`}
                icon={<GripVertical />}
                className="shrink-0 cursor-grab aria-pressed:cursor-grabbing"
                {...attributes}
                {...listeners}
            />
        </li>
    );
};
