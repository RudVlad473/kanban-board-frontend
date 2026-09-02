"use server";

import { refresh } from "next/cache";

import { deleteTaskInputSchema } from "@/features/tasks/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `deleteTaskAction`'s own result — bare discriminants only (T-04-40's whole point: nothing the
 * backend said can leak past this, so the confirmation's own copy is the only thing the user reads).
 */
export type DeleteTaskResult =
    | { status: typeof RESULT_STATUS.SUCCESS }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

/**
 * TASK-05's write path, ordered exactly as `deleteColumnAction`: session, then parse, then the
 * upstream call, `userId` from the verified session record only (T-04-02). The server cascades this
 * to every subtask irreversibly (ADR domain/0002, T6) — why `useDeleteTask` waits for it to settle.
 */
export const deleteTaskAction = async ({
    boardId,
    columnId,
    taskId,
}: {
    boardId: string;
    columnId: string;
    taskId: string;
}): Promise<DeleteTaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, and these three ids are the entire
     * untrusted surface of the one operation here that cannot be undone (T-04-01, ADR tech/0024).
     */
    const parsed = deleteTaskInputSchema.safeParse({ boardId, columnId, taskId });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { error } = await externalApi.DELETE(EXTERNAL_PATH.TASK_DETAIL, {
        params: {
            /*
             * The generated `path` type omits `boardId`, and the serializer skips a missing path
             * parameter rather than throwing — so writing it is load-bearing (04-BACKEND-FACTS.md T2).
             */
            path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId, taskId: parsed.data.taskId },
            query: { userId: record.id },
        },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `deleteColumnAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        /*
         * A second delete lands as `ENTITY_NOT_FOUND` (T6), routed through the shared not-found
         * branch rather than the generic fallback (T-04-42) — the same branch a foreign board's
         * `ACCESS_DENIED` already shares, so a caller still cannot tell "forbidden" from "gone".
         */
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        /* A delete names nothing, so `DUPLICATE_RESOURCE` cannot describe one — folded, not exposed. */
        return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
    }

    /*
     * The endpoint declares no response body, so nothing is parsed on the way back — which is
     * exactly why the session check and the server-derived id above are not optional: this call
     * cascades to every subtask the task held, irreversibly (ADR domain/0002).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS };
};
