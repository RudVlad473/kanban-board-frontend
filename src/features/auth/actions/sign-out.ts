"use server";

import { redirect } from "next/navigation";

import { type AuthActionState } from "@/features/auth/action-state";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { session } from "@/lib/server/session";

/*
 * The backend's sign-out route is broken (500s) — this app destroys only its own credential (see
 * 01-foundation-auth-preferences/deferred-items.md).
 */
// eslint-disable-next-line no-restricted-syntax -- React's useActionState calls this positionally (prevState, formData); the shape is dictated by that external API, not this project (ADR tech/0016 exemption, see sign-in.ts's identical comment)
export const signOutAction = async (_previousState: AuthActionState, _formData: FormData): Promise<AuthActionState> => {
    /*
     * `app/layout.tsx` resolves the pre-paint `dark` scope from the theme cookie alone, with no
     * session fallback — it must be torn down here in lockstep with the session cookie (FT-01).
     */
    await themeCookie.clear();
    await session.destroy();

    /*
     * Outside any try/catch, matching sign-in.ts/sign-up.ts — redirect() signals success by
     * throwing; catching it would turn a working navigation into a silent no-op.
     */
    redirect(ROUTE.SIGN_IN);
};
