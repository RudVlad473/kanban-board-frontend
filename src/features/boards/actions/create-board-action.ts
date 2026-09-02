"use server";

// Covered by: `e2e/boards-create.e2e.spec.ts`

import { refresh } from "next/cache";

import { boardSchema, createBoardInputSchema, type Board } from "@/features/boards/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `createBoardAction`'s own result (T-02-47, D-21). `CONFLICT`/`NOT_FOUND` are declared for parity
 * with `mapProblemCodeToStatus`'s return type, not because a create can reach them — it carries no
 * version and targets no existing id, and narrowing them away would trap a future create contract.
 */
export type CreateBoardResult = ActionResult<
    { board: Board },
    typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.DUPLICATE | typeof RESULT_STATUS.NOT_FOUND
>;

/**
 * BOARD-02's first write path, ordered exactly as `updateThemeAction` orders its own: session,
 * then parse, then the upstream call. `userId` comes only from the verified session record, never
 * from this function's argument, even though the contract declares it client-suppliable (T-02-43).
 */
export const createBoardAction = async ({ name }: { name: string }): Promise<CreateBoardResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-02-45, see docs/adr/tech/0024).
     */
    const parsed = createBoardInputSchema.safeParse({ name });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.POST(EXTERNAL_PATH.BOARDS, {
        params: { query: { userId: record.id } },
        body: { name: parsed.data.name },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `fetchBoards`/`updateThemeAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        /*
         * Named branches, never upstream text: the shared mapping selects one of this project's own
         * discriminants and the caller authors the copy (T-02-64), the same call `renameBoardAction`
         * makes — a duplicate board name is refused with 409 DUPLICATE_RESOURCE here too.
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
     * This call is what puts the new board in the sidebar: `app/(dashboard)/layout.tsx` is a
     * persistent layout that does not re-render on ordinary navigation (docs/adr/tech/0019).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, board: board.data };
};
