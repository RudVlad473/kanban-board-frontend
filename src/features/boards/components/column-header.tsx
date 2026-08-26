import { toColumnCaption, toColumnDotToken } from "@/features/boards/model";
import type { ColumnFull } from "@/features/boards/schemas";
import { cn } from "@/lib/core/styling/cn";

type Props = {
    column: ColumnFull;
};

/**
 * One column's header row — U-03's position-cycled dot beside the shipped caption. Presentational by
 * design: it calls no hook and owns no state, so its tests drive it without a module mock (ADR tech/0020).
 */
export const ColumnHeader = ({ column }: Props) => {
    const caption = toColumnCaption({ name: column.name, taskCount: column.tasks.length });
    /* The count half is cut from the caption itself, so the format stays owned by that one function. */
    const countSuffix = caption.slice(column.name.length);

    return (
        /* Pinned inside the column's own scroll region, with the canvas colour behind it so rows pass under. */
        <h2
            id={`board-column-${column.id}`}
            className="sticky top-0 bg-bg-app pb-6 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase"
        >
            {/* The 44px tier is the kebab's touch target, which plan 03-08 places in this same row. */}
            <span className="flex min-h-11 items-center gap-1">
                {/* Decoration only: the hue states nothing the caption beside it does not already say. */}
                <span
                    aria-hidden="true"
                    className={cn("size-4 shrink-0 rounded-full", toColumnDotToken({ position: column.position }))}
                />

                <span className="min-w-0 truncate">{column.name}</span>

                <span className="shrink-0">{countSuffix}</span>
            </span>
        </h2>
    );
};
