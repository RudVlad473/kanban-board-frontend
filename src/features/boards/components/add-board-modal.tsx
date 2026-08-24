"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import { boardNameSchema, columnNameRowSchema } from "@/features/boards/schemas";

/*
 * Rows are validated with `columnNameRowSchema`, not `columnNameSchema` — a blank row is valid and
 * simply never reaches the create sequence (D-02).
 */
const addBoardFormSchema = z.object({
    name: boardNameSchema,
    columns: z.array(z.object({ value: columnNameRowSchema })),
});

type AddBoardFormValues = z.infer<typeof addBoardFormSchema>;

/** What the submit handler receives — the raw rows, trimmed and dropped later by `toCreatableColumnNames`. */
export type AddBoardSubmitValues = { name: string; columns: string[] };

/** D-01: the classic Todo/Doing/Done starter shape, as three empty rows. */
const DEFAULT_COLUMN_ROW_COUNT = 3;

const createEmptyColumnRows = (count: number): { value: string }[] =>
    Array.from({ length: count }, () => ({ value: "" }));

/*
 * React Hook Form's `register` needs this exact template type, but a bare numeric interpolation
 * trips `restrict-template-expressions` — the stringified index is asserted back onto it.
 */
type ColumnRowPath = `columns.${number}.value`;

type Props = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: AddBoardSubmitValues) => void;
    isPending: boolean;
    /** D-05's inline failure copy, rendered inside the still-open modal — never a toast. */
    errorMessage?: string | null;
    /** Pre-fills the board name (a plain React Hook Form `defaultValues` passthrough) — Storybook-only staging, mirroring `sign-up-form.tsx`. */
    defaultValues?: { name?: string };
    /** Storybook-only staging — seeds the column rows with these values instead of three empty ones. */
    defaultColumns?: string[];
    /** Storybook-only staging — renders the board-name field's error state without a real submit. */
    forceNameError?: string;
    /** Storybook-only staging — renders the first column row's error state without a real submit. */
    forceColumnError?: string;
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
    defaultColumns,
    forceNameError,
    forceColumnError,
}: Props) => {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<AddBoardFormValues>({
        resolver: zodResolver(addBoardFormSchema),
        mode: "onTouched",
        defaultValues: {
            name: defaultValues?.name ?? "",
            columns: defaultColumns
                ? defaultColumns.map((value) => ({ value }))
                : createEmptyColumnRows(DEFAULT_COLUMN_ROW_COUNT),
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "columns" });

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
                            onSubmit({ name: values.name, columns: values.columns.map((column) => column.value) });
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

                    <div className="flex flex-col gap-2">
                        {fields.map((field, index) => {
                            const rowLabel = `Column ${String(index + 1)}`;
                            const rowErrorMessage =
                                (index === 0 ? forceColumnError : undefined) ?? errors.columns?.[index]?.value?.message;

                            return (
                                <div key={field.id} className="flex items-start gap-2">
                                    <TextField
                                        label={rowLabel}
                                        type="text"
                                        placeholder="e.g. Todo"
                                        hasError={Boolean(rowErrorMessage)}
                                        errorMessage={rowErrorMessage}
                                        {...register(`columns.${String(index)}.value` as ColumnRowPath)}
                                    />

                                    <IconButton
                                        type="button"
                                        variant="ghost"
                                        label={`Remove ${rowLabel}`}
                                        icon={<X />}
                                        className="mt-6"
                                        onClick={() => {
                                            remove(index);
                                        }}
                                    />
                                </div>
                            );
                        })}

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                append({ value: "" });
                            }}
                        >
                            + Add New Column
                        </Button>
                    </div>

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
