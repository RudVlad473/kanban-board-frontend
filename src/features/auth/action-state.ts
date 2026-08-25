import type { ProblemCode } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * The state both auth forms render via `useActionState` — no success member (success redirects).
 * Lives outside the `"use server"` action files since Next.js only allows async exports there
 * (see 01-33-SUMMARY.md).
 */
export type AuthActionState =
    | { status: typeof RESULT_STATUS.IDLE }
    | {
          status: typeof RESULT_STATUS.ERROR;
          code: ProblemCode;
          message: string;
          fieldErrors?: Record<string, string>;
      };

/** The initial value both forms and every story seed `useActionState` with. */
export const AUTH_ACTION_IDLE: AuthActionState = { status: RESULT_STATUS.IDLE };
