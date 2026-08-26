import type { Column } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` create-column action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type CreateColumnResult =
    | { status: typeof RESULT_STATUS.SUCCESS; column: Column }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

export type CreateColumnCall = { boardId: string; name: string };

/** The failure branches a test can queue — every one of them carries no payload beyond its own name. */
export type CreateColumnFailureStatus =
    | typeof RESULT_STATUS.DUPLICATE
    | typeof RESULT_STATUS.NOT_FOUND
    | typeof RESULT_STATUS.UNAUTHENTICATED
    | typeof RESULT_STATUS.ERROR;

/** The id every unqueued (successful) call resolves the created column with. */
export const STUB_CREATED_COLUMN_ID = "stub-created-column-id";

/*
 * Programmable outcomes, following `rename-board-action-storybook-stub.ts`'s precedent — a real
 * module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: CreateColumnFailureStatus[] = [];

let shouldHoldNextCall = false;

let settleHeldCall: (() => void) | null = null;

export const createColumnActionCalls: CreateColumnCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueCreateColumnFailure = (status: CreateColumnFailureStatus): void => {
    queuedOutcomes.push(status);
};

/** Leaves the next call unresolved, so a test can observe the in-flight window the modal stays open for. */
export const holdNextCreateColumn = (): void => {
    shouldHoldNextCall = true;
};

export const settleCreateColumn = (): void => {
    settleHeldCall?.();
    settleHeldCall = null;
};

export const resetCreateColumnStub = (): void => {
    queuedOutcomes.length = 0;
    createColumnActionCalls.length = 0;
    shouldHoldNextCall = false;
    settleHeldCall = null;
};

export const createColumnAction = ({ boardId, name }: CreateColumnCall): Promise<CreateColumnResult> => {
    createColumnActionCalls.push({ boardId, name });

    const queued = queuedOutcomes.shift();
    const result: CreateColumnResult =
        queued === undefined
            ? {
                  status: RESULT_STATUS.SUCCESS,
                  column: { id: STUB_CREATED_COLUMN_ID, name, version: 0, position: 0 },
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
