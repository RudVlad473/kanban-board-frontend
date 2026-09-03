"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { isNil } from "es-toolkit";
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
    /*
     * What a failed create is reopened with, so closing on submit costs the user nothing (D-05,
     * reversed 2026-09-03). Null on every fresh open, which is what makes those start empty.
     */
    const [retryValues, setRetryValues] = useState<AddTaskSubmitValues | null>(null);
    const { createTask } = useCreateTask({
        onRetry: ({ boardId, columnId, title, description, subtaskTitles }) => {
            setRetryValues({ columnId, title, description, subtasks: subtaskTitles });
            setModalBoardId(boardId);
        },
    });

    /*
     * Waits for a KNOWN column list: `AddTaskModal` reads `columns.at(0)` once, in `useForm`'s
     * `defaultValues`, so mounting against an absent entry pins `columnId` to `""` for the modal's
     * whole life and `Create Task` silently does nothing.
     */
    const isOpen = modalBoardId !== null && modalBoardId === openBoardId && !isNil(columns) && columns.length > 0;

    /*
     * Disabled with no board open or a board with zero columns — `addTaskByColumnId` is
     * column-scoped, so there is nowhere to post. Never on an UNKNOWN column list, which is what the
     * server render sees and what a hydration mismatch is made of.
     */
    const isCreateDisabled = columns?.length === 0;

    const closeModal = (): void => {
        setModalBoardId(null);
    };

    /*
     * Closed BEFORE the create is issued, so the optimistic card is what the user sees next rather
     * than a dimmed backdrop held for the whole round trip. A refusal rolls the card back and
     * toasts a Retry; nothing is left for the modal to report.
     */
    const handleSubmit = (values: AddTaskSubmitValues): void => {
        if (modalBoardId === null) {
            return;
        }

        const boardId = modalBoardId;
        setModalBoardId(null);

        void createTask({
            boardId,
            columnId: values.columnId,
            title: values.title,
            description: values.description,
            subtaskTitles: values.subtasks,
        });
    };

    return (
        <>
            <Button
                type="button"
                variant="primary"
                isDisabled={isCreateDisabled}
                onClick={() => {
                    setRetryValues(null);
                    setModalBoardId(openBoardId);
                }}
            >
                + Add New Task
            </Button>

            {/* Mounted only while open, so each open re-seeds the form from `retryValues`. */}
            {isOpen ? (
                <AddTaskModal
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    /* Never pending: the modal no longer outlives the submit that closes it. */
                    isPending={false}
                    columns={columns}
                    defaultValues={
                        retryValues !== null
                            ? {
                                  title: retryValues.title,
                                  description: retryValues.description,
                                  columnId: retryValues.columnId,
                              }
                            : undefined
                    }
                    defaultSubtasks={retryValues?.subtasks}
                />
            ) : null}
        </>
    );
};
