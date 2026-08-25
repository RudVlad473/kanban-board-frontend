import "server-only";

import { boardsSchema, type Board } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `fetchBoards()`'s own result — a bare discriminant on the error branches, never an upstream
 * message, so no caller can accidentally leak upstream response text to the client (D-21, T-02.1-04).
 */
export type FetchBoardsResult =
    | { status: typeof RESULT_STATUS.SUCCESS; boards: Board[] }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.ERROR };

/**
 * RSC read replacing the deleted Route Handler (D-01/D-02/D-03) — calls `verifySession()` itself
 * rather than trusting a caller's guard already ran (CVE-2025-29927 class, T-02.1-02); `userId`
 * comes only from the session, this function takes no arguments (T-02.1-01) (see docs/adr/tech/0019).
 */
export const fetchBoards = async (): Promise<FetchBoardsResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    const { data, error } = await externalApi.GET(EXTERNAL_PATH.BOARDS, {
        params: { query: { userId: record.id } },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `updateThemeAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * `BoardResponseDTO` declares no `required` array, so every field of `data` is optional at the
     * type level regardless of what the backend actually sent — `.safeParse`, never `.parse`, so a
     * bad shape resolves to a handled branch instead of an uncaught exception (T-02.1-03).
     */
    const parsed = boardsSchema.safeParse(data);
    if (!parsed.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * Newest-first ordering carried over from the deleted `useBoards()` — the backend returns
     * oldest-first with no timestamp, so a plain reversal is equivalent (02-BACKEND-FACTS.md).
     */
    return { status: RESULT_STATUS.SUCCESS, boards: [...parsed.data].reverse() };
};
