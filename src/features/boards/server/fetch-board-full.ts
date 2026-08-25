import "server-only";

import { cache } from "react";

import { boardFullSchema, type BoardFull } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/*
 * This folder deliberately has no barrel: a client importing a client-safe name through one would
 * drag the server-only external API client into the browser bundle, failing the build at an
 * innocent-looking file (see docs/adr/tech/0019).
 */

/** The statuses that mean "not this session's board" — 403 is what P7 actually observed, not 404. */
const UNREACHABLE_BOARD_STATUSES = new Set([403, 404]);

/**
 * `fetchBoardFull()`'s own result — a bare discriminant on every non-ok branch, never upstream
 * response text, so no caller can leak what the backend said to the client (D-21, T-02.1-04).
 */
export type FetchBoardFullResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: BoardFull }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

/*
 * Keyed on the bare id, not the caller's `{ boardId }` object: React compares cache arguments with
 * `Object.is`, so wrapping the object-parameter function would allocate a fresh literal per call
 * and miss every time, mirroring `fetchBoards`'s dedup in name only.
 */
const fetchBoardFullById = cache(async (boardId: string): Promise<FetchBoardFullResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    const { data, error, response } = await externalApi.GET(EXTERNAL_PATH.BOARD_FULL, {
        params: { path: { boardId }, query: { userId: record.id } },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `fetchBoards`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        return UNREACHABLE_BOARD_STATUSES.has(response.status)
            ? { status: RESULT_STATUS.NOT_FOUND }
            : { status: RESULT_STATUS.ERROR };
    }

    /*
     * `.safeParse`, never `.parse`, and composed down through every nested level — none of the
     * four response shapes declares a required array, so a malformed payload would otherwise
     * render as a board full of undefined text (T-02-52).
     */
    const parsed = boardFullSchema.safeParse(data);
    if (!parsed.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    return { status: RESULT_STATUS.SUCCESS, board: parsed.data };
});

/**
 * BOARD-03's RSC read. Calls `verifySession()` itself rather than trusting an outer guard already
 * ran (CVE-2025-29927 class, T-02-50); `userId` comes only from the session record, never from the
 * caller, so a forged one cannot reach the upstream call (see docs/adr/tech/0019).
 */
export const fetchBoardFull = ({ boardId }: { boardId: string }): Promise<FetchBoardFullResult> =>
    fetchBoardFullById(boardId);
