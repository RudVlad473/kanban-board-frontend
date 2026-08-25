import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` create-board-columns action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type CreateBoardColumnsResult =
    | { status: typeof RESULT_STATUS.SUCCESS; failedNames: string[] }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.ERROR };

export type CreateBoardColumnsCall = { boardId: string; names: string[] };

/*
 * Programmable outcomes, following `sign-out-action-storybook-stub.ts`'s exported-counter
 * precedent — a real module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedFailedNames: string[][] = [];

export const createBoardColumnsActionCalls: CreateBoardColumnsCall[] = [];

/** Queues the failed-name set the next call resolves with; an unqueued call succeeds outright. */
export const queueCreateBoardColumnsFailure = (failedNames: string[]): void => {
    queuedFailedNames.push(failedNames);
};

export const resetCreateBoardColumnsStub = (): void => {
    queuedFailedNames.length = 0;
    createBoardColumnsActionCalls.length = 0;
};

export const createBoardColumnsAction = ({
    boardId,
    names,
}: CreateBoardColumnsCall): Promise<CreateBoardColumnsResult> => {
    createBoardColumnsActionCalls.push({ boardId, names });

    return Promise.resolve({ status: RESULT_STATUS.SUCCESS, failedNames: queuedFailedNames.shift() ?? [] });
};
