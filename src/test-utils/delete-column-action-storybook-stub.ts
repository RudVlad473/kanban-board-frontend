import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` delete-column action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type DeleteColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

export type DeleteColumnCall = { boardId: string; columnId: string };

/** The failure branches a test can queue — every one of them carries no payload beyond its own name. */
export type DeleteColumnFailureStatus =
    | typeof RESULT_STATUS.CONFLICT
    | typeof RESULT_STATUS.NOT_FOUND
    | typeof RESULT_STATUS.UNAUTHENTICATED
    | typeof RESULT_STATUS.ERROR;

/*
 * Programmable outcomes, following `delete-board-action-storybook-stub.ts`'s precedent — a real
 * module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: DeleteColumnFailureStatus[] = [];

let shouldHoldNextCall = false;

let settleHeldCall: (() => void) | null = null;

export const deleteColumnActionCalls: DeleteColumnCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueDeleteColumnFailure = (status: DeleteColumnFailureStatus): void => {
    queuedOutcomes.push(status);
};

/** Leaves the next call unresolved, so a test can observe that a wait-for-server delete removes nothing. */
export const holdNextDeleteColumn = (): void => {
    shouldHoldNextCall = true;
};

export const settleDeleteColumn = (): void => {
    settleHeldCall?.();
    settleHeldCall = null;
};

export const resetDeleteColumnStub = (): void => {
    queuedOutcomes.length = 0;
    deleteColumnActionCalls.length = 0;
    shouldHoldNextCall = false;
    settleHeldCall = null;
};

export const deleteColumnAction = ({ boardId, columnId }: DeleteColumnCall): Promise<DeleteColumnResult> => {
    deleteColumnActionCalls.push({ boardId, columnId });

    const queued = queuedOutcomes.shift();
    const result: DeleteColumnResult = queued === undefined ? { status: RESULT_STATUS.SUCCESS } : { status: queued };

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
