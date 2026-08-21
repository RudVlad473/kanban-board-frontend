"use server";

import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { THEME, type Theme } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `updateThemeAction`'s own result — no success member carries anything beyond the value that was
 * actually stored, and there is no distinct field-level error shape (unlike `AuthActionState`):
 * this call takes exactly one argument, already constrained to two values, so there is nothing
 * for a per-field error to describe.
 */
export type UpdateThemeResult = { status: "success"; theme: Theme } | { status: "error" };

const themeSchema = z.enum([THEME.LIGHT, THEME.DARK]);

/**
 * The theme persistence server function (01-35 Task 3's option-b decision — see that plan's
 * summary). Takes only the new theme value; the user id forwarded upstream comes exclusively from
 * `verifySession()`, called first so an unauthenticated call is refused regardless of the value
 * supplied (T-01-05/T-01-06).
 */
export const updateThemeAction = async (theme: Theme): Promise<UpdateThemeResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: "error" };
    }

    /*
     * Validated after the session check, before calling upstream — a Server Action is invokable
     * over the wire with an arbitrary request body regardless of what TypeScript claims about its
     * caller, so this is real runtime defense, not a formality.
     */
    const parsed = themeSchema.safeParse(theme);
    if (!parsed.success) {
        return { status: "error" };
    }

    const { error } = await externalApi.PUT(EXTERNAL_PATH.USER_THEME, {
        params: { query: { userId: record.id } },
        body: { theme: parsed.data },
    });

    /*
     * The contract declares only a 200 response with no error schema — the same gap sign-in.ts/
     * sign-up.ts work around — so `error` is widened through `unknown` rather than trusted as-is.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        return { status: "error" };
    }

    /*
     * Write the cookie only on confirmed success — the next server render resolves the new scope
     * before hydration (`app/layout.tsx`'s `themeCookie.read()` call).
     */
    await themeCookie.write(parsed.data);

    return { status: "success", theme: parsed.data };
};
