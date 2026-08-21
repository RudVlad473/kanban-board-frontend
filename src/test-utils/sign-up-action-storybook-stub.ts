/**
 * A no-op stand-in for the real sign-up action, aliased for the "storybook" Vitest project only —
 * same rationale as `sign-in-action-storybook-stub.ts` (no story ever submits a form, D-25).
 */
type AuthActionState =
    { status: "idle" } | { status: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

export const signUpAction = (): Promise<AuthActionState> => Promise.resolve({ status: "idle" });
