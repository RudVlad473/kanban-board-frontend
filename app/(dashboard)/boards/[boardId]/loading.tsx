// Covered by: `e2e/boards-switch.e2e.spec.ts`

// comment-length-exempt: records that an EMPTY fallback is the load-bearing part of this file, and the exact Next behaviour that makes deleting the file break the feature it serves
/*
 * Deliberately empty, and deliberately still here.
 *
 * The file's presence is what makes a board switch commit the new URL immediately instead of
 * holding the old screen until the next segment's RSC payload arrives — which is what lets the
 * layout's `BoardScreen` see the new board id and paint it from cache in the same frame. Deleting
 * the file re-introduces the wait; returning a skeleton from it re-introduces the flash, because
 * this fallback covers the very board area the layout is already painting correctly.
 *
 * Composition only, no logic ("app/ is routing only").
 */
const BoardDetailLoading = () => {
    /* An empty fragment, not `null`: `pnpm tsx:check` identifies a component by the JSX it returns. */
    return <></>;
};

export default BoardDetailLoading;
