import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { postSignUp } from "@/features/auth/api/auth-api";
import type { SignUpInput } from "@/lib/validation/auth-schemas";

/*
 * A brand-new account lands on the boards list, same destination as a returning sign-in
 * (use-sign-in.ts) — `router.refresh()` re-renders the current route tree so a Server Component
 * sees the session cookie `postSignUp`'s Route Handler just set, which the client router alone
 * would otherwise miss.
 */
const POST_SIGN_UP_PATH = "/boards";

type SignUpResponse = { ok: true };

/**
 * TanStack Query mutation wrapping `postSignUp`. Retry is disabled (both here and at the
 * `QueryProvider`'s default level) — a failed sign-up must not be silently retried. The error
 * surfaced to callers (`mutation.error?.message`) is the server's own message, unmodified; that
 * copy decision belongs to UI-SPEC and lives in the Route Handler, not here.
 */
export const useSignUp = (): UseMutationResult<SignUpResponse, Error, SignUpInput> => {
    const router = useRouter();

    return useMutation({
        mutationFn: postSignUp,
        retry: false,
        onSuccess: () => {
            router.push(POST_SIGN_UP_PATH);
            router.refresh();
        },
    });
};
