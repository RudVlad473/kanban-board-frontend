"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { AddTaskModal } from "@/features/tasks/components/add-task-modal/add-task-modal";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import { useOpenBoardColumns } from "@/features/tasks/hooks/use-open-board-columns";
import type { AddTaskSubmitValues } from "@/features/tasks/schemas";

/** The ONE task-creation entry point, and the modal it opens. */
export const AddTaskButton = () => {
    const { boardId: openBoardId, columns } = useOpenBoardColumns();
    /*
     * The board the modal was opened on, not a bare boolean: this header outlives a board-to-board
     * navigation, so an open modal would otherwise survive one and submit the previous board's
     * `columnId`. Comparing against the live board closes it the way `BoardView`'s unmount used to.
     */
    const [modalBoardId, setModalBoardId] = useState<string | null>(null);
    const { createTask, isPending, errorMessage, clearError } = useCreateTask();

    const isOpen = modalBoardId !== null && modalBoardId === openBoardId;

    /*
     * Disabled with no board open or a board with zero columns — `addTaskByColumnId` is
     * column-scoped, so there is nowhere to post. Never on an UNKNOWN column list, which is what the
     * server render sees and what a hydration mismatch is made of.
     */
    const isCreateDisabled = columns?.length === 0;

    const closeModal = (): void => {
        setModalBoardId(null);
        clearError();
    };

    /* Closed as soon as the task itself lands — the subtask fan-out runs behind it. */
    const handleSubmit = (values: AddTaskSubmitValues): void => {
        if (modalBoardId === null) {
            return;
        }

        void createTask({
            boardId: modalBoardId,
            columnId: values.columnId,
            title: values.title,
            description: values.description,
            subtaskTitles: values.subtasks,
        }).then((outcome) => {
            if (outcome.didCreate) {
                setModalBoardId(null);
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
                    setModalBoardId(openBoardId);
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
                    columns={columns ?? []}
                />
            ) : null}
        </>
    );
};
