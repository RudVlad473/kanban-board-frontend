"use server";

import { refresh } from "next/cache";

import { updateTaskInputSchema } from "@/features/tasks/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { taskSchema, type Task } from "@/lib/core/api-contract/task-schemas";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `updateTaskAction`'s own result — bare discriminants only (T-04-05). `CONFLICT` is real here,
 * unlike the create path, since this call carries a `version`; no `DUPLICATE`, since a task title
 * carries no uniqueness rule this UI authors copy for (matches `createTaskAction`'s own result).
 */
export type UpdateTaskResult = ActionResult<
    { task: Task },
    typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.NOT_FOUND
>;

/**
 * TASK-03's write path, ordered exactly as `renameColumnAction`/`moveTaskAction` order their own:
 * session, then parse, then the upstream call. `userId` comes only from the verified session
 * record, never from this function's argument, even though the contract declares it client-suppliable.
 */
export const updateTaskAction = async ({
    boardId,
    columnId,
    taskId,
    title,
    description,
    version,
}: {
    boardId: string;
    columnId: string;
    taskId: string;
    title: string;
    description?: string;
    version: number;
}): Promise<UpdateTaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-04-01, T-04-23, see docs/adr/tech/0024).
     */
    const parsed = updateTaskInputSchema.safeParse({ boardId, columnId, taskId, title, description, version });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.PUT(EXTERNAL_PATH.TASK_DETAIL, {
        params: {
            /*
             * The generated `path` type omits `boardId`/`columnId`, and the serializer skips a
             * missing path parameter rather than throwing (04-RESEARCH.md Pitfall 2) — writing every
             * segment is load-bearing convention even though T2 found the backend ignores both.
             */
            path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId, taskId: parsed.data.taskId },
            query: { userId: record.id },
        },
        body: {
            title: parsed.data.title,
            /* `undefined` is dropped by JSON.stringify — see the comment beside the schema's own field. */
            description: parsed.data.description,
            version: parsed.data.version,
        },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `moveTaskAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        // comment-length-exempt: records why the re-read belongs in the action rather than the hook — a settled placement decision a future reader would otherwise relocate (docs/adr/tech/0023)
        /*
         * The re-read: a conflict means the server holds something this screen does not, so
         * reverting alone would leave the user looking at data known to be wrong (T-04-06). It
         * belongs here rather than in the hook because docs/adr/tech/0019 keeps every `refresh()`
         * inside an action.
         */
        if (status === RESULT_STATUS.CONFLICT) {
            refresh();
        }

        /* A rename carries no uniqueness rule this UI authors copy for, so `DUPLICATE` folds into `ERROR`. */
        return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
    }

    /*
     * The subtasks-less mutation-response schema, never `taskFullSchema`: `TaskResponseDTO` returns
     * no `subtasks` array, so the full shape would fail on every successful call (Pitfall 3).
     */
    const task = taskSchema.safeParse(data);
    if (!task.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * The refresh belongs inside the action, not in the calling hook (docs/adr/tech/0019) — the
     * refreshed board is what retires the hook's optimistic write.
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, task: task.data };
};
