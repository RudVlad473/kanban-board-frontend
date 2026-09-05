"use client";

// Covered by: `e2e/boards-create.e2e.spec.ts`, `src/components/layout/board-view/board-view.test.tsx`

import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

/*
 * Flushes observer notifications on the microtask queue, not the default macrotask, so a cache
 * write lands before the next paint — otherwise dnd-kit's own drop render paints one macrotask
 * ahead of an optimistic reorder reaching `useQuery`. Decision record: docs/adr/tech/0034.
 */
notifyManager.setScheduler(queueMicrotask);

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
