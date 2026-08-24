/**
 * A no-op stand-in for the real `"use server"` create-board-columns action, aliased for the
 * "browser" and "storybook" Vitest projects only — the real module's import chain reaches
 * Node-only crypto through the session layer (docs/adr/tech/0025).
 */
type CreateBoardColumnsResult =
    | { status: "success"; failedNames: string[] }
    | { status: "unauthenticated" }
    | { status: "invalid"; fieldErrors: Record<string, string> }
    | { status: "error" };

export const createBoardColumnsAction = (): Promise<CreateBoardColumnsResult> =>
    Promise.resolve({ status: "success", failedNames: [] });
