"use client";

import { useCallback, useState, type PropsWithChildren } from "react";
import { useBoolean } from "usehooks-ts";

import { AddTaskModal } from "@/features/tasks/components/add-task-modal/add-task-modal";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import {
    TaskCreationContext,
    type TaskCreationState,
    type TaskCreationStore,
} from "@/features/tasks/hooks/use-task-creation";
import type { AddTaskSubmitValues } from "@/features/tasks/schemas";

/**
 * S-06's bridge: a small client provider holding the open board's columns and the modal's open
 * state, and nothing else — mirrors `RenameOverrideProvider`'s deliberate narrowness, mounted in
 * the dashboard layout beside it so it spans both the header's and the board's streaming boundary.
 */
export const TaskCreationProvider = ({ children }: PropsWithChildren) => {
    const [state, setState] = useState<TaskCreationState>(null);
    const { value: isOpen, setValue: setIsOpen, setFalse: closeModal } = useBoolean(false);
    /*
     * Bumped on every fresh open and used as the modal's `key`, so each open starts from empty
     * fields — a failed create keeps its value because the modal never closed (mirrors board-view.tsx).
     */
    const [openCount, setOpenCount] = useState(0);
    const { createTask, isPending, errorMessage, clearError } = useCreateTask();

    const publish = useCallback((next: TaskCreationState) => {
        setState(next);
    }, []);

    const handleOpenChange = (nextIsOpen: boolean): void => {
        setIsOpen(nextIsOpen);
        clearError();

        if (nextIsOpen) {
            setOpenCount((count) => count + 1);
        }
    };

    /* Closed as soon as the task itself lands — the subtask fan-out runs behind it (D-07). */
    const handleSubmit = (values: AddTaskSubmitValues): void => {
        if (state === null) {
            return;
        }

        void createTask({
            boardId: state.boardId,
            columnId: values.columnId,
            title: values.title,
            description: values.description,
            subtaskTitles: values.subtasks,
        }).then((outcome) => {
            if (outcome.didCreate) {
                closeModal();
            }
        });
    };

    /* Not memoized: `clearError` (from `useCreateTask`) is a fresh function every render anyway. */
    const store: TaskCreationStore = {
        state,
        openModal: () => {
            handleOpenChange(true);
        },
        publish,
    };

    return (
        <TaskCreationContext value={store}>
            {children}

            {/*
             * Mounted only once columns exist — the header's button is disabled until then, and
             * mounting earlier would fix `useForm`'s defaultValues against an empty column list.
             */}
            {state === null ? null : (
                <AddTaskModal
                    key={openCount}
                    isOpen={isOpen}
                    onOpenChange={handleOpenChange}
                    onSubmit={handleSubmit}
                    isPending={isPending}
                    errorMessage={errorMessage}
                    columns={state.columns}
                />
            )}
        </TaskCreationContext>
    );
};
