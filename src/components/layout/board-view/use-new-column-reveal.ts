"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useEffect, useRef } from "react";

/**
 * The two-pass scroll to a newly created column, and the ref naming what to scroll to.
 *
 * Two passes because the row grows only once the create action's own `refresh()` lands.
 */
export const useNewColumnReveal = ({ columnCount }: { columnCount: number }) => {
    const ghostColumnRef = useRef<HTMLButtonElement>(null);
    /** The column count when a create landed — a ref, so retiring the request costs no render. */
    const requestedAtCount = useRef<number | null>(null);

    /* No motion argument: the default resolves to the row's own CSS, which is what `motion-reduce` varies. */
    const scrollGhostColumnIntoView = (): void => {
        ghostColumnRef.current?.scrollIntoView({ inline: "end", block: "nearest" });
    };

    /* Retired as it runs, so a later count change (a delete) cannot re-fire it (T-03-27). */
    useEffect(() => {
        if (requestedAtCount.current === null || requestedAtCount.current === columnCount) {
            return;
        }

        requestedAtCount.current = null;
        scrollGhostColumnIntoView();
    }, [columnCount]);

    /** Call when a create lands: scrolls now, and again once the row has actually grown. */
    const revealOnNextGrowth = (): void => {
        requestedAtCount.current = columnCount;
        scrollGhostColumnIntoView();
    };

    return { ghostColumnRef, revealOnNextGrowth };
};
