"use server";

import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { THEME, type Theme } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

/**
 * `updateThemeAction`'s own result — unlike `AuthActionState`, there's no per-field error shape
 * since this call takes one value already constrained to two options.
 */
export type UpdateThemeResult = { status: "success"; theme: Theme } | { status: "error" };

const themeSchema = z.enum([THEME.LIGHT, THEME.DARK]);

/**
 * Session-checked before use; `userId` comes only from `verifySession()`, never from the caller
 * (T-01-05/T-01-06, see 01-35-SUMMARY.md).
 */
export const updateThemeAction = async (theme: Theme): Promise<UpdateThemeResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: "error" };
    }

    /*
     * Validated after the session check — a Server Action is callable over the wire with an
     * arbitrary payload regardless of compile-time types, so this ordering is real runtime
     * defense (see docs/adr/tech/0019).
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
