"use client";

import { PanelLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useBoolean } from "usehooks-ts";

import { AddBoardModal } from "@/features/boards/components/add-board-modal";
import { BoardCard } from "@/features/boards/components/board-card";
import { EditBoardModal } from "@/features/boards/components/edit-board-modal";
import { useCreateBoard } from "@/features/boards/hooks/use-create-board";
import { useRenameBoard, type RenameBoardArgs } from "@/features/boards/hooks/use-rename-board";
import type { AddBoardSubmitValues, Board } from "@/features/boards/schemas";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";

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
};

export const BoardList = ({
    boards,
    loadFailed = false,
    defaultIsAddBoardOpen = false,
    defaultRenameTargetIndex,
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
    const { renameBoard, isPending: isRenamePending } = useRenameBoard();
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

    const handleRenameSubmit = (values: RenameBoardArgs): void => {
        void renameBoard(values).then((outcome) => {
            if (outcome.didRename) {
                setBoardBeingRenamed(null);
            }
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
                        {boards.map((board) => (
                            <BoardCard
                                key={board.id}
                                board={board}
                                isSelected={pathname === buildBoardDetailPath(board.id)}
                                onEdit={setBoardBeingRenamed}
                                /* Plan 02-13 replaces this with D-06's confirm modal in the very next wave. */
                                onDelete={() => undefined}
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
                    isPending={isRenamePending}
                />
            )}
        </>
    );
};
