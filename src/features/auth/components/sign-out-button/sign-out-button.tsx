"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button/button";
import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signOutAction } from "@/features/auth/actions/sign-out-action";

/**
 * Sign-out is non-destructive (UI-SPEC), no confirmation modal — submits via `useActionState` +
 * `signOutAction` so it works pre-hydration. The server-side redirect re-renders the layout with
 * the cleared session cookie; no router push/refresh needed here.
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
