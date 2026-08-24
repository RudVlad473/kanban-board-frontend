import type { Board } from "@/features/boards/schemas";

/**
 * A no-op stand-in for the real `"use server"` create-board action, aliased for the "browser" and
 * "storybook" Vitest projects only — the real module's import chain reaches Node-only crypto
 * through the session layer and cannot be bundled for a browser test page (docs/adr/tech/0025).
 */
type CreateBoardResult =
    | { status: "success"; board: Board }
    | { status: "unauthenticated" }
    | { status: "invalid"; fieldErrors: Record<string, string> }
    | { status: "error" };

const STUB_BOARD: Board = { id: "stub-board-id", name: "Stub Board", version: 0 };

export const createBoardAction = (): Promise<CreateBoardResult> =>
    Promise.resolve({ status: "success", board: STUB_BOARD });
