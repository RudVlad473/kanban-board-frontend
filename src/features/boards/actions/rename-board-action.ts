"use server";

import { refresh } from "next/cache";

import { boardSchema, renameBoardInputSchema, type Board } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `renameBoardAction`'s own result — every failure branch carries this project's own discriminant
 * and nothing else, so no upstream response text can reach the rollback toast (T-02-61, D-21).
 */
export type RenameBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: Board }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

/**
 * BOARD-04's write path, ordered exactly as `createBoardAction` orders its own: session, then
 * parse, then the upstream call. `userId` comes only from the verified session record, never from
 * this function's argument, even though the contract declares it client-suppliable (T-02-57).
 */
export const renameBoardAction = async ({
    boardId,
    name,
    version,
}: {
    boardId: string;
    name: string;
    version: number;
}): Promise<RenameBoardResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-02-59, see docs/adr/tech/0024).
     */
    const parsed = renameBoardInputSchema.safeParse({ boardId, name, version });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.PUT(EXTERNAL_PATH.BOARD_DETAIL, {
        params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
        body: { name: parsed.data.name, version: parsed.data.version },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `createBoardAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        /*
         * Named branches, never upstream text: the shared mapping selects one of this project's own
         * discriminants and the caller authors the copy (T-02-61). `CONFLICT` is what SYNC-01
         * (Phase 4) will hang reconciliation from; no reconciliation behaviour is built now.
         */
        return { status: mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code) };
    }

    /*
     * `BoardResponseDTO` declares no `required` array, so every field is optional at the type level
     * regardless of what the backend actually sent — `.safeParse`, never `.parse` (T-02.1-03).
     */
    const board = boardSchema.safeParse(data);
    if (!board.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * This call is what puts the new name in the sidebar: `app/(dashboard)/layout.tsx` is a
     * persistent layout that does not re-render on ordinary navigation (docs/adr/tech/0019).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, board: board.data };
};
