"use server";

import { z } from "zod";

import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";
import { writeThemeCookie, type Theme } from "@/lib/server/theme";

/**
 * `updateThemeAction`'s own result — no success member carries anything beyond the value that was
 * actually stored, and there is no distinct field-level error shape (unlike `AuthActionState`):
 * this call takes exactly one argument, already constrained to two values, so there is nothing
 * for a per-field error to describe.
 */
export type UpdateThemeResult = { status: "success"; theme: Theme } | { status: "error" };

const themeSchema = z.enum(["LIGHT", "DARK"]);

/**
 * The theme persistence server function (01-35 Task 3's option-b decision, applied here). Placed
 * at this domain's flat `actions.ts`, mirroring `src/features/auth/actions.ts`'s naming
 * convention, not a re-created `app/api/` endpoint.
 *
 * Takes only the new theme value — there is no caller-suppliable identifier anywhere in this
 * signature for it to trust or ignore (T-01-06); the user id forwarded to the external contract
 * comes exclusively from `verifySession()` below. This is called first, before validation, so an
 * unauthenticated call is refused by this function's own check regardless of what value it
 * carries (T-01-05) — nothing else in this call path establishes that a session exists.
 */
export const updateThemeAction = async (theme: Theme): Promise<UpdateThemeResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: "error" };
    }

    /*
     * Validated after the session check, before calling upstream — an invalid value never reaches
     * the backend. `theme`'s declared type already constrains it to the two allowed values at
     * compile time, but a Server Action is invokable over the wire with an arbitrary request body
     * regardless of what TypeScript claims about its caller, so this is real runtime defense, not
     * a formality.
     */
    const parsed = themeSchema.safeParse(theme);
    if (!parsed.success) {
        return { status: "error" };
    }

    const { error } = await externalApi.PUT("/users/me/theme", {
        params: { query: { userId: record.id } },
        body: { theme: parsed.data },
    });

    /*
     * The contract declares only a 200 response for this operation with no error schema at all —
     * the same gap `signInAction`/`signUpAction` already work around (`src/features/auth/
     * actions.ts`) — so the generated type's claim about `error` is widened through `unknown`
     * rather than trusted at face value.
     */
    const upstreamError: unknown = error;
    if (upstreamError !== undefined) {
        return { status: "error" };
    }

    /*
     * Write the cookie only on confirmed success — the next server render resolves the new scope
     * before hydration (`app/layout.tsx`'s `readThemeCookie` read).
     */
    await writeThemeCookie(parsed.data);

    return { status: "success", theme: parsed.data };
};
