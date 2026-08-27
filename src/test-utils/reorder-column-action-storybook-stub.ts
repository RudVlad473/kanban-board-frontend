import type { Column } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` reorder-column action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type ReorderColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS; column: Column }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

export type ReorderColumnCall = { boardId: string; columnId: string; version: number; targetPosition: number };

/** The failure branches a test can queue — every one of them carries no payload beyond its own name. */
export type ReorderColumnFailureStatus =
    | typeof RESULT_STATUS.CONFLICT
    | typeof RESULT_STATUS.NOT_FOUND
    | typeof RESULT_STATUS.UNAUTHENTICATED
    | typeof RESULT_STATUS.ERROR;

/*
 * Programmable outcomes, following `rename-column-action-storybook-stub.ts`'s precedent — a real
 * module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: ReorderColumnFailureStatus[] = [];

let shouldHoldNextCall = false;

let settleHeldCall: (() => void) | null = null;

export const reorderColumnActionCalls: ReorderColumnCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueReorderColumnFailure = (status: ReorderColumnFailureStatus): void => {
    queuedOutcomes.push(status);
};

/** Leaves the next call unresolved, so a test can observe the in-flight window an optimistic apply opens. */
export const holdNextReorderColumn = (): void => {
    shouldHoldNextCall = true;
};

export const settleReorderColumn = (): void => {
    settleHeldCall?.();
    settleHeldCall = null;
};

export const resetReorderColumnStub = (): void => {
    queuedOutcomes.length = 0;
    reorderColumnActionCalls.length = 0;
    shouldHoldNextCall = false;
    settleHeldCall = null;
};

export const reorderColumnAction = ({
    boardId,
    columnId,
    version,
    targetPosition,
}: ReorderColumnCall): Promise<ReorderColumnResult> => {
    reorderColumnActionCalls.push({ boardId, columnId, version, targetPosition });

    const queued = queuedOutcomes.shift();
    const result: ReorderColumnResult =
        queued === undefined
            ? {
                  status: RESULT_STATUS.SUCCESS,
                  /*
                   * Only the moved column's version moves, as 03-BACKEND-FACTS.md § R2 observed. The
                   * name is blank because a reorder never carries one — no caller reads it back.
                   */
                  column: { id: columnId, name: "", version: version + 1, position: targetPosition },
              }
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
