/**
 * A lightweight stand-in for `@/features/auth/actions/sign-in`'s runtime module, aliased for the
 * "storybook" Vitest project only (`vitest.config.ts`) — the real module opens with `"use server"`
 * and its import chain reaches `node:crypto` via `@/lib/server/session`. No story ever submits a
 * form (D-25), so a no-op stand-in is enough — see
 * `docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md` for the full history.
 */
type AuthActionState =
    { status: "idle" } | { status: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

export const signInAction = (): Promise<AuthActionState> => Promise.resolve({ status: "idle" });
