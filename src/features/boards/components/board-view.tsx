import { toColumnCaption, toSubtaskSummary } from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";

/*
 * No `"use client"`: BOARD-03 is a read, and column/task interaction is Phase 3/Phase 4 scope, so
 * cards are display only — no click target, no drag affordance.
 */
type Props = {
    board: BoardFull;
};

export const BoardView = ({ board }: Props) => {
    if (board.columns.length === 0) {
        /*
         * The PDF's add-column call to action is deliberately omitted rather than rendered inert:
         * the column-create interaction is COLUMN-01, in Phase 3, and a dead control is worse for
         * a user than no control (02-UI-SPEC left this to the planner).
         */
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-bg-app p-6">
                <p className="text-center font-heading-l text-heading-l [font-weight:var(--font-weight-heading-l)] text-text-muted">
                    This board is empty. Create a new column to get started.
                </p>
            </div>
        );
    }

    return (
        // The column row scrolls horizontally; columns keep their width rather than wrapping.
        <div className="flex min-h-0 flex-1 gap-6 overflow-x-auto bg-bg-app p-6">
            {board.columns.map((column) => (
                /*
                 * Its own vertical scroll region, so one long column never moves the rest — and
                 * focusable, because this phase's cards are display-only and a scroll region with
                 * no focusable content is unreachable by keyboard (axe scrollable-region-focusable).
                 */
                <section
                    key={column.id}
                    tabIndex={0}
                    aria-labelledby={`board-column-${column.id}`}
                    className="flex w-70 shrink-0 flex-col overflow-y-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
                >
                    {/* Pinned inside that scroll region, with the canvas colour behind it so rows pass under. */}
                    <h2
                        id={`board-column-${column.id}`}
                        className="sticky top-0 bg-bg-app pb-6 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase"
                    >
                        {toColumnCaption({ name: column.name, taskCount: column.tasks.length })}
                    </h2>

                    <ul className="flex flex-col gap-4">
                        {column.tasks.map((task) => (
                            <li
                                key={task.id}
                                className="flex flex-col gap-2 rounded-lg bg-bg-surface px-4 py-6 shadow-sm"
                            >
                                <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary">
                                    {task.title}
                                </p>

                                <p className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                                    {toSubtaskSummary(task.subtasks)}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
};
