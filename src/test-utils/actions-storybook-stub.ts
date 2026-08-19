/**
 * A lightweight stand-in for `@/features/auth/actions`'s runtime module, aliased for the
 * "storybook" Vitest project only (`vitest.config.ts`). The real module opens with `"use server"`
 * and imports `@/lib/server/session`, whose chain reaches `node:crypto` — Next.js's own build splits a
 * `"use server"` module's body out of whatever client bundle references it, but
 * `@storybook/nextjs-vite`'s Vitest-driven story rendering has no such split: it bundles the real
 * module whole for the browser, and `node:crypto` isn't available there ("Module 'node:crypto' has
 * been externalized for browser compatibility", found running this plan's own component-adjacent
 * story suite — plan 01-33). No story ever submits a form (D-25: visual-only CSF3, no play
 * function anywhere in either story file) — `signInAction`/`signUpAction` are only ever referenced
 * by `useActionState`, never invoked, so a no-op stand-in is enough. Mirrors
 * `server-only-stub.ts`'s established alias-a-stub pattern for exactly this kind of
 * cross-environment shim; never imported by application code, only by the test config
 * (CONVENTIONS.md's `src/test-utils/` rule).
 */
type AuthActionState =
    { status: "idle" } | { status: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

export const AUTH_ACTION_IDLE: AuthActionState = { status: "idle" };

export const signInAction = (): Promise<AuthActionState> => Promise.resolve(AUTH_ACTION_IDLE);

export const signUpAction = (): Promise<AuthActionState> => Promise.resolve(AUTH_ACTION_IDLE);
