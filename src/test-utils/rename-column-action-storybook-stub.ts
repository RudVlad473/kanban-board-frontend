import type { Column } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` rename-column action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type RenameColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS; column: Column }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

export type RenameColumnCall = { boardId: string; columnId: string; name: string; version: number };

/** The failure branches a test can queue — every one of them carries no payload beyond its own name. */
export type RenameColumnFailureStatus =
    | typeof RESULT_STATUS.CONFLICT
    | typeof RESULT_STATUS.DUPLICATE
    | typeof RESULT_STATUS.NOT_FOUND
    | typeof RESULT_STATUS.UNAUTHENTICATED
    | typeof RESULT_STATUS.ERROR;

/*
 * Programmable outcomes, following `rename-board-action-storybook-stub.ts`'s precedent — a real
 * module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: RenameColumnFailureStatus[] = [];

let shouldHoldNextCall = false;

let settleHeldCall: (() => void) | null = null;

export const renameColumnActionCalls: RenameColumnCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueRenameColumnFailure = (status: RenameColumnFailureStatus): void => {
    queuedOutcomes.push(status);
};

/** Leaves the next call unresolved, so a test can observe the in-flight window an optimistic apply opens. */
export const holdNextRenameColumn = (): void => {
    shouldHoldNextCall = true;
};

export const settleRenameColumn = (): void => {
    settleHeldCall?.();
    settleHeldCall = null;
};

export const resetRenameColumnStub = (): void => {
    queuedOutcomes.length = 0;
    renameColumnActionCalls.length = 0;
    shouldHoldNextCall = false;
    settleHeldCall = null;
};

export const renameColumnAction = ({
    boardId,
    columnId,
    name,
    version,
}: RenameColumnCall): Promise<RenameColumnResult> => {
    renameColumnActionCalls.push({ boardId, columnId, name, version });

    const queued = queuedOutcomes.shift();
    const result: RenameColumnResult =
        queued === undefined
            ? { status: RESULT_STATUS.SUCCESS, column: { id: columnId, name, version: version + 1, position: 0 } }
            : { status: queued };

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
