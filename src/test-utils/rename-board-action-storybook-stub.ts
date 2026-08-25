import type { Board } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` rename-board action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer (docs/adr/tech/0025).
 */
type RenameBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: Board }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.ERROR };

export type RenameBoardCall = { boardId: string; name: string; version: number };

/*
 * Programmable outcomes, following `create-board-columns-action-storybook-stub.ts`'s precedent —
 * a real module a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: (typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.ERROR)[] = [];

export const renameBoardActionCalls: RenameBoardCall[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueRenameBoardFailure = (status: typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.ERROR): void => {
    queuedOutcomes.push(status);
};

export const resetRenameBoardStub = (): void => {
    queuedOutcomes.length = 0;
    renameBoardActionCalls.length = 0;
};

export const renameBoardAction = ({ boardId, name, version }: RenameBoardCall): Promise<RenameBoardResult> => {
    renameBoardActionCalls.push({ boardId, name, version });

    const queued = queuedOutcomes.shift();
    if (queued !== undefined) {
        return Promise.resolve({ status: queued });
    }

    return Promise.resolve({ status: RESULT_STATUS.SUCCESS, board: { id: boardId, name, version: version + 1 } });
};
