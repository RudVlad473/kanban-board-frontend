"use client";

import { useState } from "react";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddColumnModal } from "@/features/boards/components/add-column-modal";
import { AddColumnPlaceholder } from "@/features/boards/components/add-column-placeholder";
import { ColumnHeader } from "@/features/boards/components/column-header";
import { useCreateColumn } from "@/features/boards/hooks/use-create-column";
import { toSubtaskSummary } from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";

/*
 * COLUMN-01 makes this the board's client container: it owns the Add Column modal's open state and
 * the create hook, while its presentational children take `onSubmit`/`isPending` as props. Task
 * cards stay display only — task interaction is Phase 4.
 */
type Props = {
    board: BoardFull;
    /** Storybook-only staging for the Add Column modal's open state — no real caller passes this. */
    defaultIsAddColumnOpen?: boolean;
};

export const BoardView = ({ board, defaultIsAddColumnOpen = false }: Props) => {
    const {
        value: isAddColumnOpen,
        setValue: setIsAddColumnOpen,
        setFalse: closeAddColumn,
    } = useBoolean(defaultIsAddColumnOpen);
    /*
     * Bumped on every fresh open and used as the modal's `key`, so each open starts from an empty
     * field — a failed create keeps its value because the modal never closed, not because the form
     * is retained across opens (mirrors `board-list.tsx`).
     */
    const [openCount, setOpenCount] = useState(0);
    const { createColumn, isPending, errorMessage, clearError } = useCreateColumn();

    const handleOpenChange = (nextIsOpen: boolean): void => {
        setIsAddColumnOpen(nextIsOpen);
        clearError();

        if (nextIsOpen) {
            setOpenCount((count) => count + 1);
        }
    };

    /* Closed only when the create actually landed, so an inline failure has a modal to land in. */
    const handleSubmit = (values: { name: string }): void => {
        void createColumn({ boardId: board.id, name: values.name }).then((outcome) => {
            if (outcome.didCreate) {
                closeAddColumn();
            }
        });
    };

    const openAddColumn = (): void => {
        handleOpenChange(true);
    };

    return (
        <>
            {board.columns.length === 0 ? (
                /*
                 * UI-SPEC empty/0-columns: the centred call to action REPLACES the ghost column
                 * here, so this branch deliberately renders no `AddColumnPlaceholder`.
                 */
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-bg-app p-6">
                    <p className="text-center font-heading-l text-heading-l [font-weight:var(--font-weight-heading-l)] text-text-muted">
                        This board is empty. Create a new column to get started.
                    </p>

                    {/* Auto-width and centred, never full-width (UI-SPEC accent reserved-for item 6). */}
                    <Button type="button" variant="primary" onClick={openAddColumn}>
                        + Add New Column
                    </Button>
                </div>
            ) : (
                /* The column row scrolls horizontally; columns keep their width rather than wrapping. */
                <div className="flex min-h-0 flex-1 gap-6 overflow-x-auto bg-bg-app p-6">
                    {board.columns.map((column) => (
                        /*
                         * Its own vertical scroll region, so one long column never moves the rest — and
                         * focusable only because nothing inside it is yet (axe scrollable-region-focusable);
                         * plan 03-08's header kebab ends that condition and takes this attribute with it.
                         */
                        <section
                            key={column.id}
                            tabIndex={0}
                            aria-labelledby={`board-column-${column.id}`}
                            className="flex w-70 shrink-0 flex-col overflow-y-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
                        >
                            <ColumnHeader column={column} />

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

                    {/* Last flex child INSIDE the scroll row, so it scrolls away with the columns (UI-SPEC overflow). */}
                    <AddColumnPlaceholder onOpen={openAddColumn} />
                </div>
            )}

            <AddColumnModal
                key={openCount}
                isOpen={isAddColumnOpen}
                onOpenChange={handleOpenChange}
                onSubmit={handleSubmit}
                isPending={isPending}
                errorMessage={errorMessage}
            />
        </>
    );
};
