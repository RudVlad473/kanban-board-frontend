"use server";

// Covered by: `src/features/tasks/actions/create-task-subtasks-action.integration.test.ts` (same path/body per item)

import { isNil } from "es-toolkit";
import { refresh } from "next/cache";

import { createSubtaskInputSchema } from "@/features/tasks/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { subtaskSchema, type Subtask } from "@/lib/core/api-contract/task-schemas";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `createSubtaskAction`'s own result — bare discriminants only (T-04-05). SUBTASK-01's
 * add-a-subtask-to-an-existing-task path; the fan-out `createTaskSubtasksAction` runs its own
 * loop rather than calling this per item, mirroring `createBoardColumnsAction`'s own precedent.
 */
export type CreateSubtaskResult = ActionResult<{ subtask: Subtask }, typeof RESULT_STATUS.NOT_FOUND>;

/** SUBTASK-01's write path, ordered exactly as `createTaskAction` orders its own. */
export const createSubtaskAction = async ({
    boardId,
    columnId,
    taskId,
    title,
}: {
    boardId: string;
    columnId: string;
    taskId: string;
    title: string;
}): Promise<CreateSubtaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    const parsed = createSubtaskInputSchema.safeParse({ boardId, columnId, taskId, title });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    /*
     * All three ancestor segments are written explicitly, even though the generated type only
     * requires `taskId` — the serializer skips a missing one rather than throwing (Pitfall 2).
     */
    const { data, error } = await externalApi.POST(EXTERNAL_PATH.TASK_SUBTASKS, {
        params: {
            path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId, taskId: parsed.data.taskId },
            query: { userId: record.id },
        },
        body: { title: parsed.data.title },
    });

    const upstreamError: unknown = error;
    if (!isNil(upstreamError)) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        /* A create carries no `version` and no uniqueness rule — both fold into `ERROR`. */
        return {
            status:
                status === RESULT_STATUS.CONFLICT || status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status,
        };
    }

    const subtask = subtaskSchema.safeParse(data);
    if (!subtask.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    refresh();

    return { status: RESULT_STATUS.SUCCESS, subtask: subtask.data };
};
