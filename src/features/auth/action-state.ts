import type { ProblemCode } from "@/lib/core/api-contract/problem-detail";

/**
 * The state both auth forms render via `useActionState` — no success member (success redirects).
 * Lives outside the `"use server"` action files since Next.js only allows async exports there
 * (see 01-33-SUMMARY.md).
 */
export type AuthActionState =
    { status: "idle" } | { status: "error"; code: ProblemCode; message: string; fieldErrors?: Record<string, string> };

/** The initial value both forms and every story seed `useActionState` with. */
export const AUTH_ACTION_IDLE: AuthActionState = { status: "idle" };
