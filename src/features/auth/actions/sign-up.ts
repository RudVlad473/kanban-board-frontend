"use server";

import { redirect } from "next/navigation";

import { type AuthActionState } from "@/features/auth/action-state";
import { resolveDisplayName } from "@/features/auth/model";
import { signUpSchema, zodErrorToFieldErrors } from "@/features/auth/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { PROBLEM_CODE, parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { upstreamCookie } from "@/lib/server/cookies/upstream-cookie";
import { externalApi } from "@/lib/server/server-client";
import { isSessionPayload, session } from "@/lib/server/session";

/*
 * The contract still documents `POST /signup` as a bare 200 with no error schema — the real
 * backend returns 201 + the full identity record, and covers both the duplicate-email and
 * unknown-failure triggers without committing to either (01-UI-SPEC.md Copywriting Contract).
 */
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

// eslint-disable-next-line no-restricted-syntax -- React's useActionState calls this positionally (prevState, formData); the shape is dictated by that external API, not this project (ADR tech/0016 exemption, see sign-in.ts's identical comment)
export const signUpAction = async (_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> => {
    const parsed = signUpSchema.safeParse({
        email: formData.get("email"),
        displayName: formData.get("displayName"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        return {
            status: "error",
            code: PROBLEM_CODE.VALIDATION_FAILED,
            message: SIGN_UP_FAILURE_MESSAGE,
            fieldErrors: zodErrorToFieldErrors(parsed.error),
        };
    }

    const { data, error, response } = await externalApi.POST(EXTERNAL_PATH.SIGN_UP, { body: parsed.data });

    /*
     * The contract declares no error schema for this operation, so `error` is widened through
     * `unknown`, same pattern sign-in.ts uses.
     */
    const upstreamError: unknown = error;
    const identity: unknown = data;

    /*
     * A success response carrying no upstream credential (GC-18, T-01-50) is a failure, not a
     * degraded success — it would leave the user looking signed in while every call fails.
     */
    const jsessionId = upstreamCookie.extract(response);

    if (upstreamError !== undefined || !isSessionPayload(identity) || !jsessionId) {
        const problem = parseProblemDetail(upstreamError);
        return {
            status: "error",
            code: problem?.code ?? PROBLEM_CODE.INTERNAL_ERROR,
            message: SIGN_UP_FAILURE_MESSAGE,
        };
    }

    /*
     * The session is built from the backend's own returned record, not values assembled from the
     * submitted form. `resolveDisplayName` still runs over the guarded identity (GC-02).
     */
    await session.create({ ...identity, displayName: resolveDisplayName(identity), jsessionId });

    /*
     * `app/layout.tsx` resolves the pre-paint `dark` scope from the theme cookie alone, so it has
     * to be established here from the account's own stored preference, not left absent.
     */
    await themeCookie.write(identity.theme);

    redirect(ROUTE.BOARDS);
};
