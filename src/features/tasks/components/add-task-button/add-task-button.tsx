"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { AddTaskModal } from "@/features/tasks/components/add-task-modal/add-task-modal";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import { useOpenBoardColumns } from "@/features/tasks/hooks/use-open-board-columns";
import type { AddTaskSubmitValues } from "@/features/tasks/schemas";

/** S-06's ONE task-creation entry point, and the modal it opens. */
export const AddTaskButton = () => {
    const { boardId: openBoardId, columns } = useOpenBoardColumns();
    const [isOpen, setIsOpen] = useState(false);
    const { createTask, isPending, errorMessage, clearError } = useCreateTask();

    /*
     * Disabled with no board open or a board with zero columns — `addTaskByColumnId` is
     * column-scoped, so there is nowhere to post.
     */
    const isCreateDisabled = openBoardId === null || columns.length === 0;

    const closeModal = (): void => {
        setIsOpen(false);
        clearError();
    };

    /* Closed as soon as the task itself lands — the subtask fan-out runs behind it (D-07). */
    const handleSubmit = (values: AddTaskSubmitValues): void => {
        if (openBoardId === null) {
            return;
        }

        void createTask({
            boardId: openBoardId,
            columnId: values.columnId,
            title: values.title,
            description: values.description,
            subtaskTitles: values.subtasks,
        }).then((outcome) => {
            if (outcome.didCreate) {
                setIsOpen(false);
            }
        });
    };

    return (
        <>
            <Button
                type="button"
                variant="primary"
                isDisabled={isCreateDisabled}
                onClick={() => {
                    setIsOpen(true);
                }}
            >
                + Add New Task
            </Button>

            {/* Mounted only while open, so each open starts from empty fields and `useForm`'s
                defaultValues never pin to an empty column list. */}
            {isOpen ? (
                <AddTaskModal
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    isPending={isPending}
                    errorMessage={errorMessage}
                    columns={columns}
                />
            ) : null}
        </>
    );
};
