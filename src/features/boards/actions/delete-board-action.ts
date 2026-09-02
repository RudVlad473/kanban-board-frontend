"use server";

import { refresh } from "next/cache";

import { deleteBoardInputSchema } from "@/features/boards/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `deleteBoardAction`'s own result — every failure branch is a bare discriminant, so no upstream
 * response text can reach the failure toast (T-02-69, D-21). D-09 wants one generic failure here,
 * deliberately unlike rename's per-code branches: nothing was changed, so there is nothing to explain.
 */
export type DeleteBoardResult = ActionResult;

/**
 * BOARD-05's write path, ordered exactly as `renameBoardAction` orders its own: session, then parse,
 * then the upstream call. `userId` comes only from the verified session record, never from this
 * function's argument, even though the contract declares it client-suppliable (T-02-64).
 */
export const deleteBoardAction = async ({ boardId }: { boardId: string }): Promise<DeleteBoardResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-02-64, see docs/adr/tech/0024).
     */
    const parsed = deleteBoardInputSchema.safeParse({ boardId });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { error } = await externalApi.DELETE(EXTERNAL_PATH.BOARD_DETAIL, {
        params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `renameBoardAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * The endpoint declares no response body, so nothing is parsed on the way back — which is
     * exactly why the session check and the server-derived id above are not optional: this is the
     * one endpoint in the phase whose successful execution cannot be undone (ADR domain/0002).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS };
};
