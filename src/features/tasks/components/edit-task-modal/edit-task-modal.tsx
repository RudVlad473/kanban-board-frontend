"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button/button";
import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Modal } from "@/components/ui/modal/modal";
import { TextField } from "@/components/ui/text-field/text-field";
import { Textarea } from "@/components/ui/textarea/textarea";
import { SubtaskEditorRow } from "@/features/tasks/components/subtask-editor-row/subtask-editor-row";
import { useCreateSubtask } from "@/features/tasks/hooks/use-create-subtask";
import { useDeleteSubtask } from "@/features/tasks/hooks/use-delete-subtask";
import { useRenameSubtask } from "@/features/tasks/hooks/use-rename-subtask";
import { type TaskColumn } from "@/features/tasks/model";
import { editTaskFormSchema, type EditTaskFormValues, type EditTaskSubmitValues } from "@/features/tasks/schemas";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

type Props = {
    task: TaskFull;
    boardId: string;
    /** The open board's columns — seeds this modal's own reactive subtask read (docs/adr/tech/0030). */
    columns: TaskColumn[];
    /** Mounted only while open, so there is no `isOpen` to pass — closing is this one callback. */
    onClose: () => void;
    onSubmit: (values: EditTaskSubmitValues) => void;
    isPending: boolean;
    /** Storybook-only staging — renders the title field's error state without a real submit. */
    forceTitleError?: string;
};

// comment-length-exempt: records the one deliberate break from the presentational-by-prop rule every sibling modal follows, and why it is scoped to subtasks only — a settled design decision a future reader would otherwise "fix" by lifting the hooks (docs/adr/tech/0023)
/**
 * TASK-03's edit form (S-01) plus SUBTASK-01/03/04's per-item add/rename/delete (D-06). Takes
 * `onSubmit` as a prop for the title/description save, matching every sibling modal's
 * presentational-by-prop rule (docs/adr/tech/0020) — but the subtask rows are the one place this
 * modal owns its own mutation hooks directly, because each row saves the instant it is edited, and
 * there is no other single caller for `useCreateSubtask`/`useRenameSubtask`/`useDeleteSubtask` to
 * live in. A newly added row is a local DRAFT (a client id, no server call yet) until its first
 * commit, at which point it becomes a LIVE row read reactively off the shared board cache.
 */
export const EditTaskModal = ({ task, boardId, columns, onClose, onSubmit, isPending, forceTitleError }: Props) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EditTaskFormValues>({
        resolver: zodResolver(editTaskFormSchema),
        mode: "onTouched",
        defaultValues: { title: task.title, description: task.description ?? "" },
    });

    const { subtasks, createSubtask, isCreatingSubtask } = useCreateSubtask({ boardId, taskId: task.id, columns });
    const { renameSubtask, isSubtaskPending: isRenamePending } = useRenameSubtask({ boardId, taskId: task.id });
    const { deleteSubtask, isSubtaskPending: isDeletePending } = useDeleteSubtask({ boardId, taskId: task.id });
    const [draftRowIds, setDraftRowIds] = useState<string[]>([]);

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

                        {subtasks.map((subtask, index) => {
                            return (
                                <SubtaskEditorRow
                                    key={subtask.id}
                                    title={subtask.title}
                                    isDraft={false}
                                    rowLabel={`Subtask ${String(index + 1)}`}
                                    isPending={isRenamePending(subtask.id) || isDeletePending(subtask.id)}
                                    onCommit={(title) => renameSubtask({ subtaskId: subtask.id, title })}
                                    onRemove={() => {
                                        deleteSubtask(subtask.id);
                                    }}
                                />
                            );
                        })}

                        {draftRowIds.map((draftId, index) => {
                            return (
                                <SubtaskEditorRow
                                    key={draftId}
                                    title=""
                                    isDraft={true}
                                    rowLabel={`Subtask ${String(subtasks.length + index + 1)}`}
                                    isPending={isCreatingSubtask(draftId)}
                                    onCommit={async (title) => {
                                        const { didCreate } = await createSubtask({ clientId: draftId, title });

                                        if (didCreate) {
                                            setDraftRowIds((current) => current.filter((id) => id !== draftId));
                                        }

                                        return didCreate;
                                    }}
                                    onRemove={() => {
                                        setDraftRowIds((current) => current.filter((id) => id !== draftId));
                                    }}
                                />
                            );
                        })}

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setDraftRowIds((current) => [...current, crypto.randomUUID()]);
                            }}
                        >
                            + Add New Subtask
                        </Button>
                    </div>

                    <Modal.Footer>
                        <Button type="submit" variant="primary" isLoading={isPending} className="w-full">
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
