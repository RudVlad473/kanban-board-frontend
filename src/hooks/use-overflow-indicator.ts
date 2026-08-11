"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element's own content overflows its inline-axis box
 * (`scrollWidth > clientWidth`) — the signal a trailing-edge "there's more content" indicator
 * needs to decide whether to render itself at all. Two DOM-change sources are handled
 * automatically:
 * - the element's own box resizing (a `ResizeObserver` on the element), and
 * - its rendered content changing as real DOM nodes/text (a `MutationObserver` watching
 *   `childList`/`characterData`/`subtree`) — covers e.g. a `<span>` whose text content is
 *   replaced by a re-render (Dropdown's selected-value label changing on selection).
 *
 * A native form control's own `.value` property changing on keystroke is neither of those — it's
 * an internal property update, not a DOM mutation a `MutationObserver` observes, and the
 * control's own box doesn't resize as its value grows. Callers whose overflow source is an
 * input's value (TextField) must additionally call the returned `recheck()` from an `onInput`
 * handler (and/or a `value`-keyed effect, for controlled updates that never fire a native input
 * event at all).
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

    return { ref, isOverflowing, recheck };
};
