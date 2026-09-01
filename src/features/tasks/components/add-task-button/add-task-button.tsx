"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { skipToken, useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { AddTaskModal } from "@/features/tasks/components/add-task-modal/add-task-modal";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import type { AddTaskSubmitValues } from "@/features/tasks/schemas";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

/*
 * Only the part of the board entry this reads. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing (mirrors `use-move-task.ts`).
 */
type AddTaskBoard = { columns: { id: string; name: string }[] };

/**
 * S-06's ONE task-creation entry point, and its modal.
 *
 * No provider and no report-upward channel: the open board's columns are already in the shared
 * `["board", boardId]` entry that every column and task write updates (docs/adr/tech/0030), so this
 * reads them the same way the header reads the board title — the QueryClient is the shared owner.
 * `skipToken` makes that a pure cache read: this renders above the board page's `HydrationBoundary`,
 * and an enabled observer would fetch a board that is about to hydrate one commit later.
 */
export const AddTaskButton = () => {
    const openBoardId = toBoardIdFromPath(usePathname());
    const { data: board } = useQuery<AddTaskBoard>({
        queryKey: buildBoardQueryKey(openBoardId ?? ""),
        queryFn: skipToken,
    });
    const [isOpen, setIsOpen] = useState(false);
    const { createTask, isPending, errorMessage, clearError } = useCreateTask();

    const columns = board?.columns ?? [];
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

            {/*
             * Mounted only while open, so each open starts from empty fields and `useForm`'s
             * defaultValues never pin to an empty column list — a failed create keeps its values
             * because this stays mounted until the create lands.
             */}
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
