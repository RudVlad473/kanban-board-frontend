"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { Dropdown } from "@/components/ui/dropdown/dropdown";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import { Textarea } from "@/components/ui/textarea/textarea";
import {
    buildSubtaskRowPath,
    createEmptySubtaskRows,
    DEFAULT_SUBTASK_ROW_COUNT,
    toSubmittedSubtaskTitles,
    toSubtaskRowPlaceholder,
} from "@/features/tasks/model";
import { addTaskFormSchema, type AddTaskFormValues, type AddTaskSubmitValues } from "@/features/tasks/schemas";
import { TASK_TITLE_MAX_LENGTH } from "@/lib/core/api-contract/task-schemas";

type Props = {
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    onSubmit: (values: AddTaskSubmitValues) => void;
    isPending: boolean;
    /** Board order — the Status control lists these verbatim, in the order given. */
    columns: { id: string; name: string }[];
    /** The inline failure copy, rendered inside the still-open modal — never a toast. */
    errorMessage?: string | null;
    /** Pre-fills the form (a plain React Hook Form `defaultValues` passthrough) — Storybook-only staging. */
    defaultValues?: { title?: string; description?: string; columnId?: string };
    /** Storybook-only staging — seeds the subtask rows with these values instead of the default two. */
    defaultSubtasks?: string[];
    /** Storybook-only staging — renders the title field's error state without a real submit. */
    forceTitleError?: string;
};

/**
 * TASK-01's create form. Deliberately takes `onSubmit` as a prop rather than calling its own
 * create hook — that is what lets its behavioural tests drive it with a real local function
 * instead of a module mock, which is banned outside stories (docs/adr/tech/0020).
 */
export const AddTaskModal = ({
    onClose,
    onSubmit,
    isPending,
    columns,
    errorMessage,
    defaultValues,
    defaultSubtasks,
    forceTitleError,
}: Props) => {
    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AddTaskFormValues>({
        resolver: zodResolver(addTaskFormSchema),
        mode: "onTouched",
        defaultValues: {
            title: defaultValues?.title ?? "",
            description: defaultValues?.description ?? "",
            columnId: defaultValues?.columnId ?? columns.at(0)?.id ?? "",
            subtasks: defaultSubtasks
                ? defaultSubtasks.map((value) => ({ value }))
                : createEmptySubtaskRows(DEFAULT_SUBTASK_ROW_COUNT),
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "subtasks" });
    /* `fields` only reflects append/remove, never a keystroke — the live values need their own watch. */
    const liveSubtasks = useWatch({ control, name: "subtasks" });

    const titleErrorMessage = forceTitleError ?? errors.title?.message;

    /*
     * Without this, Base UI's `Select.Value` shows the raw id ("todo") until the popup has been
     * opened once — passing `items` is what lets it resolve the label up front (Base UI docs).
     */
    const columnLabelsById = Object.fromEntries(columns.map((column) => [column.id, column.name]));

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
            <Modal.Content>
                <form
                    noValidate={true}
                    onSubmit={(event) => {
                        /*
                         * Wrapped rather than passed straight through: React Hook Form calls its
                         * callback with `(values, event)`, and this component's contract is values.
                         */
                        void handleSubmit((values) => {
                            onSubmit({
                                columnId: values.columnId,
                                title: values.title,
                                description: values.description,
                                subtasks: toSubmittedSubtaskTitles(values.subtasks.map((row) => row.value)),
                            });
                        })(event);
                    }}
                    className="flex flex-col gap-6"
                >
                    <Modal.Title>Add New Task</Modal.Title>

                    <TextField
                        label="Title"
                        type="text"
                        characterLimit={TASK_TITLE_MAX_LENGTH}
                        placeholder="e.g. Take coffee break"
                        hasError={Boolean(titleErrorMessage)}
                        errorMessage={titleErrorMessage}
                        {...register("title")}
                    />

                    <Textarea
                        label="Description"
                        placeholder="e.g. It's always good to take a break. This 15 minute break will recharge the batteries a little."
                        {...register("description")}
                    />

                    <div className="flex flex-col gap-3">
                        <span className="font-body-m text-body-m text-text-primary">Subtasks</span>

                        {fields.map((field, index) => {
                            const rowValue = liveSubtasks[index]?.value ?? "";
                            const removeLabel =
                                rowValue.trim() === ""
                                    ? `Remove Subtask ${String(index + 1)}`
                                    : `Remove subtask '${rowValue}'`;

                            return (
                                <div key={field.id} className="flex items-center gap-2">
                                    <TextField
                                        label={`Subtask ${String(index + 1)}`}
                                        isLabelHidden={true}
                                        type="text"
                                        placeholder={toSubtaskRowPlaceholder(index)}
                                        {...register(buildSubtaskRowPath(index))}
                                    />

                                    <IconButton
                                        type="button"
                                        variant="ghost"
                                        label={removeLabel}
                                        icon={<X />}
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
                            + Add New Subtask
                        </Button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="font-body-m text-body-m text-text-primary">Status</span>

                        <Controller
                            control={control}
                            name="columnId"
                            render={({ field }) => {
                                return (
                                    <Dropdown.Root
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        items={columnLabelsById}
                                    >
                                        <Dropdown.Trigger placeholder="Select a status" />

                                        <Dropdown.Content>
                                            {columns.map((column) => {
                                                return (
                                                    <Dropdown.Item key={column.id} value={column.id}>
                                                        {column.name}
                                                    </Dropdown.Item>
                                                );
                                            })}
                                        </Dropdown.Content>
                                    </Dropdown.Root>
                                );
                            }}
                        />
                    </div>

                    {errorMessage ? (
                        <p role="alert" className="font-body-l text-body-l text-text-danger">
                            {errorMessage}
                        </p>
                    ) : null}

                    <Modal.Footer>
                        <Button type="submit" variant="primary" isLoading={isPending} className="w-full">
                            Create Task
                        </Button>
                    </Modal.Footer>
                </form>
            </Modal.Content>
        </Modal.Root>
    );
};
