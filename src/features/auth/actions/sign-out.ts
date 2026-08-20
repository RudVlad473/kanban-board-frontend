"use server";

import { redirect } from "next/navigation";

import { type AuthActionState } from "@/features/auth/action-state";
import { ROUTE } from "@/lib/core/routing/routes";
import { session } from "@/lib/server/session";

/*
 * The backend's own sign-out route is broken (500s, upstream session survives) — see
 * `.planning/phases/01-foundation-auth-preferences/deferred-items.md` ("Sign-out route is broken
 * on the real backend"). This app only destroys its own credential; the upstream session expires
 * on its own.
 */
// eslint-disable-next-line no-restricted-syntax -- React's useActionState calls this positionally (prevState, formData); the shape is dictated by that external API, not this project (ADR tech/0016 exemption, see sign-in.ts's identical comment)
export const signOutAction = async (_previousState: AuthActionState, _formData: FormData): Promise<AuthActionState> => {
    await session.destroy();

    /*
     * Outside any try/catch, matching sign-in.ts/sign-up.ts — redirect() signals success by
     * throwing; catching it would turn a working navigation into a silent no-op.
     */
    redirect(ROUTE.SIGN_IN);
};
