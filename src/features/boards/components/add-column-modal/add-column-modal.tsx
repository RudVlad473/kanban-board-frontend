"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import {
    addColumnFormSchema,
    COLUMN_NAME_MIN_LENGTH,
    COLUMN_NAME_MAX_LENGTH,
    type AddColumnFormValues,
} from "@/features/boards/schemas";

type Props = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: { name: string }) => void;
    isPending: boolean;
    /** The generic create failure, rendered inline in the still-open modal — never a toast. */
    errorMessage?: string | null;
    /** Pre-fills the column name (a plain React Hook Form `defaultValues` passthrough) — Storybook-only staging. */
    defaultValues?: { name?: string };
    /** Storybook-only staging — renders the column-name field's error state without a real submit. */
    forceNameError?: string;
};

/**
 * COLUMN-01's create form. Deliberately takes `onSubmit` as a prop rather than calling
 * `useCreateColumn()` itself — that is what lets its behavioural tests drive it with a real local
 * function instead of a module mock, which is banned outside stories (docs/adr/tech/0020).
 */
export const AddColumnModal = ({
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
    } = useForm<AddColumnFormValues>({
        resolver: zodResolver(addColumnFormSchema),
        mode: "onTouched",
        defaultValues: { name: defaultValues?.name ?? "" },
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
                    noValidate={true}
                    onSubmit={(event) => {
                        /*
                         * Wrapped rather than passed straight through: React Hook Form calls its
                         * callback with `(values, event)`, and this component's contract is values.
                         */
                        void handleSubmit((values) => {
                            onSubmit({ name: values.name });
                        })(event);
                    }}
                    className="flex flex-col gap-6"
                >
                    <Modal.Title>Add New Column</Modal.Title>

                    <TextField
                        label="Column Name"
                        type="text"
                        characterLimit={COLUMN_NAME_MAX_LENGTH}
                        characterMinimum={COLUMN_NAME_MIN_LENGTH}
                        placeholder="e.g. Todo"
                        hasError={Boolean(nameErrorMessage)}
                        errorMessage={nameErrorMessage}
                        {...register("name")}
                    />

                    {errorMessage ? (
                        <p role="alert" className="font-body-l text-body-l text-text-danger">
                            {errorMessage}
                        </p>
                    ) : null}

                    <Modal.Footer>
                        <Button type="submit" variant="primary" isLoading={isPending} className="w-full">
                            Create New Column
                        </Button>
                    </Modal.Footer>
                </form>
            </Modal.Content>
        </Modal.Root>
    );
};
