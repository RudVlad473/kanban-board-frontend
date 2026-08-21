/**
 * A no-op stand-in for the real `"use server"` sign-in action, aliased for the "storybook" Vitest
 * project only (`vitest.config.ts`) — no story ever submits a form (D-25). See
 * `docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md`.
 */
type AuthActionState =
    { status: "idle" } | { status: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

export const signInAction = (): Promise<AuthActionState> => Promise.resolve({ status: "idle" });
