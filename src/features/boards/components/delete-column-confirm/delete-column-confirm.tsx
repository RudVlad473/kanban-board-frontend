"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import type { ColumnFull } from "@/features/boards/schemas";

type Props = {
    boardId: string;
    column: ColumnFull;
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    onSubmit: (values: { boardId: string; columnId: string }) => void;
    isPending: boolean;
};

/**
 * The confirm modal, mirroring `DeleteBoardConfirm` one containment level down. Deliberately
 * takes `onSubmit` as a prop rather than calling `useDeleteColumn()` itself, so its behavioural
 * tests drive it with a real local function instead of a module mock (docs/adr/tech/0020).
 */
export const DeleteColumnConfirm = ({ boardId, column, onClose, onSubmit, isPending }: Props) => {
    /*
     * The cascade has no undo (ADR domain/0002), so the irreversible action must not sit under a
     * reflexive Enter on an opening modal — initial focus goes to the non-destructive one (T-03-08).
     */
    const keepColumnRef = useRef<HTMLButtonElement>(null);

    /*
     * Both guards are required together: Base UI's Dialog fires `onOpenChange(false)` on Escape
     * regardless of the backdrop-dismissal prop (documented in `modal.tsx` itself).
     */
    const handleOpenChange = (nextIsOpen: boolean): void => {
        if (isPending || nextIsOpen) {
            return;
        }

        onClose();
    };

    return (
        <Modal.Root isOpen={true} onOpenChange={handleOpenChange} isDismissableOnBackdropClick={!isPending}>
            <Modal.Content initialFocus={keepColumnRef}>
                <div className="flex flex-col gap-6">
                    <Modal.Title className="text-text-danger">Delete this column?</Modal.Title>

                    {/* Prose, not a label — it wraps (UI-SPEC long-text row), and `break-words` keeps
                        an unbroken name from widening the panel instead of wrapping inside it. */}
                    <Modal.Description className="break-words">
                        {`Are you sure you want to delete the '${column.name}' column? This action will remove all of its tasks and cannot be reversed.`}
                    </Modal.Description>

                    {/* No error banner of its own — U-05 makes a failed delete a toast raised by the hook. */}
                    <Modal.Footer>
                        <Button
                            type="button"
                            variant="destructive"
                            isLoading={isPending}
                            className="w-full"
                            onClick={() => {
                                onSubmit({ boardId, columnId: column.id });
                            }}
                        >
                            Delete Column
                        </Button>

                        <Button
                            ref={keepColumnRef}
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                handleOpenChange(false);
                            }}
                        >
                            Keep Column
                        </Button>
                    </Modal.Footer>
                </div>
            </Modal.Content>
        </Modal.Root>
    );
};
