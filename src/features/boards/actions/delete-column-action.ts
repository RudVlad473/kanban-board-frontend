"use server";

import { refresh } from "next/cache";

import { deleteColumnInputSchema } from "@/features/boards/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `deleteColumnAction`'s own result — bare discriminants only, so nothing the backend said can
 * reach the failure toast (T-03-03). `CONFLICT` is a real branch here, unlike `deleteBoardAction`'s
 * single generic failure, because the UI-SPEC needs a distinct stale-version message.
 */
export type DeleteColumnResult = ActionResult<unknown, typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.NOT_FOUND>;

/**
 * COLUMN-04's write path, ordered exactly as `deleteBoardAction` orders its own: session, then
 * parse, then the upstream call. `userId` comes only from the verified session record, never from
 * this function's argument, even though the contract declares it client-suppliable (T-03-09).
 */
export const deleteColumnAction = async ({
    boardId,
    columnId,
}: {
    boardId: string;
    columnId: string;
}): Promise<DeleteColumnResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, and these two ids are the entire
     * untrusted surface of the one operation here that cannot be undone (T-03-01, ADR tech/0024).
     */
    const parsed = deleteColumnInputSchema.safeParse({ boardId, columnId });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { error } = await externalApi.DELETE(EXTERNAL_PATH.COLUMN_DETAIL, {
        params: {
            /*
             * The generated `path` type omits `boardId`, and the serializer skips a missing path
             * parameter rather than throwing — so writing it is load-bearing (T-03-21).
             */
            path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId },
            query: { userId: record.id },
        },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `deleteBoardAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        /*
         * Routed through the shared mapping, unlike the board delete's bare status: the UI-SPEC
         * needs a stale `version` distinguishable from a generic refusal, and a double submit
         * arrives as `ENTITY_NOT_FOUND` (03-BACKEND-FACTS R7) rather than a conflict of its own.
         */
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        /* A delete names nothing, so `DUPLICATE_RESOURCE` cannot describe one — folded, not exposed. */
        return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
    }

    /*
     * The endpoint declares no response body, so nothing is parsed on the way back — which is
     * exactly why the session check and the server-derived id above are not optional: this call
     * cascades to every task and subtask the column held, irreversibly (ADR domain/0002).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS };
};
