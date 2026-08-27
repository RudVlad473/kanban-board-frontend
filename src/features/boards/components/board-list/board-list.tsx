"use client";

import { PanelLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useBoolean } from "usehooks-ts";

import { AddBoardModal } from "@/features/boards/components/add-board-modal/add-board-modal";
import { BoardCard } from "@/features/boards/components/board-card/board-card";
import { DeleteBoardConfirm } from "@/features/boards/components/delete-board-confirm/delete-board-confirm";
import { EditBoardModal } from "@/features/boards/components/edit-board-modal/edit-board-modal";
import { useCreateBoard } from "@/features/boards/hooks/use-create-board";
import { useDeleteBoard } from "@/features/boards/hooks/use-delete-board";
import { useRenameBoard, type RenameBoardArgs } from "@/features/boards/hooks/use-rename-board";
import type { AddBoardSubmitValues, Board } from "@/features/boards/schemas";
import { buildBoardDetailPath, toBoardIdFromPath } from "@/lib/core/routing/routes";

/*
 * The sidebar's board list, RSC-fed via props (not `useBoards()`, per docs/adr/tech/0019). Split
 * out of the old combined `Sidebar` (plan 02-09) so the panel chrome paints immediately while
 * this streams in behind `Suspense`; renders only the caption and scroll region, never a `nav`.
 */
type Props = {
    boards: Board[];
    loadFailed?: boolean;
    /** Storybook-only staging for the create modal's open state — no real caller passes this (see Sidebar's `defaultIsExpanded`). */
    defaultIsAddBoardOpen?: boolean;
    /** Storybook-only staging — seeds the rename modal open on the board at this index. */
    defaultRenameTargetIndex?: number;
    /** Storybook-only staging — seeds the delete confirmation open on the board at this index. */
    defaultDeleteTargetIndex?: number;
};

