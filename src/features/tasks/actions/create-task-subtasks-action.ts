"use server";

import { refresh } from "next/cache";

import { createTaskSubtasksInputSchema, subtaskTitleRowSchema } from "@/features/tasks/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `createTaskSubtasksAction`'s own result — `SUCCESS` carries the titles that did NOT land, empty
 * when everything did. A partial result is kept, never rolled back (ADR domain/0003, D-07).
 */
export type CreateTaskSubtasksResult = ActionResult<{ failedTitles: string[] }>;

/**
 * Creates one subtask per title, in order, exactly as `createBoardColumnsAction` creates one
 * column per name. `userId` comes only from the verified session record, never from this
 * function's argument (T-04-02).
 */
export const createTaskSubtasksAction = async ({
    boardId,
    columnId,
    taskId,
    titles,
}: {
    boardId: string;
    columnId: string;
    taskId: string;
    titles: string[];
}): Promise<CreateTaskSubtasksResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    const parsed = createTaskSubtasksInputSchema.safeParse({ boardId, columnId, taskId, titles });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const failedTitles: string[] = [];

    /*
     * Serial by requirement, never `Promise.all`: the children cannot exist before the task does,
     * and the mock's own initial-subtask rows have no ordering guarantee otherwise.
     */
    for (const title of parsed.data.titles) {
        const validTitle = subtaskTitleRowSchema.safeParse(title);
        if (!validTitle.success) {
            // A malformed title never leaves this app's server — recorded as failed, no call made.
            failedTitles.push(title);
            continue;
        }

        const { error } = await externalApi.POST(EXTERNAL_PATH.TASK_SUBTASKS, {
            params: {
                path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId, taskId: parsed.data.taskId },
                query: { userId: record.id },
            },
            body: { title: validTitle.data },
        });

        /*
         * Widened through `unknown` before testing, mirroring `createBoardColumnsAction`; a
         * refusal records this one title and does NOT abort the rest (ADR domain/0003).
         */
        const upstreamError: unknown = error;
        if (upstreamError !== undefined) {
            failedTitles.push(title);
        }
    }

    /* The refresh belongs inside the action, not in the calling hook (docs/adr/tech/0019). */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, failedTitles };
};
