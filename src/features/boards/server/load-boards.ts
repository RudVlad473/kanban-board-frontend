import "server-only";

import { boardsSchema, type Board } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `loadBoards()`'s own result — a bare discriminant on the error branches, never an upstream
 * message, so no caller can accidentally leak upstream response text to the client (D-21, T-02.1-04).
 */
export type LoadBoardsResult = { status: "ok"; boards: Board[] } | { status: "unauthenticated" } | { status: "error" };

/**
 * The server-only board-list read this phase's tracer rebuilds as an RSC data-fetch, replacing the
 * deleted `app/api/boards/route.ts` (D-01/D-02/D-03). Calls `verifySession()` itself rather than
 * trusting `DashboardLayout`'s own check already ran — the CVE-2025-29927 proxy-bypass class
 * `(dashboard)/layout.tsx`'s own comment already names (T-02.1-02). `userId` is read only from the
 * session record — this function takes no arguments at all, so no caller can supply one (T-02.1-01).
 */
export const loadBoards = async (): Promise<LoadBoardsResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: "unauthenticated" };
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
        return { status: "error" };
    }

    /*
     * `BoardResponseDTO` declares no `required` array, so every field of `data` is optional at the
     * type level regardless of what the backend actually sent — `.safeParse`, never `.parse`, so a
     * bad shape resolves to a handled branch instead of an uncaught exception (T-02.1-03).
     */
    const parsed = boardsSchema.safeParse(data);
    if (!parsed.success) {
        return { status: "error" };
    }

    /*
     * Newest-first ordering, carried over from the deleted `useBoards()`'s `newestFirst` — the
     * backend returns creation order (oldest-first) with no timestamp to sort by instead, so a
     * plain array reversal is the ordering-preserving equivalent (02-BACKEND-FACTS.md's
     * ordering-developer-choice).
     */
    return { status: "ok", boards: [...parsed.data].reverse() };
};
