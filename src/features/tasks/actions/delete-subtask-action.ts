"use server";

import { isNil } from "es-toolkit";
import { refresh } from "next/cache";

import { deleteSubtaskInputSchema, type DeleteSubtaskInput } from "@/features/tasks/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `deleteSubtaskAction`'s own result — bare discriminants only (T-04-05), mirroring
 * `deleteColumnAction`. `CONFLICT` stays a real branch for symmetry with the other two subtask
 * writes even though the endpoint takes no `version` to be stale against.
 */
export type DeleteSubtaskResult = ActionResult<unknown, typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.NOT_FOUND>;

/**
 * SUBTASK-04's write path, ordered exactly as `deleteColumnAction` orders its own:
 * Session, then parse, then the upstream call, with `userId` from the session only (T-04-02). A
 * subtask has no children, which is why this delete gets no confirm step, unlike a task's cascade.
 */
export const deleteSubtaskAction = async ({
    boardId,
    columnId,
    taskId,
    subtaskId,
}: DeleteSubtaskInput): Promise<DeleteSubtaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-04-01, see docs/adr/tech/0024).
     */
    const parsed = deleteSubtaskInputSchema.safeParse({ boardId, columnId, taskId, subtaskId });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { error } = await externalApi.DELETE(EXTERNAL_PATH.SUBTASK_DETAIL, {
        params: {
            /*
             * The generated `path` type declares only `subtaskId` — T2 found the other three
             * ancestor segments entirely inert, but they are written anyway as the documented URL.
             */
            path: {
                boardId: parsed.data.boardId,
                columnId: parsed.data.columnId,
                taskId: parsed.data.taskId,
                subtaskId: parsed.data.subtaskId,
            },
            query: { userId: record.id },
        },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `deleteColumnAction`.
     */
    const upstreamError: unknown = error;
    if (!isNil(upstreamError)) {
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

        /* A delete names nothing, so `DUPLICATE` cannot describe one — folded, not exposed. */
        return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
    }

    /*
     * The endpoint declares no response body, so nothing is parsed on the way back — which is
     * exactly why the session check and the server-derived id above are the whole untrusted
     * surface here: a subtask destroys nothing beneath it.
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS };
};
