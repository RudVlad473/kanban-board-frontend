import type { ProblemCode } from "@/lib/api/problem-detail";

/**
 * The state both auth forms render, returned by `signInAction`/`signUpAction` through
 * `useActionState`. There is no success member: success redirects, so the form never renders one.
 * `fieldErrors` is optional — only a validation failure carries a per-field message map.
 *
 * Lives outside `auth-actions.ts` because that file is a `"use server"` module, and Next.js only
 * allows async function exports from those — a plain constant like `AUTH_ACTION_IDLE` below would
 * break the server actions bundle at request time (it type-checks and builds fine; it only fails
 * the moment an action is actually invoked, which is why this surfaced during manual browser
 * verification rather than in `pnpm build`/`pnpm test`).
 */
export type AuthActionState =
    { status: "idle" } | { status: "error"; code: ProblemCode; message: string; fieldErrors?: Record<string, string> };

/** The initial value both forms and every story seed `useActionState` with. */
export const AUTH_ACTION_IDLE: AuthActionState = { status: "idle" };
