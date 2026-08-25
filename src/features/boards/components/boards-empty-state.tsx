"use client";

import { useState } from "react";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddBoardModal } from "@/features/boards/components/add-board-modal";
import { useCreateBoard } from "@/features/boards/hooks/use-create-board";
import type { AddBoardSubmitValues } from "@/features/boards/schemas";

/**
 * D-10's zero-boards screen. Reuses the sidebar's own create modal rather than a second create
 * path, so both entry points create a board the same way.
 */
type Props = {
    /** Storybook-only staging for the create modal's open state — no real caller passes this (see BoardList's own). */
    defaultIsAddBoardOpen?: boolean;
};

export const BoardsEmptyState = ({ defaultIsAddBoardOpen = false }: Props) => {
    /*
     * Starts closed and no effect opens it: D-10 states plainly that the modal does not auto-open,
     * so the call to action is the only thing that can.
     */
    const {
        value: isAddBoardOpen,
        setValue: setIsAddBoardOpen,
        setFalse: closeAddBoard,
    } = useBoolean(defaultIsAddBoardOpen);
    // Bumped on every fresh open and used as the modal's `key`, so each open starts empty (as BoardList does).
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

    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-bg-app p-6">
            <p className="text-center font-heading-l text-heading-l [font-weight:var(--font-weight-heading-l)] text-text-muted">
                Create a new board to get started.
            </p>

            <Button
                type="button"
                variant="primary"
                onClick={() => {
                    handleOpenChange(true);
                }}
            >
                Create your first board
            </Button>

            <AddBoardModal
                key={openCount}
                isOpen={isAddBoardOpen}
                onOpenChange={handleOpenChange}
                onSubmit={handleSubmit}
                isPending={isPending}
                errorMessage={errorMessage}
            />
        </div>
    );
};
