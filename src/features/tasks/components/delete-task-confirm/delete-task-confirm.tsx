"use client";

import { X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Modal } from "@/components/ui/modal/modal";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

type Props = {
    boardId: string;
    columnId: string;
    task: TaskFull;
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    onSubmit: (values: { boardId: string; columnId: string; taskId: string }) => void;
    isPending: boolean;
};

/*
 * No empty state (this dialog only ever opens for a specific existing task, whose title it
 * interpolates) and no partial state (the delete is a single server-side cascade, not a
 * client-orchestrated fan-out like task creation — there is nothing partial to render).
 */

/**
 * TASK-05's confirm modal, mirroring `DeleteColumnConfirm` one containment level down. Deliberately
 * takes `onSubmit` as a prop rather than calling `useDeleteTask()` itself, so its behavioural tests
 * drive it with a real local function instead of a module mock (docs/adr/tech/0020).
 */
export const DeleteTaskConfirm = ({ boardId, columnId, task, onClose, onSubmit, isPending }: Props) => {
    /*
     * The cascade has no undo (ADR domain/0002), so the irreversible action must not sit under a
     * reflexive Enter on an opening modal — initial focus goes to the non-destructive one (T-04-41).
     */
    const keepTaskRef = useRef<HTMLButtonElement>(null);

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
            <Modal.Content initialFocus={keepTaskRef}>
                <div className="flex flex-col gap-6">
                    <Modal.Title className="text-text-danger">Delete this task?</Modal.Title>

                    {/* Prose, not a label — it wraps (UI-SPEC long-text row), and `break-words` keeps
                        an unbroken title from widening the panel instead of wrapping inside it. */}
                    <Modal.Description className="break-words">
                        {`Are you sure you want to delete the '${task.title}' task and its subtasks? This action cannot be reversed.`}
                    </Modal.Description>

                    {/* No error banner of its own — a failed delete is a toast raised by the hook. */}
                    <Modal.Footer>
                        <Button
                            type="button"
                            variant="destructive"
                            isLoading={isPending}
                            className="w-full"
                            onClick={() => {
                                onSubmit({ boardId, columnId, taskId: task.id });
                            }}
                        >
                            Delete Task
                        </Button>

                        <Button
                            ref={keepTaskRef}
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                handleOpenChange(false);
                            }}
                        >
                            Keep Task
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
