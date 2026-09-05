"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { useMutationState } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { useMemo } from "react";

/** What every optimistic create carries: one placeholder id, or several for a multi-row fan-out. */
type CreateVariables = { clientId?: string; clientIds?: string[] };

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
 * themselves the moment the create settles. A fan-out staging several rows at once declares
 * `clientIds` instead of a single `clientId`.
 */
export const useUnconfirmedIds = ({ mutationKey }: { mutationKey: readonly unknown[] }): ReadonlySet<string> => {
    const idsByMutation = useMutationState({
        filters: { mutationKey, status: "pending" },
        select: (mutation) => {
            const variables = mutation.state.variables as CreateVariables | undefined;

            return [...(!isNil(variables?.clientId) ? [variables.clientId] : []), ...(variables?.clientIds ?? [])];
        },
    });

    const present = idsByMutation.flat();
    /*
     * Memoised on the ids themselves, not on the array: `useMutationState` returns a fresh array
     * every render, so a caller passing this set to `useEffect` would re-run that effect forever.
     */
    const fingerprint = [...present].sort().join("|");

    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fingerprint` IS the value identity of `present` (ADR tech/0016 exemption)
    return useMemo(() => new Set(present), [fingerprint]);
};
