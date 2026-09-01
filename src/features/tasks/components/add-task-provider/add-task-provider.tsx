"use client";

import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { useBoolean } from "usehooks-ts";

import { AddTaskModal } from "@/features/tasks/components/add-task-modal/add-task-modal";
import {
    AddTaskTargetContext,
    type AddTaskTarget,
    type AddTaskTargetStore,
} from "@/features/tasks/hooks/use-add-task-target";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import type { AddTaskSubmitValues } from "@/features/tasks/schemas";

/**
 * S-06's bridge: a small client provider holding the open board's columns and the modal's open
 * state, and nothing else — deliberately narrow, mounted in
 * the dashboard layout beside it so it spans both the header's and the board's streaming boundary.
 */
export const AddTaskProvider = ({ children }: PropsWithChildren) => {
    const [target, setTarget] = useState<AddTaskTarget>(null);
    const { value: isOpen, setValue: setIsOpen, setFalse: closeModal } = useBoolean(false);
    /*
     * Bumped on every fresh open and used as the modal's `key`, so each open starts from empty
     * fields — a failed create keeps its value because the modal never closed (mirrors board-view.tsx).
     */
    const [openCount, setOpenCount] = useState(0);
    const { createTask, isPending, errorMessage, clearError } = useCreateTask();

    const reportTarget = useCallback((next: AddTaskTarget) => {
        setTarget(next);
    }, []);

    const handleOpenChange = useCallback(
        (nextIsOpen: boolean): void => {
            setIsOpen(nextIsOpen);
            clearError();

            if (nextIsOpen) {
                setOpenCount((count) => count + 1);
            }
        },
        [clearError, setIsOpen],
    );

    const openModal = useCallback((): void => {
        handleOpenChange(true);
    }, [handleOpenChange]);

    /* Closed as soon as the task itself lands — the subtask fan-out runs behind it (D-07). */
    const handleSubmit = (values: AddTaskSubmitValues): void => {
        if (target === null) {
            return;
        }

        void createTask({
            boardId: target.boardId,
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

    /* Memoised down to its three stable members, so a create's `isPending` toggle never re-renders the header. */
    const store: AddTaskTargetStore = useMemo(
        () => ({ target, openModal, reportTarget }),
        [target, openModal, reportTarget],
    );

    return (
        <AddTaskTargetContext value={store}>
            {children}

            {/*
             * Mounted only once columns exist — the header's button is disabled until then, and
             * mounting earlier would fix `useForm`'s defaultValues against an empty column list.
             */}
            {target === null ? null : (
                <AddTaskModal
                    key={openCount}
                    isOpen={isOpen}
                    onOpenChange={handleOpenChange}
                    onSubmit={handleSubmit}
                    isPending={isPending}
                    errorMessage={errorMessage}
                    columns={target.columns}
                />
            )}
        </AddTaskTargetContext>
    );
};
