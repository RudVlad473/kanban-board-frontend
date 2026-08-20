"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signOutAction } from "@/features/auth/actions/sign-out";

/**
 * Sign-out is non-destructive (UI-SPEC Copywriting Contract) — no confirmation modal. Submits
 * through the form element's own `action` (`useActionState` + `signOutAction`), so it works
 * before hydration, mirroring sign-in-form.tsx/sign-up-form.tsx's idiom. The redirect happens on
 * the server, so the layout re-renders without the cleared session cookie by itself — no router
 * push or refresh needed here.
 */
export const SignOutButton = () => {
    const [, dispatch, isActionPending] = useActionState(signOutAction, AUTH_ACTION_IDLE);

    return (
        <form action={dispatch}>
            <Button type="submit" variant="secondary" isDisabled={isActionPending} aria-busy={isActionPending}>
                Sign Out
            </Button>
        </form>
    );
};
