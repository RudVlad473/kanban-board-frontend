import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { postSignIn } from "@/features/auth/api/auth-api";
import { ROUTE } from "@/lib/routes";
import type { SignInInput } from "@/lib/validation/auth-schemas";

type SignInResponse = { ok: true };

/**
 * TanStack Query mutation wrapping `postSignIn`. Retry is disabled (both here and at the
 * `QueryProvider`'s default level) — a failed sign-in must not be silently retried, both because
 * it would double-count against any future rate limit and because the user is standing there
 * waiting for an answer. The error surfaced to callers (`mutation.error?.message`) is the
 * server's own message, unmodified.
 */
export const useSignIn = (): UseMutationResult<SignInResponse, Error, SignInInput> => {
    const router = useRouter();

    return useMutation({
        mutationFn: postSignIn,
        retry: false,
        onSuccess: () => {
            /*
             * Same post-authentication destination as use-sign-up.ts — see that file's comment for
             * why `router.refresh()` is required alongside `router.push()`.
             */
            router.push(ROUTE.BOARDS);
            router.refresh();
        },
    });
};
