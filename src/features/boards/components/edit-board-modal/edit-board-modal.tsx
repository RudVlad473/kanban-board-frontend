"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import { editBoardFormSchema, type Board, type EditBoardFormValues } from "@/features/boards/schemas";

type Props = {
    board: Board;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: { boardId: string; name: string; version: number }) => void;
    isPending: boolean;
    /** Storybook-only staging — renders the board-name field's error state without a real submit. */
    forceNameError?: string;
};

/**
 * D-14's rename form. Deliberately takes `onSubmit` as a prop rather than calling `useRenameBoard()`
 * itself — that is what lets its behavioural tests drive it with a real local function instead of a
 * module mock, which is banned outside stories (docs/adr/tech/0020).
 */
export const EditBoardModal = ({ board, isOpen, onOpenChange, onSubmit, isPending, forceNameError }: Props) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EditBoardFormValues>({
        resolver: zodResolver(editBoardFormSchema),
        mode: "onTouched",
        defaultValues: { name: board.name },
    });

    const nameErrorMessage = forceNameError ?? errors.name?.message;

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
            <Modal.Content>
                <form
                    noValidate
                    onSubmit={(event) => {
                        /*
                         * Wrapped rather than passed straight through: React Hook Form calls its
                         * callback with `(values, event)`, and this component's contract is values.
                         */
                        void handleSubmit((values) => {
                            onSubmit({ boardId: board.id, name: values.name, version: board.version });
                        })(event);
                    }}
                    className="flex flex-col gap-6"
                >
                    <Modal.Title>Edit Board</Modal.Title>

                    <TextField
                        label="Board Name"
                        type="text"
                        placeholder="e.g. Web Design"
                        hasError={Boolean(nameErrorMessage)}
                        errorMessage={nameErrorMessage}
                        {...register("name")}
                    />

                    {/* No error banner of its own — D-15 makes a failed rename a toast raised by the hook. */}
                    <Modal.Footer>
                        <Button type="submit" variant="primary" isLoading={isPending} className="w-full">
                            Save Changes
                        </Button>
                    </Modal.Footer>
                </form>
            </Modal.Content>
        </Modal.Root>
    );
};
