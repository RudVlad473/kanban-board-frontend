"use server";

import { refresh } from "next/cache";

import { columnSchema, createColumnInputSchema, type Column } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `createColumnAction`'s own result — bare discriminants only, so nothing the backend said can
 * reach the modal's inline copy (T-03-03). `DUPLICATE` is carried from the start because plan
 * 03-07 wires its user-facing branch, and adding it later would mean re-editing this file.
 */
export type CreateColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS; column: Column }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

/**
 * COLUMN-01's write path, ordered exactly as `renameBoardAction` orders its own: session, then
 * parse, then the upstream call. No position is sent and none is needed — the backend derives it
 * from call order (02-BACKEND-FACTS.md P5), which is what appends a new column at the end (D-01).
 */
export const createColumnAction = async ({
    boardId,
    name,
}: {
    boardId: string;
    name: string;
}): Promise<CreateColumnResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-03-01, see docs/adr/tech/0024).
     */
    const parsed = createColumnInputSchema.safeParse({ boardId, name });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    /*
     * `boardId` is written out even though the generated `path` type for the column endpoints omits
     * it: omitting it compiles cleanly and silently produces a URL carrying the literal placeholder
     * (03-RESEARCH.md Pitfall 2). `userId` comes only from the session record (T-03-02).
     */
    const { data, error } = await externalApi.POST(EXTERNAL_PATH.BOARD_COLUMNS, {
        params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
        body: { name: parsed.data.name },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `renameBoardAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        /*
         * A create carries no `version`, so an optimistic-lock 409 is unreachable here — folded
         * into `ERROR` rather than carried as a branch no hook could author honest copy for.
         */
        return { status: status === RESULT_STATUS.CONFLICT ? RESULT_STATUS.ERROR : status };
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
     * This call is what puts the new swimlane on the board: the refresh belongs inside the action,
     * not in the calling hook (docs/adr/tech/0019, 03-RESEARCH.md Pitfall 7).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, column: column.data };
};
