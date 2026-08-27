import type { ProblemCode } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A lightweight stand-in for `@/features/auth/actions/sign-out-action`'s runtime module, aliased for the
 * "browser" and "storybook" Vitest projects — the real module reaches `node:crypto` via
 * `@/lib/server/session`. No story or composed-story test ever submits a form (D-25); see docs/adr/tech/0020.
 */
type AuthActionState =
    | { status: typeof RESULT_STATUS.IDLE }
    | {
          status: typeof RESULT_STATUS.ERROR;
          code: ProblemCode;
          message: string;
          fieldErrors?: Record<string, string>;
      };

let callCount = 0;

export const signOutAction = (): Promise<AuthActionState> => {
    callCount += 1;
    return Promise.resolve({ status: RESULT_STATUS.IDLE });
};

/**
 * Test-only recorded-invocation accessors for sign-out-button.test.tsx — a real counter on this
 * stub module, not a `vi.fn()` mock, so "the button called the action" stays provable under D-04.
 */
export const signOutActionCallCount = (): number => callCount;
export const resetSignOutActionCallCount = (): void => {
    callCount = 0;
};
