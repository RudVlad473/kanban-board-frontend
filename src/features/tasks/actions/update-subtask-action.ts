"use server";

import { refresh } from "next/cache";

import { updateSubtaskInputSchema, type UpdateSubtaskInput } from "@/features/tasks/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { subtaskSchema, type Subtask } from "@/lib/core/api-contract/task-schemas";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `updateSubtaskAction`'s own result — bare discriminants only (T-04-05). ONE action serves the
 * toggle (04-17) and the rename (04-19): one endpoint, one action file per operation, differing hooks
 * (04-RESEARCH.md Open Questions #3).
 */
export type UpdateSubtaskResult =
    | { status: typeof RESULT_STATUS.SUCCESS; subtask: Subtask }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

/**
 * SUBTASK-02's write path (toggle) and SUBTASK-03's (rename), ordered exactly as
 * `renameColumnAction` orders its own: session, then parse, then the upstream call. `userId` comes
 * only from the verified session record, never from this function's argument (T-04-02).
 */
export const updateSubtaskAction = async ({
    boardId,
    columnId,
    taskId,
    subtaskId,
    version,
    title,
    isCompleted,
}: UpdateSubtaskInput): Promise<UpdateSubtaskResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: RESULT_STATUS.UNAUTHENTICATED };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this is real runtime defense
     * (T-04-01, see docs/adr/tech/0024).
     */
    const parsed = updateSubtaskInputSchema.safeParse({
        boardId,
        columnId,
        taskId,
        subtaskId,
        version,
        title,
        isCompleted,
    });
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.PUT(EXTERNAL_PATH.SUBTASK_DETAIL, {
        params: {
            /*
             * The generated `path` type declares only `subtaskId` — this operation omits THREE
             * ancestors, not one, and T2 found the server ignores every one of them. Written anyway:
             * it is the documented URL and the backend may tighten later (04-BACKEND-FACTS.md T2).
             */
            path: {
                boardId: parsed.data.boardId,
                columnId: parsed.data.columnId,
                taskId: parsed.data.taskId,
                subtaskId: parsed.data.subtaskId,
            },
            query: { userId: record.id },
        },
        body: { title: parsed.data.title, isCompleted: parsed.data.isCompleted, version: parsed.data.version },
    });

    /*
     * The contract declares no error schema for this operation — widen through `unknown` rather
     * than trust the generated type, mirroring `renameColumnAction`.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

        // comment-length-exempt: records why D-12's re-read belongs in the action rather than the hook — a settled placement decision a future reader would otherwise relocate (docs/adr/tech/0023)
        /*
         * D-12's re-read: a conflict means the server holds something this screen does not, so
         * reverting alone would leave the user looking at data known to be wrong (T-04-06). It
         * belongs here rather than in either hook because docs/adr/tech/0019 keeps every `refresh()`
         * inside an action.
         */
        if (status === RESULT_STATUS.CONFLICT) {
            refresh();
        }

        /* Neither a toggle nor a rename carries a uniqueness rule, so `DUPLICATE` folds into `ERROR`. */
        return { status: status === RESULT_STATUS.DUPLICATE ? RESULT_STATUS.ERROR : status };
    }

    const subtask = subtaskSchema.safeParse(data);
    if (!subtask.success) {
        return { status: RESULT_STATUS.ERROR };
    }

    /*
     * The refresh belongs inside the action, not in the calling hook (docs/adr/tech/0019) — the
     * refreshed board is what retires either hook's optimistic write.
     */
    refresh();

    return { status: RESULT_STATUS.SUCCESS, subtask: subtask.data };
};
