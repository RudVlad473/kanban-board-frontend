"use server";

import { refresh } from "next/cache";

import { createTaskInputSchema } from "@/features/tasks/schemas";
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
 * `createTaskAction`'s own result — bare discriminants only, so nothing the backend said can
 * reach the modal's inline copy (T-04-05). No `DUPLICATE` branch: a task title has no
 * uniqueness rule for this UI to author copy for (unlike `createColumnAction`'s).
 */
export type CreateTaskResult = ActionResult<{ task: Task }, typeof RESULT_STATUS.NOT_FOUND>;

/**
 * TASK-01's write path, ordered exactly as `createColumnAction` orders its own: session, then
 * parse, then the upstream call.
 */
export const createTaskAction = async ({
    boardId,
    columnId,
    title,
    description,
}: {
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
}): Promise<CreateTaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-04-01, see docs/adr/tech/0024).
     */
    const parsed = createTaskInputSchema.safeParse({ boardId, columnId, title, description });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    /*
     * `addTaskByColumnId` posts to the COLUMN resource itself, with no `/tasks` segment naming the
     * child — the sibling path that names it refuses a POST outright (Pitfall 1, T1). Every
     * ancestor is written explicitly regardless, since a missing one is silently skipped (Pitfall 2).
     */
    const { data, error } = await externalApi.POST(EXTERNAL_PATH.COLUMN_DETAIL, {
        params: {
            path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId },
            query: { userId: record.id },
        },
        body: { title: parsed.data.title, description: parsed.data.description },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `createColumnAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        /*
         * A create carries no `version`, so an optimistic-lock 409 is unreachable here, and a task
         * title carries no uniqueness rule this UI authors copy for — both fold into `ERROR`
         * (mirrors `createColumnAction`'s own conflict fold).
         */
        return {
            status:
                status === RESULT_STATUS.CONFLICT || status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status,
        };
    }

    /*
     * The tasks-less mutation-response schema, never `taskFullSchema`: `TaskResponseDTO` carries
     * no `subtasks` array, so the full shape would fail on every successful call (Pitfall 3, T1).
     */
    const task = taskSchema.safeParse(data);
    if (!task.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * This call is what puts the new card on the board: the refresh belongs inside the action, not
     * in the calling hook (docs/adr/tech/0019).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, task: task.data };
};
