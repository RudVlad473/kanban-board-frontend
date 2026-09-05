"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutationState } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { useMemo } from "react";

/** What every optimistic create carries: the id its placeholder wears until the server replies. */
type CreateVariables = { clientId?: string };

// comment-length-exempt: records the invariant that makes an id here unusable, and why the mutation cache is the source rather than a flag on the entity itself
/**
 * The ids of entities that are on screen but not yet acknowledged by the server.
 *
 * Every optimistic create stages its row under a client-generated `clientId` and swaps in the
 * server's real id on success (docs/adr/tech/0030). Until that swap, the id names nothing upstream:
 * any request built from it — a move, a rename, a delete, a child create — is addressed to a
 * resource that does not exist, so every control that would send one must be disabled.
 *
 * Read from the mutation cache rather than from a flag on the cached entity, because the entity is
 * merged over on success and a flag would have to be un-set by hand; a mutation leaving `pending`
 * retires its id here on its own. `useMutationState` subscribes, so the controls re-enable
 * themselves the moment the create settles.
 */
export const useUnconfirmedIds = ({ mutationKey }: { mutationKey: readonly unknown[] }): ReadonlySet<string> => {
    const clientIds = useMutationState({
        filters: { mutationKey, status: "pending" },
        select: (mutation) => (mutation.state.variables as CreateVariables | undefined)?.clientId,
    });

    const present = clientIds.filter((clientId): clientId is string => !isNil(clientId));
    /*
     * Memoised on the ids themselves, not on the array: `useMutationState` returns a fresh array
     * every render, so a caller passing this set to `useEffect` would re-run that effect forever.
     */
    const fingerprint = [...present].sort().join("|");

    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fingerprint` IS the value identity of `present` (ADR tech/0016 exemption)
    return useMemo(() => new Set(present), [fingerprint]);
};
