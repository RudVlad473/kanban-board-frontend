"use client";

import { useEffect, useRef, useState } from "react";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddColumnModal } from "@/features/boards/components/add-column-modal";
import { AddColumnPlaceholder } from "@/features/boards/components/add-column-placeholder";
import { ColumnHeader } from "@/features/boards/components/column-header";
import { RenameColumnModal } from "@/features/boards/components/rename-column-modal";
import { useCreateColumn } from "@/features/boards/hooks/use-create-column";
import { useRenameColumn, type RenameColumnArgs } from "@/features/boards/hooks/use-rename-column";
import { toSubtaskSummary } from "@/features/boards/model";
import type { BoardFull, ColumnFull } from "@/features/boards/schemas";

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
    const [columnBeingRenamed, setColumnBeingRenamed] = useState<ColumnFull | null>(null);
    const columnCount = board.columns.length;
    const { createColumn, isPending, errorMessage, clearError } = useCreateColumn({ columnCount });
    /* The DERIVED columns, not the raw props — that array is what carries the optimistic name. */
    const { renameColumn, columns: renderedColumns } = useRenameColumn({ columns: board.columns });

    const ghostColumnRef = useRef<HTMLButtonElement>(null);
    /** The column count when a create landed — a ref, so retiring the request costs no render. */
    const scrollRequestedAtCount = useRef<number | null>(null);

    /* No motion argument: the default resolves to the row's own CSS, which is what `motion-reduce` varies. */
    const scrollGhostColumnIntoView = (): void => {
        ghostColumnRef.current?.scrollIntoView({ inline: "end", block: "nearest" });
    };

    /*
     * D-04's second pass. The row grows only once the action's own `refresh()` lands, so scrolling
     * at the instant of success alone would move the row as it stood before the new column existed.
     * Retired as it runs, so a later count change (a delete) cannot re-fire it (T-03-27).
     */
    useEffect(() => {
        if (scrollRequestedAtCount.current === null || scrollRequestedAtCount.current === columnCount) {
            return;
        }

        scrollRequestedAtCount.current = null;
        scrollGhostColumnIntoView();
    }, [columnCount]);

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
                /* Confirms the create at once against the row as it stands; the effect finishes the job. */
                scrollRequestedAtCount.current = columnCount;
                scrollGhostColumnIntoView();
            }
        });
    };

    /*
     * U-05: closed on submit, not on settle — `renameColumn` applied the optimistic override
     * synchronously before this line runs, so the header already shows the new name underneath. A
     * later failure still reverts it and raises the hook's own toast, modal or no modal.
     */
    const handleRenameSubmit = (values: RenameColumnArgs): void => {
        void renameColumn(values);
        setColumnBeingRenamed(null);
    };

    const openAddColumn = (): void => {
        handleOpenChange(true);
    };

    return (
        <>
            {columnCount === 0 ? (
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
                /*
                 * The column row scrolls horizontally; columns keep their width rather than
                 * wrapping. The one declaration governing D-04's motion and its opt-out lives here.
                 */
                <div className="flex min-h-0 flex-1 gap-6 overflow-x-auto scroll-smooth bg-bg-app p-6 motion-reduce:scroll-auto">
                    {renderedColumns.map((column) => (
                        /*
                         * Its own vertical scroll region, so one long column never moves the rest. No
                         * tab stop of its own: the header kebab is real focusable content, which is what
                         * axe's scrollable-region-focusable rule actually asks for (03-RESEARCH Pitfall 10).
                         */
                        <section
                            key={column.id}
                            aria-labelledby={`board-column-${column.id}`}
                            className="flex w-70 shrink-0 flex-col overflow-y-auto rounded-sm"
                        >
                            <ColumnHeader column={column} onRename={setColumnBeingRenamed} />

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
                    <AddColumnPlaceholder ref={ghostColumnRef} onOpen={openAddColumn} />
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

            {columnBeingRenamed === null ? null : (
                <RenameColumnModal
                    /* Keyed on the target column, so reopening on another header seeds that column's name. */
                    key={columnBeingRenamed.id}
                    boardId={board.id}
                    column={columnBeingRenamed}
                    isOpen
                    onOpenChange={(nextIsOpen) => {
                        if (!nextIsOpen) {
                            setColumnBeingRenamed(null);
                        }
                    }}
                    onSubmit={handleRenameSubmit}
                />
            )}
        </>
    );
};
