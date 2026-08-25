import type { Board } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A no-op stand-in for the real `"use server"` create-board action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer and cannot be bundled for a browser test page (docs/adr/tech/0025).
 */
type CreateBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: Board }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.ERROR };

const STUB_BOARD: Board = { id: "stub-board-id", name: "Stub Board", version: 0 };

export const createBoardAction = (): Promise<CreateBoardResult> =>
    Promise.resolve({ status: RESULT_STATUS.SUCCESS, board: STUB_BOARD });
