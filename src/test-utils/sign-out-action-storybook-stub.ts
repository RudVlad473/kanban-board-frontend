/**
 * A lightweight stand-in for `@/features/auth/actions/sign-out`'s runtime module, aliased for the
 * "browser" and "storybook" Vitest projects — the real module reaches `node:crypto` via
 * `@/lib/server/session`. No story or composed-story test ever submits a form (D-25); see docs/adr/tech/0020.
 */
type AuthActionState =
    { status: "idle" } | { status: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

export const signOutAction = (): Promise<AuthActionState> => Promise.resolve({ status: "idle" });
