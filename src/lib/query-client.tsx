"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/*
 * Created inside component state, not a module-scope singleton — a module-scope `QueryClient`
 * would be shared across every concurrent server request, leaking one user's cached/mutation
 * state into another's response (TanStack Query's own SSR guidance). `retry: false` on mutations:
 * a failed sign-in/sign-up must not be silently retried, both because it would double-count
 * against any future rate limit and because the user is standing there waiting for an answer.
 */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    mutations: {
                        retry: false,
                    },
                },
            }),
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
