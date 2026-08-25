import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` delete-board action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type DeleteBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.ERROR };

export type DeleteBoardCall = { boardId: string };

/** The failure branches a test can queue — every one carries no payload beyond its own name. */
export type DeleteBoardFailureStatus = typeof RESULT_STATUS.UNAUTHENTICATED | typeof RESULT_STATUS.ERROR;

/*
 * Programmable outcomes, following `rename-board-action-storybook-stub.ts`'s precedent — a real
 * module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: DeleteBoardFailureStatus[] = [];

let shouldHoldNextCall = false;

let settleHeldCall: (() => void) | null = null;

export const deleteBoardActionCalls: DeleteBoardCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueDeleteBoardFailure = (status: DeleteBoardFailureStatus): void => {
    queuedOutcomes.push(status);
};

/** Leaves the next call unresolved, so a test can observe the in-flight window the modal guards. */
export const holdNextDeleteBoard = (): void => {
    shouldHoldNextCall = true;
};

export const settleDeleteBoard = (): void => {
    settleHeldCall?.();
    settleHeldCall = null;
};

export const resetDeleteBoardStub = (): void => {
    queuedOutcomes.length = 0;
    deleteBoardActionCalls.length = 0;
    shouldHoldNextCall = false;
    settleHeldCall = null;
};

export const deleteBoardAction = ({ boardId }: DeleteBoardCall): Promise<DeleteBoardResult> => {
    deleteBoardActionCalls.push({ boardId });

    const queued = queuedOutcomes.shift();
    const result: DeleteBoardResult = queued === undefined ? { status: RESULT_STATUS.SUCCESS } : { status: queued };

    if (!shouldHoldNextCall) {
        return Promise.resolve(result);
    }

    shouldHoldNextCall = false;

    return new Promise((resolve) => {
        settleHeldCall = () => {
            resolve(result);
        };
    });
};
