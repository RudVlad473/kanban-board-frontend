"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

/*
 * Created in component state, not module scope — a shared singleton would leak one user's
 * cached/mutation state into another's SSR response. `retry: false` on mutations: a failed
 * sign-in/sign-up must not be silently retried (see 01-12-SUMMARY.md).
 */
export const QueryProvider = ({ children }: PropsWithChildren) => {
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
