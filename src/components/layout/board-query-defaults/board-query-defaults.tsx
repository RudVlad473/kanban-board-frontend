"use client";

// Covered by: `e2e/boards-switch.e2e.spec.ts`

import { useQueryClient } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

import { BOARD_QUERY_DEFAULTS } from "@/features/boards/queries/board-query";
import { BOARD_QUERY_KEY_PREFIX } from "@/lib/core/query-keys/board-query-key";

// comment-length-exempt: records why this sits in the layout ring rather than beside the query client it configures, which is a boundary decision a reader would otherwise "simplify" into an import the linter refuses
/**
 * Attach the board entry's fetcher to its key family, before anything below can observe it.
 *
 * Registered here rather than where the `QueryClient` is built (`lib/client/query-client.tsx`)
 * because the fetcher reaches a Server Action in the boards feature, and `lib-client -> feature`
 * is disallowed while `layout -> feature` is allowed. So the client stays generic and this — the
 * innermost ring permitted to know about boards — supplies the board-specific half.
 */
export const BoardQueryDefaults = ({ children }: PropsWithChildren) => {
    const queryClient = useQueryClient();

    /*
     * A `useState` initialiser, so this runs exactly once and during the FIRST render — an effect
     * would land after the observers below have already mounted and possibly fetched.
     */
    useState(() => {
        queryClient.setQueryDefaults(BOARD_QUERY_KEY_PREFIX, BOARD_QUERY_DEFAULTS);

        return null;
    });

    /* Wrapped rather than returned bare: `pnpm tsx:check` identifies a component by the JSX it returns. */
    return <>{children}</>;
};
