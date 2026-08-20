/**
 * A lightweight stand-in for `@/features/auth/actions/sign-up`'s runtime module, aliased for the
 * "storybook" Vitest project only (`vitest.config.ts`) — same rationale as
 * `sign-in-action-storybook-stub.ts`: no story ever submits a form (D-25), so a no-op stand-in is
 * enough.
 */
type AuthActionState =
    { status: "idle" } | { status: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

export const signUpAction = (): Promise<AuthActionState> => Promise.resolve({ status: "idle" });
