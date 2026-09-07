"use client";

// Covered by: `e2e/boards-delete.e2e.spec.ts`

import { useMutationState } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { usePathname } from "next/navigation";

import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

/** What `use-delete-board.ts`'s `onMutate` returns as its mutation context — the fields this reads only. */
type DeleteBoardContext = { destinationBoardId?: string | null };

// comment-length-exempt: records the measured mechanism this hook exists to close, why the override outlives "pending", and why the fix reads TanStack's own mutation cache rather than the URL
/**
 * The board id every reader should treat as "open" — the URL's own id, UNLESS the delete this URL's
 * own board just went through resolved to a different destination, in which case that destination
 * is used instead.
 *
 * `usePathname()` cannot answer this alone: `use-delete-board.ts`'s `router.replace` updates the
 * ADDRESS BAR (`page.url()`) immediately, but the pathname React components read only moves once
 * the destination's RSC payload commits — a round trip measured at ~700-800ms against the real
 * backend (260907-q83). For that whole window `dashboard-header.tsx` and `board-screen.tsx` each
 * independently resolved a stale id: the just-deleted board's own, whose row `onMutate` already
 * removed from the boards list — a blank header title and the deleted board's own stale content,
 * both from the one cause.
 *
 * NOT scoped to `status: "pending"`: the delete's own network round trip usually SETTLES well
 * before the (separately held) RSC navigation does, so a pending-only filter closed the window for
 * a moment and then reopened it the instant the mutation succeeded (measured live against a
 * production build, 260907-q83) — a `status !== "error"` mutation is used until the URL itself
 * catches up, which is what naturally retires the match: once `pathBoardId` becomes the
 * destination, it no longer equals `deletedBoardId` and nothing overrides it. `error` is excluded
 * so a REFUSED delete falls back to the real pathname while `onError`'s own reverse `router.replace`
 * is in flight, rather than continuing to claim the failed destination.
 *
 * Read via `useMutationState`, the same shape `useUnconfirmedIds` already uses to watch a
 * mutation's own variables — not a bespoke override store, and not `useOptimistic`: ADR 0029's
 * override-store and reference-equality-retired shapes stay superseded (CLAUDE.md).
 */
export const useOpenBoardId = (): string | null => {
    const pathBoardId = toBoardIdFromPath(usePathname());

    const deleteBoardMutations = useMutationState({
        filters: { mutationKey: MUTATION_KEY.DELETE_BOARD },
        select: (mutation) => {
            const variables = mutation.state.variables as { boardId: string } | undefined;
            const context = mutation.state.context as DeleteBoardContext | undefined;

            return {
                status: mutation.state.status,
                deletedBoardId: variables?.boardId,
                destinationBoardId: context?.destinationBoardId ?? null,
            };
        },
    });

    const strandingDelete = deleteBoardMutations.findLast(
        (entry) => entry.status !== "error" && entry.deletedBoardId === pathBoardId,
    );

    return isNil(strandingDelete) ? pathBoardId : strandingDelete.destinationBoardId;
};
