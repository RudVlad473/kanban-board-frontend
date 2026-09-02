"use client";

import { X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Modal } from "@/components/ui/modal/modal";
import type { Board } from "@/features/boards/schemas";

type Props = {
    board: Board;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: { boardId: string }) => void;
    isPending: boolean;
};

/**
 * D-06's plain confirm modal — no type-the-name-to-confirm step. Deliberately takes `onSubmit` as a
 * prop rather than calling `useDeleteBoard()` itself, so its behavioural tests drive it with a real
 * local function instead of a module mock, which is banned outside stories (docs/adr/tech/0020).
 */
export const DeleteBoardConfirm = ({ board, isOpen, onOpenChange, onSubmit, isPending }: Props) => {
    /*
     * The cascade has no undo (ADR domain/0002), so the irreversible action must not sit under a
     * reflexive Enter on an opening modal — initial focus goes to the non-destructive one (T-02-65).
     */
    const keepBoardRef = useRef<HTMLButtonElement>(null);

    /*
     * Both guards are required together: Base UI's Dialog fires `onOpenChange(false)` on Escape
     * regardless of the backdrop-dismissal prop (documented in `modal.tsx` itself).
     */
    const handleOpenChange = (nextIsOpen: boolean): void => {
        if (isPending) {
            return;
        }

        onOpenChange(nextIsOpen);
    };

    return (
        <Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange} isDismissableOnBackdropClick={!isPending}>
            <Modal.Content initialFocus={keepBoardRef}>
                <div className="flex flex-col gap-6">
                    <Modal.Title className="text-text-danger">Delete this board?</Modal.Title>

                    {/* Prose, not a label — it wraps (UI-SPEC long-text row), and `break-words` keeps
                        an unbroken name from widening the panel instead of wrapping inside it. */}
                    <Modal.Description className="break-words">
                        {`Are you sure you want to delete the '${board.name}' board? This action will remove all columns and tasks and cannot be reversed.`}
                    </Modal.Description>

                    {/* No error banner of its own — D-09 makes a failed delete a toast raised by the hook. */}
                    <Modal.Footer>
                        <Button
                            type="button"
                            variant="destructive"
                            isLoading={isPending}
                            className="w-full"
                            onClick={() => {
                                onSubmit({ boardId: board.id });
                            }}
                        >
                            Delete Board
                        </Button>

                        <Button
                            ref={keepBoardRef}
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                handleOpenChange(false);
                            }}
                        >
                            Keep Board
                        </Button>
                    </Modal.Footer>
                </div>

                <Modal.Close
                    render={
                        <IconButton
                            type="button"
                            label="Close"
                            icon={<X />}
                            className="absolute top-1 right-1 md:top-2 md:right-2"
                        />
                    }
                />
            </Modal.Content>
        </Modal.Root>
    );
};
