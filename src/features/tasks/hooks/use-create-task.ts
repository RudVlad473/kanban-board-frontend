"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { NO_AUTO_DISMISS, useToast } from "@/components/ui/toast/use-toast";
import { createTaskAction } from "@/features/tasks/actions/create-task-action";
import { createTaskSubtasksAction } from "@/features/tasks/actions/create-task-subtasks-action";
import { withTaskInsert, withTaskReplace, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Only the part of the board entry a create touches. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type CreatableBoard = { columns: TaskColumn[] };

/*
 * Authored copy only — the actions return bare discriminants, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract).
 */
const CREATE_FAILURE_COPY = { title: "Couldn't create task.", description: "Try again." };

const CREATE_SESSION_EXPIRED_COPY = {
    title: "Your session has expired.",
    description: "Sign in again to create a task.",
};

const SUBTASK_SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again to add these subtasks.";

const RETRY_ACTION_LABEL = "Retry";

const buildSubtaskFailureTitle = (failedCount: number): string => `Couldn't create ${String(failedCount)} subtask(s).`;

/**
 * A stable, task-scoped toast id — Base UI's manager upserts on an existing id, which is what
 * makes a retry narrow one toast instead of stacking a second beside a stale first.
 */
export const buildSubtaskFailureToastId = (taskId: string): string => `task-subtasks-failed:${taskId}`;

/**
 * One id per ATTEMPT — every field the Retry hands back.
 *
 * Base UI upserts on a repeated id, so a field left out lets a later attempt swallow an earlier
 * one's Retry, and with it the only route back to those values.
 */
export const buildCreateFailureToastId = ({
    boardId,
    columnId,
    title,
    description,
    subtaskTitles,
}: CreateTaskArgs): string =>
    `task-create-failed:${JSON.stringify([boardId, columnId, title, description, subtaskTitles])}`;

export type CreateTaskArgs = {
    boardId: string;
    columnId: string;
    title: string;
    description: string;
    subtaskTitles: string[];
};

/** What the create mutation is called with — the placeholder's id rides along so `onSuccess` can find it. */
type CreateTaskVariables = { boardId: string; columnId: string; title: string; description: string; clientId: string };

/** What one fan-out attempt leaves behind: the titles still missing, and whether retrying can help. */
type SubtaskFanOutOutcome = { failedTitles: string[]; isSessionExpired: boolean };

type SubtaskFanOutArgs = { boardId: string; columnId: string; taskId: string; titles: string[] };

/**
 * TASK-01's create orchestration, optimistic all the way to the modal (D-05, reversed 2026-09-03).
 * The caller closes on submit and never waits, so a task failure rolls the card back and reports
 * through a toast whose Retry hands the attempted values back for a prefilled reopen.
 */
export const useCreateTask = ({ onRetry }: { onRetry: (args: CreateTaskArgs) => void }) => {
    const toast = useToast();
    /*
     * The subtask failure toast keeps the default auto-dismiss, so its Retry stays clickable for
     * ~5s — without this, a second click fans the same titles out twice and duplicates subtasks.
     */
    const taskIdsBeingRetried = useRef(new Set<string>());

    const queryClient = useQueryClient();

    /*
     * TASK-01's optimistic insert (docs/adr/tech/0030). Only the task itself is staged: the subtask
     * fan-out below runs behind a closed modal and against a task the server already owns, so its
     * rows land through the action's own `refresh()` rather than through a second placeholder.
     */
    const createTaskMutation = useMutation({
        mutationFn: async ({ boardId, columnId, title, description }: CreateTaskVariables) => {
            const result = await createTaskAction({ boardId, columnId, title, description });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, columnId, clientId, title, description }: CreateTaskVariables) => {
            const queryKey = buildBoardQueryKey(boardId);
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });
            const previousBoard = queryClient.getQueryData<CreatableBoard>(queryKey);

            /* `version` is inert placeholder filler — the server owns it, and success replaces it. */
            queryClient.setQueryData<CreatableBoard>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: withTaskInsert({
                              columns: current.columns,
                              columnId,
                              task: {
                                  id: clientId,
                                  title,
                                  description: description !== "" ? description : undefined,
                                  version: 0,
                                  position: current.columns.find((column) => column.id === columnId)?.tasks.length ?? 0,
                                  subtasks: [],
                              },
                          }),
                      },
            );

            return { previousBoard };
        },

        /* The rollback only; `createTask` below raises the toast, which needs the refusal's status. */
        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (_error: unknown, { boardId }: CreateTaskVariables, context) => {
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(buildBoardQueryKey(boardId), context.previousBoard);
            }
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSuccess positionally (ADR tech/0016 exemption)
        onSuccess: ({ task }, { boardId, clientId }) => {
            /* MERGED, never assigned — `TaskResponseDTO` carries no `subtasks` (docs/adr/tech/0030 rule 2). */
            queryClient.setQueryData<CreatableBoard>(buildBoardQueryKey(boardId), (current) =>
                current === undefined
                    ? current
                    : { ...current, columns: withTaskReplace({ columns: current.columns, taskId: clientId, task }) },
            );
        },
    });
    const createSubtasksMutation = useMutation({ mutationFn: createTaskSubtasksAction, retry: false });

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
            ...(!isSessionExpired
                ? {
                      actionProps: {
                          children: RETRY_ACTION_LABEL,
                          onClick: () => {
                              void retrySubtasks({ boardId, columnId, taskId, titles: failedTitles });
                          },
                      },
                  }
                : {}),
        });
    };

    /** Reports a task that never landed, offering the reopen that carries the typed values back. */
    const raiseCreateFailureToast = ({ args, status }: { args: CreateTaskArgs; status: ResultStatus }): void => {
        const isSessionExpired = status === RESULT_STATUS.UNAUTHENTICATED;
        const toastId = buildCreateFailureToastId(args);

        toast.add({
            id: toastId,
            type: "danger",
            timeout: NO_AUTO_DISMISS,
            ...(isSessionExpired ? CREATE_SESSION_EXPIRED_COPY : CREATE_FAILURE_COPY),
            /* An expired session names itself: a Retry there could only reopen a modal that fails again. */
            ...(!isSessionExpired
                ? {
                      actionProps: {
                          children: RETRY_ACTION_LABEL,
                          onClick: () => {
                              toast.close(toastId);
                              onRetry(args);
                          },
                      },
                  }
                : {}),
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

    const createTask = async (args: CreateTaskArgs): Promise<void> => {
        const { boardId, columnId, title, description, subtaskTitles } = args;

        const outcome = await createTaskMutation
            .mutateAsync({ boardId, columnId, title, description, clientId: crypto.randomUUID() })
            .then((result) => ({ didCreate: true as const, task: result.task }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        if (!outcome.didCreate) {
            raiseCreateFailureToast({ args, status: outcome.status });
            return;
        }

        /* The SERVER's id, never the placeholder's — the fan-out below posts children against it. */
        const taskId = outcome.task.id;

        /*
         * Fire-and-forget: the modal closed at submit, so nothing is waiting on this — and D-07
         * keeps whatever fan-out lands regardless of when the caller stopped watching.
         */
        if (subtaskTitles.length > 0) {
            void createSubtasks({ boardId, columnId, taskId, titles: subtaskTitles }).then((outcome) => {
                if (outcome.failedTitles.length > 0) {
                    raiseSubtaskFailureToast({ boardId, columnId, taskId, ...outcome });
                }
            });
        }
    };

    return { createTask };
};
