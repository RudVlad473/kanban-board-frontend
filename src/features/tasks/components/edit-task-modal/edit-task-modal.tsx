"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import { Textarea } from "@/components/ui/textarea/textarea";
import { editTaskFormSchema, type EditTaskFormValues, type EditTaskSubmitValues } from "@/features/tasks/schemas";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

type Props = {
    task: TaskFull;
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    onSubmit: (values: EditTaskSubmitValues) => void;
    isPending: boolean;
    /**
     * The subtask rows themselves — left as a prop by plan 04-18 for plan 04-19 to fill with live
     * `SubtaskEditorRow` entries. Rendering the section here (label, autosave hint, add-a-row
     * button) with no rows keeps this component's own shape unchanged once the slot is filled.
     */
    subtaskRows?: ReactNode;
    onAddSubtaskRow?: () => void;
    /** Storybook-only staging — renders the title field's error state without a real submit. */
    forceTitleError?: string;
};

/**
 * TASK-03's edit form (S-01). Deliberately takes `onSubmit` as a prop rather than calling its own
 * save hook — that is what lets its behavioural tests drive it with a real local function instead
 * of a module mock (docs/adr/tech/0020), matching every sibling modal's own rule.
 */
export const EditTaskModal = ({
    task,
    onClose,
    onSubmit,
    isPending,
    subtaskRows,
    onAddSubtaskRow,
    forceTitleError,
}: Props) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EditTaskFormValues>({
        resolver: zodResolver(editTaskFormSchema),
        mode: "onTouched",
        defaultValues: { title: task.title, description: task.description ?? "" },
    });

    const titleErrorMessage = forceTitleError ?? errors.title?.message;

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
                            onSubmit({ title: values.title, description: values.description });
                        })(event);
                    }}
                    className="flex flex-col gap-6"
                >
                    <Modal.Title>Edit Task</Modal.Title>

                    <TextField
                        label="Title"
                        type="text"
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

                    {/*
                     * S-02: NO Status control here — a third live move control would read as
                     * queued. C-03: the mock's batched panel is honoured visually only (04-UI-SPEC).
                     */}
                    <div className="flex flex-col gap-3">
                        <span className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary">
                            Subtasks
                        </span>

                        {/* S-01's mitigation for the real hazard it creates — not optional decoration. */}
                        <p className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                            Subtask changes save as you make them.
                        </p>

                        {subtaskRows}

                        <Button type="button" variant="secondary" onClick={onAddSubtaskRow}>
                            + Add New Subtask
                        </Button>
                    </div>

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