export const BoardList = ({
    boards,
    loadFailed = false,
    defaultIsAddBoardOpen = false,
    defaultRenameTargetIndex,
    defaultDeleteTargetIndex,
}: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const {
        value: isAddBoardOpen,
        setValue: setIsAddBoardOpen,
        setFalse: closeAddBoard,
    } = useBoolean(defaultIsAddBoardOpen);
    const [boardBeingRenamed, setBoardBeingRenamed] = useState<Board | null>(
        defaultRenameTargetIndex === undefined ? null : (boards[defaultRenameTargetIndex] ?? null),
    );
    /*
     * WR-01/WR-02 (02-REVIEW.md): scopes `useRenameBoard`'s shared `isPending` flag to the
     * in-flight board's own id, so only that board's modal shows pending and only that row's
     * Edit Board entry disables — full rationale in 02-REVIEW.md.
     */
    const [pendingRenameBoardId, setPendingRenameBoardId] = useState<string | null>(null);
    const [boardBeingDeleted, setBoardBeingDeleted] = useState<Board | null>(
        defaultDeleteTargetIndex === undefined ? null : (boards[defaultDeleteTargetIndex] ?? null),
    );
    /*
     * Scoped to the sidebar deliberately: D-15 names the sidebar, and the dashboard header's board
     * title updates when the refreshed server render lands (raised at plan 02-12's checkpoint).
     */
    const { renameBoard, isPending: isRenamePending, boards: renderedBoards } = useRenameBoard({ boards });
    /* The same path the selected-row treatment already reads, so both agree on "the open board". */
    const { deleteBoard, isPending: isDeletePending } = useDeleteBoard({
        boards,
        currentBoardId: toBoardIdFromPath(pathname),
    });
    /*
     * Bumped on every fresh open and used as the modal's `key`, so each open starts from empty
     * fields — a failed create keeps its values because the modal never closed (D-05), not because
     * the form is retained across opens.
     */
    const [openCount, setOpenCount] = useState(0);
    const { createBoard, isPending, errorMessage, clearError } = useCreateBoard();

    const handleOpenChange = (nextIsOpen: boolean): void => {
        setIsAddBoardOpen(nextIsOpen);
        clearError();

        if (nextIsOpen) {
            setOpenCount((count) => count + 1);
        }
    };

    const handleSubmit = (values: AddBoardSubmitValues): void => {
        void createBoard({ name: values.name, columnRows: values.columns }).then((outcome) => {
            if (outcome.didCreate) {
                closeAddBoard();
            }
        });
    };

    /*
     * D-02: closed on submit, not on settle — `renameBoard` applied the optimistic override
     * synchronously before this line runs, so the sidebar already shows the new name underneath. A
     * later failure still reverts it and raises the hook's own toast, modal or no modal.
     */
    const handleRenameSubmit = (values: RenameBoardArgs): void => {
        setPendingRenameBoardId(values.boardId);
        void renameBoard(values).finally(() => {
            setPendingRenameBoardId(null);
        });
        setBoardBeingRenamed(null);
    };

    /* D-09: the modal closes either way — a failure is announced by the hook's toast, not in here. */
    const handleDeleteSubmit = (values: { boardId: string }): void => {
        void deleteBoard(values).finally(() => {
            setBoardBeingDeleted(null);
        });
    };

    return (
        <>
            <p className="p-6 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase">
                {`ALL BOARDS (${String(boards.length)})`}
            </p>

            {/* The board-list region is the panel's only scrolling part (UI-SPEC overflow rule). */}
            <div className="flex-1 overflow-y-auto">
                {loadFailed ? (
                    <div className="flex flex-col items-start gap-2 px-6 py-4">
                        <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                            Couldn&apos;t load your boards.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                router.refresh();
                            }}
                            className="rounded-sm font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary underline decoration-1 underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2"
                        >
                            Try again.
                        </button>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {renderedBoards.map((board) => (
                            <BoardCard
                                key={board.id}
                                board={board}
                                isSelected={pathname === buildBoardDetailPath(board.id)}
                                onEdit={setBoardBeingRenamed}
                                onDelete={setBoardBeingDeleted}
                                isEditDisabled={board.id === pendingRenameBoardId}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Below the scroll region and above the panel's pinned controls (UI-SPEC overflow row);
                an accent inline link, not a filled button (accent-reservation list item 2). */}
            <button
                type="button"
                onClick={() => {
                    handleOpenChange(true);
                }}
                className="flex min-h-11 w-full items-center gap-2 px-6 font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-bg-primary outline-none hover:text-bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-inset"
            >
                <PanelLeft aria-hidden="true" className="size-5 shrink-0" />+ Create New Board
            </button>

            <AddBoardModal
                key={openCount}
                isOpen={isAddBoardOpen}
                onOpenChange={handleOpenChange}
                onSubmit={handleSubmit}
                isPending={isPending}
                errorMessage={errorMessage}
            />

            {boardBeingRenamed === null ? null : (
                <EditBoardModal
                    /* Keyed on the target board, so reopening on another row seeds that row's own name. */
                    key={boardBeingRenamed.id}
                    board={boardBeingRenamed}
                    isOpen
                    onOpenChange={(nextIsOpen) => {
                        if (!nextIsOpen) {
                            setBoardBeingRenamed(null);
                        }
                    }}
                    onSubmit={handleRenameSubmit}
                    isPending={isRenamePending && pendingRenameBoardId === boardBeingRenamed.id}
                />
            )}

            {boardBeingDeleted === null ? null : (
                <DeleteBoardConfirm
                    /* Keyed on the target board, so reopening on another row names that row's own board. */
                    key={boardBeingDeleted.id}
                    board={boardBeingDeleted}
                    isOpen
                    onOpenChange={(nextIsOpen) => {
                        if (!nextIsOpen) {
                            setBoardBeingDeleted(null);
                        }
                    }}
                    onSubmit={handleDeleteSubmit}
                    isPending={isDeletePending}
                />
            )}
        </>
    );
};
