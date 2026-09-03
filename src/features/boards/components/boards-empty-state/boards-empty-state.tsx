"use client";

import { useState } from "react";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddBoardModal } from "@/features/boards/components/add-board-modal/add-board-modal";
import { useCreateBoard } from "@/features/boards/hooks/use-create-board";
import type { AddBoardSubmitValues } from "@/features/boards/schemas";

/**
 * The zero-boards screen. Reuses the sidebar's own create modal rather than a second create
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
    // Bumped on every open and used as the modal's `key`, so each open re-seeds it (as BoardList does).
    const [openCount, setOpenCount] = useState(0);
    /* What a failed create is reopened with, so closing on submit costs nothing (D-05, reversed 2026-09-03). */
    const [retryValues, setRetryValues] = useState<AddBoardSubmitValues | null>(null);

    const openAddBoard = (values: AddBoardSubmitValues | null): void => {
        setRetryValues(values);
        setIsAddBoardOpen(true);
        setOpenCount((count) => count + 1);
    };

    const { createBoard } = useCreateBoard({
        onRetry: ({ name, columnRows }) => {
            openAddBoard({ name, columns: columnRows });
        },
    });

    const handleOpenChange = (nextIsOpen: boolean): void => {
        if (nextIsOpen) {
            openAddBoard(null);
            return;
        }

        closeAddBoard();
    };

    /* Closed BEFORE the create is issued; a refusal toasts a Retry rather than reporting in here. */
    const handleSubmit = (values: AddBoardSubmitValues): void => {
        closeAddBoard();
        void createBoard({ name: values.name, columnRows: values.columns });
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-bg-app p-6">
            <p className="text-center font-heading-l text-heading-l text-text-muted">
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
                /* Never pending: the modal no longer outlives the submit that closes it. */
                isPending={false}
                defaultValues={retryValues !== null ? { name: retryValues.name } : undefined}
                defaultColumns={retryValues?.columns}
            />
        </div>
    );
};
