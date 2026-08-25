"use server";

import { refresh } from "next/cache";

import { columnNameSchema, createBoardColumnsInputSchema } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `createBoardColumnsAction`'s own result — `SUCCESS` carries the names that did NOT land, empty
 * when everything did. A partial result is kept, never rolled back (ADR domain/0003).
 */
export type CreateBoardColumnsResult =
    | { status: typeof RESULT_STATUS.SUCCESS; failedNames: string[] }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.ERROR };

/**
 * Creates one column per name, in order. `userId` comes only from the verified session record,
 * never from this function's argument (T-02-43); the backend refuses a column create against
 * someone else's board on its own authority (02-BACKEND-FACTS.md P7).
 */
export const createBoardColumnsAction = async ({
    boardId,
    names,
}: {
    boardId: string;
    names: string[];
}): Promise<CreateBoardColumnsResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    const parsed = createBoardColumnsInputSchema.safeParse({ boardId, names });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const failedNames: string[] = [];

    /*
     * Serial by requirement, never `Promise.all`: the backend derives a column's position from
     * call order and the request body carries no position field (02-BACKEND-FACTS.md P5).
     */
    for (const name of parsed.data.names) {
        const validName = columnNameSchema.safeParse(name);
        if (!validName.success) {
            // A malformed name never leaves this app's server — recorded as failed, no call made.
            failedNames.push(name);
            continue;
        }

        const { error } = await externalApi.POST(EXTERNAL_PATH.BOARD_COLUMNS, {
            params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
            body: { name: validName.data },
        });

        /*
         * Widened through `unknown` before testing, mirroring `createBoardAction`; a refusal
         * records this one name and does NOT abort the rest (ADR domain/0003's keep-what-succeeded).
         */
        const upstreamError: unknown = error;
        if (upstreamError !== undefined) {
            failedNames.push(name);
        }
    }

    /*
     * The sidebar's persistent layout does not re-render on ordinary navigation, so the write has
     * to say so itself (docs/adr/tech/0019).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, failedNames };
};
