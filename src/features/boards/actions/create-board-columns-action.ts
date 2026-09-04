"use server";

// Covered by: `e2e/boards-create.e2e.spec.ts`

import { refresh } from "next/cache";

import { columnNameSchema, columnSchema, createBoardColumnsInputSchema, type Column } from "@/features/boards/schemas";
import type { ActionResult } from "@/lib/core/api-contract/action-result";
import { createChildrenSerially } from "@/lib/core/api-contract/create-children-serially";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `createBoardColumnsAction`'s own result — `SUCCESS` carries the names that did NOT land, empty
 * when everything did. A partial result is kept, never rolled back (ADR domain/0003).
 */
export type CreateBoardColumnsResult = ActionResult<{ failedNames: string[]; created: Column[] }>;

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

    const { created, failedValues } = await createChildrenSerially({
        values: parsed.data.names,
        valueSchema: columnNameSchema,
        /* The written columns go back to the caller, which writes them into the board entry (rule 4). */
        parseChild: (data) => columnSchema.safeParse(data).data ?? null,
        createChild: (name) =>
            externalApi.POST(EXTERNAL_PATH.BOARD_COLUMNS, {
                params: { path: { boardId: parsed.data.boardId }, query: { userId: record.id } },
                body: { name },
            }),
    });

    /*
     * The sidebar's persistent layout does not re-render on ordinary navigation, so the write has
     * to say so itself (docs/adr/tech/0019).
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, failedNames: failedValues, created };
};
