"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import { boardNameSchema } from "@/features/boards/schemas";

const addBoardFormSchema = z.object({ name: boardNameSchema });

export type AddBoardFormValues = z.infer<typeof addBoardFormSchema>;

type Props = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: AddBoardFormValues) => void;
    isPending: boolean;
    /** D-05's inline failure copy, rendered inside the still-open modal — never a toast. */
    errorMessage?: string | null;
    /** Pre-fills field values (a plain React Hook Form `defaultValues` passthrough) — Storybook-only staging, mirroring `sign-up-form.tsx`. */
    defaultValues?: Partial<AddBoardFormValues>;
    /** Storybook-only staging — renders the board-name field's error state without a real submit. */
    forceNameError?: string;
};

/**
 * BOARD-02's create form. Deliberately takes `onSubmit` as a prop rather than calling
 * `useCreateBoard()` itself — that is what lets its behavioural tests drive it with a real local
 * function instead of a module mock, which is banned outside stories (docs/adr/tech/0020).
 */
export const AddBoardModal = ({
    isOpen,
    onOpenChange,
    onSubmit,
    isPending,
    errorMessage,
    defaultValues,
    forceNameError,
}: Props) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AddBoardFormValues>({
        resolver: zodResolver(addBoardFormSchema),
        mode: "onTouched",
        defaultValues: { name: "", ...defaultValues },
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
                            onSubmit(values);
                        })(event);
                    }}
                    className="flex flex-col gap-6"
                >
                    <Modal.Title>Add New Board</Modal.Title>

                    <TextField
                        label="Board Name"
                        type="text"
                        placeholder="e.g. Web Design"
                        hasError={Boolean(nameErrorMessage)}
                        errorMessage={nameErrorMessage}
                        {...register("name")}
                    />

                    {errorMessage ? (
                        <p
                            role="alert"
                            className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger"
                        >
                            {errorMessage}
                        </p>
                    ) : null}

                    <Modal.Footer>
                        <Button type="submit" variant="primary" isLoading={isPending} className="w-full">
                            Create New Board
                        </Button>
                    </Modal.Footer>
                </form>
            </Modal.Content>
        </Modal.Root>
    );
};
