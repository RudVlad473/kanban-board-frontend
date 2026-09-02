"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import {
    COLUMN_NAME_MAX_LENGTH,
    renameColumnFormSchema,
    type ColumnFull,
    type RenameColumnFormValues,
} from "@/features/boards/schemas";

type Props = {
    boardId: string;
    column: ColumnFull;
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    onSubmit: (values: { boardId: string; columnId: string; name: string; version: number }) => void;
    /** Storybook-only staging — renders the column-name field's error state without a real submit. */
    forceNameError?: string;
};

/**
 * COLUMN-02's rename form. Takes no loading state at all: U-05 makes the rename optimistic, so the
 * new name is already on screen when this closes and a later failure surfaces as rollback plus a
 * toast (03-UI-SPEC loading/Rename-submit). `onSubmit` is a prop so its tests need no module mock.
 */
export const RenameColumnModal = ({ boardId, column, onClose, onSubmit, forceNameError }: Props) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RenameColumnFormValues>({
        resolver: zodResolver(renameColumnFormSchema),
        mode: "onTouched",
        defaultValues: { name: column.name },
    });

    const nameErrorMessage = forceNameError ?? errors.name?.message;

    return (
        <Modal.Root
            isOpen={true}
            onOpenChange={(nextIsOpen) => {
                if (!nextIsOpen) {
                    onClose();
                }
            }}
        >
            <Modal.Content>
                <form
                    noValidate={true}
                    onSubmit={(event) => {
                        /*
                         * Wrapped rather than passed straight through: React Hook Form calls its
                         * callback with `(values, event)`, and this component's contract is values.
                         */
                        void handleSubmit((values) => {
                            /* The version comes from the RSC-supplied column, never from typed input (T-03-04). */
                            onSubmit({ boardId, columnId: column.id, name: values.name, version: column.version });
                        })(event);
                    }}
                    className="flex flex-col gap-6"
                >
                    <Modal.Title>Rename Column</Modal.Title>

                    <TextField
                        label="Column Name"
                        type="text"
                        characterLimit={COLUMN_NAME_MAX_LENGTH}
                        placeholder="e.g. Todo"
                        hasError={Boolean(nameErrorMessage)}
                        errorMessage={nameErrorMessage}
                        {...register("name")}
                    />

                    {/* No error banner of its own — U-05 makes a failed rename a toast raised by the hook. */}
                    <Modal.Footer>
                        <Button type="submit" variant="primary" className="w-full">
                            Save Changes
                        </Button>
                    </Modal.Footer>
                </form>

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
