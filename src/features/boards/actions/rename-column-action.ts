"use server";

import { isNil } from "es-toolkit";
import { refresh } from "next/cache";

import { columnSchema, renameColumnInputSchema, type Column } from "@/features/boards/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `renameColumnAction`'s own result — bare discriminants only, so nothing the backend said can
 * reach the rollback toast (T-03-03). `CONFLICT` is a real branch here, unlike the create path:
 * this call carries a `version`, so a stale one is reachable.
 */
export type RenameColumnResult = ActionResult<
    { column: Column },
    typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.DUPLICATE | typeof RESULT_STATUS.NOT_FOUND
>;

/**
 * COLUMN-02's write path, ordered exactly as `renameBoardAction` orders its own: session, then
 * parse, then the upstream call. `userId` comes only from the verified session record, never from
 * this function's argument, even though the contract declares it client-suppliable (T-03-05).
 */
export const renameColumnAction = async ({
    boardId,
    columnId,
    name,
    version,
}: {
    boardId: string;
    columnId: string;
    name: string;
    version: number;
}): Promise<RenameColumnResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-03-01, T-03-04, see docs/adr/tech/0024).
     */
    const parsed = renameColumnInputSchema.safeParse({ boardId, columnId, name, version });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.PUT(EXTERNAL_PATH.COLUMN_DETAIL, {
        params: {
            /*
             * The generated `path` type omits `boardId`, and the serializer skips a missing path
             * parameter rather than throwing — so writing it is load-bearing (T-03-21).
             */
            path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId },
            query: { userId: record.id },
        },
        body: { name: parsed.data.name, version: parsed.data.version },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `renameBoardAction`.
     */
    const upstreamError: unknown = error;
    if (!isNil(upstreamError)) {
        return { status: mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code) };
    }

    /*
     * The tasks-less response schema, never the full-column one: `ColumnResponseDTO` returns no
     * `tasks` array, so parsing with the full shape would fail on every successful call.
     */
    const column = columnSchema.safeParse(data);
    if (!column.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * The refresh belongs inside the action, not in the calling hook (docs/adr/tech/0019,
     * 03-RESEARCH.md Pitfall 7) — the refreshed props are what retire the optimistic override.
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, column: column.data };
};
