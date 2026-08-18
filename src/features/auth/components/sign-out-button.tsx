"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button/button";
import { postSignOut } from "@/features/auth/api/auth-api";
import { ROUTE } from "@/lib/routes";

/**
 * Sign-out is non-destructive (UI-SPEC Copywriting Contract) — no confirmation modal. Posts to
 * the sign-out BFF endpoint, then navigates to the sign-in route and refreshes the router so the
 * server re-renders `app/(dashboard)/layout.tsx` without the now-cleared session cookie.
 */
export const SignOutButton = () => {
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: postSignOut,
        onSuccess: () => {
            router.push(ROUTE.SIGN_IN);
            router.refresh();
        },
    });

    return (
        <Button
            type="button"
            variant="secondary"
            isDisabled={mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={() => {
                mutation.mutate();
            }}
        >
            Sign Out
        </Button>
    );
};
