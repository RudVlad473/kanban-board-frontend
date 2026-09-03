"use server";

import { refresh } from "next/cache";

import { moveTaskInputSchema, type MoveTaskInput } from "@/features/tasks/schemas";
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
 * `moveTaskAction`'s own result — bare discriminants only, so nothing the backend said can reach the
 * rollback toast (T-04-05). No `DUPLICATE` branch: a move carries no name, so the one uniqueness the
 * contract could complain about is unreachable from here.
 */
export type MoveTaskResult = ActionResult<
    { task: Task },
    typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.NOT_FOUND
>;

/**
 * TASK-04's write path, ordered exactly as `reorderColumnAction` orders its own: session, then
 * parse, then the upstream call. `userId` comes only from the verified session record, never from
 * this function's argument, even though the contract declares it client-suppliable (T-04-02).
 */
export const moveTaskAction = async ({
    taskId,
    targetColumnId,
    version,
    targetPosition,
}: MoveTaskInput): Promise<MoveTaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-04-01, T-04-06, see docs/adr/tech/0024).
     */
    const parsed = moveTaskInputSchema.safeParse({ taskId, targetColumnId, version, targetPosition });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.PATCH(EXTERNAL_PATH.TASK_MOVE, {
        params: {
            /*
             * Every segment is written explicitly because the serializer skips a missing path
             * parameter rather than throwing (04-RESEARCH Pitfall 2). This is the one task operation
             * that declares all of its own; the others in this feature omit up to three ancestors.
             */
            path: { taskId: parsed.data.taskId },
            query: { userId: record.id },
        },
        body: {
            targetColumnId: parsed.data.targetColumnId,
            version: parsed.data.version,
            /* Always sent: T3 observed omitting it means "append", not "keep position". */
            targetPosition: parsed.data.targetPosition,
        },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `reorderColumnAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        // comment-length-exempt: records why the re-read belongs in the action rather than the hook — a settled placement decision a future reader would otherwise relocate (docs/adr/tech/0023)
        /*
         * The re-read, and the one line this action adds over its Phase 3 analog: a conflict
         * means the server holds something this screen does not, so reverting alone would leave the
         * user looking at data known to be wrong. It belongs here rather than in the hook because
         * docs/adr/tech/0019 keeps every `refresh()` inside an action — moving it out would pull
         * client navigation into four more browser test files.
         */
        if (status === RESULT_STATUS.CONFLICT) {
            refresh();
        }

        /*
         * A move sends no title, so the shared mapper's `DUPLICATE` branch is unreachable here —
         * folded into `ERROR` rather than given a dead branch every caller would have to handle,
         * exactly as `reorderColumnAction` folds its own.
         */
        return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
    }

    /*
     * The tasks-less mutation-response schema, never `taskFullSchema`: `TaskResponseDTO` carries no
     * `subtasks` array, so the full shape would fail on every successful call (Pitfall 3). It
     * carries no `columnId` either, so the caller must hold on to the destination itself.
     */
    const task = taskSchema.safeParse(data);
    if (!task.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * The refresh belongs inside the action, not in the calling hook (docs/adr/tech/0019) — the
     * refreshed props are what retire the optimistic override.
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, task: task.data };
};
