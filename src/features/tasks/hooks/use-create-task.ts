"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { createTaskAction } from "@/features/tasks/actions/create-task-action";
import { createTaskSubtasksAction } from "@/features/tasks/actions/create-task-subtasks-action";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the actions return bare discriminants, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract).
 */
const GENERIC_CREATE_FAILURE_MESSAGE = "Couldn't create task. Try again.";

const CREATE_FAILURE_MESSAGE: Partial<Record<ResultStatus, string>> = {
    [RESULT_STATUS.UNAUTHENTICATED]: "Your session has expired. Sign in again to create a task.",
};

const SUBTASK_SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again to add these subtasks.";

const RETRY_ACTION_LABEL = "Retry";

const buildSubtaskFailureTitle = (failedCount: number): string => `Couldn't create ${String(failedCount)} subtask(s).`;

/**
 * A stable, task-scoped toast id — Base UI's manager upserts on an existing id, which is what
 * makes a retry narrow one toast instead of stacking a second beside a stale first (D-04).
 */
export const buildSubtaskFailureToastId = (taskId: string): string => `task-subtasks-failed:${taskId}`;

export type CreateTaskOutcome =
    /** The task itself was created; the subtask fan-out (if any) runs behind the closed modal. */
    | { didCreate: true; taskId: string }
    /** D-05: nothing was created, so the modal stays open with the entered values intact. */
    | { didCreate: false };

export type CreateTaskArgs = {
    boardId: string;
    columnId: string;
    title: string;
    description: string;
    subtaskTitles: string[];
};

/** What one fan-out attempt leaves behind: the titles still missing, and whether retrying can help. */
type SubtaskFanOutOutcome = { failedTitles: string[]; isSessionExpired: boolean };

type SubtaskFanOutArgs = { boardId: string; columnId: string; taskId: string; titles: string[] };

/**
 * TASK-01's create orchestration, in the request-response shape `useCreateColumn` uses: a task
 * failure is reported inline, never a toast (D-05). D-07's subtask fan-out runs after the task
 * lands without blocking the caller's close, keeping whatever landed and toasting the rest.
 */
export const useCreateTask = () => {
    const toast = useToast();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    /*
     * The failure toast has no auto-dismiss, so its Retry stays mounted and clickable for the whole
     * retry — without this, a second click fans the same titles out twice and duplicates subtasks.
     */
    const taskIdsBeingRetried = useRef(new Set<string>());

    const createTaskMutation = useMutation({ mutationFn: createTaskAction, retry: false });
    const createSubtasksMutation = useMutation({ mutationFn: createTaskSubtasksAction, retry: false });

    const clearError = useCallback((): void => {
        setErrorMessage(null);
    }, []);

    /** Runs the subtask phase for exactly the titles given, reporting what still failed and why. */
    const createSubtasks = async ({
        boardId,
        columnId,
        taskId,
        titles,
    }: SubtaskFanOutArgs): Promise<SubtaskFanOutOutcome> => {
        const result = await createSubtasksMutation
            .mutateAsync({ boardId, columnId, taskId, titles })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status === RESULT_STATUS.SUCCESS) {
            return { failedTitles: result.failedTitles, isSessionExpired: false };
        }

        // A wholesale failure leaves the set unchanged rather than reporting fewer failures than there are.
        return { failedTitles: titles, isSessionExpired: result.status === RESULT_STATUS.UNAUTHENTICATED };
    };

    const raiseSubtaskFailureToast = ({
        boardId,
        columnId,
        taskId,
        failedTitles,
        isSessionExpired,
    }: Omit<SubtaskFanOutArgs, "titles"> & SubtaskFanOutOutcome): void => {
        toast.add({
            id: buildSubtaskFailureToastId(taskId),
            type: "danger",
            /* An expired session names itself: the generic count would send the user to a Retry that can only fail again. */
            title: isSessionExpired ? SUBTASK_SESSION_EXPIRED_MESSAGE : buildSubtaskFailureTitle(failedTitles.length),
            // No auto-dismiss: a kept-but-incomplete create must stay visible until acted on.
            timeout: 0,
            ...(isSessionExpired
                ? {}
                : {
                      actionProps: {
                          children: RETRY_ACTION_LABEL,
                          onClick: () => {
                              void retrySubtasks({ boardId, columnId, taskId, titles: failedTitles });
                          },
                      },
                  }),
        });
    };

    /** Re-runs the subtask phase for exactly the still-failing titles, upserting the same toast id. */
    const retrySubtasks = async ({ boardId, columnId, taskId, titles }: SubtaskFanOutArgs): Promise<void> => {
        if (taskIdsBeingRetried.current.has(taskId)) {
            return;
        }

        taskIdsBeingRetried.current.add(taskId);

        try {
            const outcome = await createSubtasks({ boardId, columnId, taskId, titles });

            if (outcome.failedTitles.length === 0) {
                toast.close(buildSubtaskFailureToastId(taskId));
                return;
            }

            raiseSubtaskFailureToast({ boardId, columnId, taskId, ...outcome });
        } finally {
            taskIdsBeingRetried.current.delete(taskId);
        }
    };

    const createTask = async ({
        boardId,
        columnId,
        title,
        description,
        subtaskTitles,
    }: CreateTaskArgs): Promise<CreateTaskOutcome> => {
        setErrorMessage(null);

        const result = await createTaskMutation
            .mutateAsync({ boardId, columnId, title, description })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            setErrorMessage(CREATE_FAILURE_MESSAGE[result.status] ?? GENERIC_CREATE_FAILURE_MESSAGE);
            return { didCreate: false };
        }

        const taskId = result.task.id;

        /*
         * Fire-and-forget: the caller closes the modal on `didCreate: true` without waiting for
         * this — the children cannot exist before the task does, but the task itself is already
         * real, and D-07 keeps whatever fan-out lands regardless of when the caller stops watching.
         */
        if (subtaskTitles.length > 0) {
            void createSubtasks({ boardId, columnId, taskId, titles: subtaskTitles }).then((outcome) => {
                if (outcome.failedTitles.length > 0) {
                    raiseSubtaskFailureToast({ boardId, columnId, taskId, ...outcome });
                }
            });
        }

        return { didCreate: true, taskId };
    };

    return {
        createTask,
        isPending: createTaskMutation.isPending,
        errorMessage,
        clearError,
    };
};
