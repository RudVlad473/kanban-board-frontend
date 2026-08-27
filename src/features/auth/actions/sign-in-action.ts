"use server";

import { redirect } from "next/navigation";

import { type AuthActionState } from "@/features/auth/action-state";
import { resolveDisplayName } from "@/features/auth/model";
import { signInSchema } from "@/features/auth/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { PROBLEM_CODE, parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { upstreamCookie } from "@/lib/server/cookies/upstream-cookie";
import { externalApi } from "@/lib/server/server-client";
import { isSessionPayload, session } from "@/lib/server/session";

/**
 * Fixed message for every sign-in failure branch — prevents account enumeration (T-01-08). Never
 * derived from the backend's own text or from which failure actually occurred.
 */
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

/*
 * `useActionState` calls this positionally (prevState, formData) — React's own Server Action
 * calling convention, not this project's (ADR tech/0016 exemption).
 */
// eslint-disable-next-line no-restricted-syntax -- React's useActionState calls this positionally (prevState, formData); the shape is dictated by that external API, not this project (ADR tech/0016 exemption)
export const signInAction = async (_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> => {
    const parsed = signInSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        return {
            status: RESULT_STATUS.ERROR,
            code: PROBLEM_CODE.VALIDATION_FAILED,
            message: INVALID_CREDENTIALS_MESSAGE,
            fieldErrors: zodErrorToFieldErrors(parsed.error),
        };
    }

    const { data, error, response } = await externalApi.POST(EXTERNAL_PATH.SIGN_IN, { body: parsed.data });

    /*
     * The contract declares no error schema for this operation — `error` is untyped `undefined`
     * but populated at runtime on a non-2xx response, so both are widened through `unknown`.
     */
    const upstreamError: unknown = error;
    const identity: unknown = data;

    /*
     * A success response carrying no upstream credential (GC-18, T-01-50) is a failure, not a
     * degraded success — it would leave the user looking signed in while every call fails.
     */
    const jsessionId = upstreamCookie.extract(response);

    if (upstreamError !== undefined || !isSessionPayload(identity) || !jsessionId) {
        // The backend collapses every 401 cause into one code — anti-enumeration (T-01-08, T-01-54).
        const problem = parseProblemDetail(upstreamError);
        return {
            status: RESULT_STATUS.ERROR,
            code: problem?.code ?? PROBLEM_CODE.INTERNAL_ERROR,
            message: INVALID_CREDENTIALS_MESSAGE,
        };
    }

    /*
     * `isSessionPayload` only checks `displayName` is a string, not non-empty — `resolveDisplayName`
     * guards against a blank name reaching the dashboard chrome (GC-02).
     */
    await session.create({ ...identity, displayName: resolveDisplayName(identity), jsessionId });

    /*
     * `app/layout.tsx` resolves the pre-paint `dark` scope from the theme cookie alone, so it has
     * to be established here from the account's own stored preference, not left absent.
     */
    await themeCookie.write(identity.theme);

    /*
     * Outside any try/catch — redirect() signals success by throwing; catching it would turn a
     * working navigation into a silent no-op.
     */
    redirect(ROUTE.BOARDS);
};
