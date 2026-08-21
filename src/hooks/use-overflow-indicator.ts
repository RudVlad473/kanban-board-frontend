"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks inline-axis content overflow (`scrollWidth > clientWidth`) via a `ResizeObserver` (box
 * resize) plus a `MutationObserver` (DOM content changes) — the signal a trailing-edge "there's
 * more content" indicator needs. Full contract, including the `recheck()` caveat below (ADR tech/0021).
 */
export const useOverflowIndicator = <T extends HTMLElement>() => {
    const ref = useRef<T | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const recheck = useCallback(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        setIsOverflowing(el.scrollWidth > el.clientWidth);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            return undefined;
        }

        recheck();

        const resizeObserver = new ResizeObserver(recheck);
        resizeObserver.observe(el);

        const mutationObserver = new MutationObserver(recheck);
        mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [recheck]);

    /*
     * A caller whose overflow source is an input's `.value` (TextField) must call `recheck()`
     * itself, e.g. from `onInput` — a value change on keystroke is neither a resize nor a DOM
     * mutation this hook observes automatically (ADR tech/0021).
     */
    return { ref, isOverflowing, recheck };
};
