import type { ProblemCode } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * A no-op stand-in for the real sign-up action, aliased for the "storybook" Vitest project only —
 * same rationale as `sign-in-action-storybook-stub.ts` (no story ever submits a form, D-25).
 */
type AuthActionState =
    | { status: typeof RESULT_STATUS.IDLE }
    | {
          status: typeof RESULT_STATUS.ERROR;
          code: ProblemCode;
          message: string;
          fieldErrors?: Record<string, string>;
      };

export const signUpAction = (): Promise<AuthActionState> => Promise.resolve({ status: RESULT_STATUS.IDLE });
