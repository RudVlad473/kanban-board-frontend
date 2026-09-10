"use client";

import { isNil } from "es-toolkit";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useBoolean } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddBoardModal } from "@/features/boards/components/add-board-modal/add-board-modal";
import { useCreateBoard } from "@/features/boards/hooks/use-create-board";
import type { AddBoardSubmitValues } from "@/features/boards/schemas";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

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
    /* `pushState` updates this in the same commit the board paints in — see the guard below. */
    const pathname = usePathname();

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

    // comment-length-exempt: records the two-screens-at-once defect this guard removes and why the component may not simply unmount instead, neither of which is visible from the condition itself
    /*
     * This screen is the INDEX route's markup, and `useCreateBoard` moves the URL with
     * `history.pushState` — which repaints the layout's `BoardScreen` out of the optimistic cache
     * entry but does not re-render this segment. So without this guard the new board and the
     * zero-boards copy are on screen together until the action's `refresh()` lands, measured at
     * roughly 1.5s in production on 2026-09-10.
     *
     * Guards the MARKUP, never the component: returning early would unmount the `useMutation` whose
     * observer owns `onError`, and a create that is refused after that point would never have its
     * optimistic row removed. The modal stays mounted for the same reason and costs no layout — it
     * renders through a portal.
     */
    const isBoardOpen = !isNil(toBoardIdFromPath(pathname));

    return (
        <>
            {!isBoardOpen && (
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
                </div>
            )}

            <AddBoardModal
                key={openCount}
                isOpen={isAddBoardOpen}
                onOpenChange={handleOpenChange}
                onSubmit={handleSubmit}
                /* Never pending: the modal no longer outlives the submit that closes it. */
                isPending={false}
                defaultValues={!isNil(retryValues) ? { name: retryValues.name } : undefined}
                defaultColumns={retryValues?.columns}
            />
        </>
    );
};
