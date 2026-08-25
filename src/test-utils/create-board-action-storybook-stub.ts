import type { Board } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A stand-in for the real `"use server"` create-board action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer and cannot be bundled for a browser test page (docs/adr/tech/0025).
 */
type CreateBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: Board }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.DUPLICATE }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

/** The failure branches a test can queue — every one of them carries no payload beyond its own name. */
export type CreateBoardFailureStatus =
    typeof RESULT_STATUS.DUPLICATE | typeof RESULT_STATUS.UNAUTHENTICATED | typeof RESULT_STATUS.ERROR;

const STUB_BOARD: Board = { id: "stub-board-id", name: "Stub Board", version: 0 };

/*
 * Programmable outcomes, following `rename-board-action-storybook-stub.ts`'s shape — a real module
 * a test configures, never a `vi.mock` (docs/adr/tech/0020).
 */
const queuedOutcomes: CreateBoardFailureStatus[] = [];

/** Queues the failure branch the next call resolves with; an unqueued call succeeds outright. */
export const queueCreateBoardFailure = (status: CreateBoardFailureStatus): void => {
    queuedOutcomes.push(status);
};

export const resetCreateBoardStub = (): void => {
    queuedOutcomes.length = 0;
};

export const createBoardAction = (): Promise<CreateBoardResult> => {
    const queued = queuedOutcomes.shift();

    return Promise.resolve(
        queued === undefined ? { status: RESULT_STATUS.SUCCESS, board: STUB_BOARD } : { status: queued },
    );
};
