"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx` and `src/features/boards/components/boards-empty-state/boards-empty-state.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";

import { NO_AUTO_DISMISS, useToast } from "@/components/ui/toast/use-toast";
import { createBoardAction } from "@/features/boards/actions/create-board-action";
import { mintBoardId } from "@/features/boards/board-id";
import { pickColorsForNewColumns } from "@/features/boards/column-palette";
import { useCreateBoardColumns } from "@/features/boards/hooks/use-create-board-columns";
import { removeBoard, toSubmittedColumnNames, withBoardInsert } from "@/features/boards/model";
import { claimPendingColumnFanOut } from "@/features/boards/pending-column-fan-out";
import type { Board, BoardFull, ColumnFull } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";
import { QUERY_KEY } from "@/lib/core/query-keys/query-keys";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";

/*
 * Authored copy only — the actions return bare discriminants, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract).
 */
const GENERIC_CREATE_FAILURE_COPY = { title: "Couldn't create board.", description: "Try again." };

/* Only the branches with something distinct to tell the user, mirroring `use-rename-board.ts`'s own table. */
const CREATE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.DUPLICATE]: {
        title: "A board with that name already exists.",
        description: "Choose a different name.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to create a board.",
    },
};

const RETRY_ACTION_LABEL = "Retry";

/**
 * One id per ATTEMPT — the WHOLE attempt, rows included.
 *
 * Base UI upserts on a repeated id, so a field left out lets a later attempt swallow an earlier
 * one's Retry, and with it the only route back to those values.
 */
export const buildCreateFailureToastId = ({ name, columnRows }: CreateBoardArgs): string =>
    `board-create-failed:${JSON.stringify([name, columnRows])}`;

/**
 * What the create mutation is called with — the id the client minted, which is also the board's
 * final one, plus the placeholder columns the typed rows become.
 */
type CreateBoardVariables = { clientId: string; name: string; columns: ColumnFull[] };

/** What a create was attempted with — a failed one is handed back so its Retry can reopen prefilled. */
export type CreateBoardArgs = { name: string; columnRows: string[] };

// comment-length-exempt: records where the URL move and the column phase each happen, neither of which is in this function's own body
/**
 * Orchestrates BOARD-02's two-phase create — the board first, then one column per named row.
 * Neither phase is waited on by the caller (D-05, reversed 2026-09-03): the modal closes on submit,
 * the URL moves in the same frame, and each phase reports its own failure through its own toast.
 *
 * The URL move lives at `onMutate`'s tail, which is the only site where "no `await` between the
 * cache writes and the push" holds by construction. The column phase does not run here either: it
 * is claimed through `claimPendingColumnFanOut` and run by `useRunPendingColumnFanOut` at the new
 * board's own mount — the earliest point anything is subscribed to the entry it stages into.
 */
export const useCreateBoard = ({ onRetry }: { onRetry: (args: CreateBoardArgs) => void }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { createColumns, retryColumns, raiseColumnFailureToast } = useCreateBoardColumns();

    /*
     * The sidebar's row appears on submit, not on settle — the panel reads this cache entry rather
     * than the RSC props, so the action's `refresh()` cannot reach it (docs/adr/tech/0030). The row
     * is staged under the id `createBoard` minted, which is the id the board ends up having.
     */
    const createBoardMutation = useMutation({
        mutationKey: MUTATION_KEY.CREATE_BOARD,
        mutationFn: async ({ clientId, name }: CreateBoardVariables) => {
            const result = await createBoardAction({ name, id: clientId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        /* No snapshot taken: `onError` below reconciles by `clientId`, so there is nothing to restore. */
        onMutate: async ({ clientId, name, columns }: CreateBoardVariables) => {
            // Or an in-flight read could land on top of the optimistic list and undo it.
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.BOARDS });

            /* `version: 0` is the value a fresh board is actually seeded at, measured and pinned in `create-board-action.integration.test.ts`. */
            queryClient.setQueryData<Board[]>(QUERY_KEY.BOARDS, (current) =>
                withBoardInsert({ boards: current ?? [], board: { id: clientId, name, version: 0 } }),
            );

            // comment-length-exempt: records why this entry needs no cancel and why the typed columns are staged HERE rather than at the mount that dispatches them, which is the frame the empty-board copy used to occupy
            /*
             * No `cancelQueries` for this key: the id was minted microseconds ago, so no read naming
             * it can be in flight.
             *
             * The typed columns are staged WITH the board, not by the fan-out's own `onMutate`.
             * That hook runs from `BoardView`'s mount effect, i.e. after the first paint, so a board
             * seeded with `columns: []` shows "This board is empty" for a frame first — measured
             * 2026-09-08, and the second of the two gaps the reported recording shows.
             */
            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(clientId), {
                id: clientId,
                name,
                version: 0,
                columns,
            });

            // comment-length-exempt: records the platform behaviour this line rests on and the one-frame skeleton an await placed above it would reintroduce, neither visible from the call itself
            /*
             * The URL moves HERE, at this function's tail, and nowhere else. Next 16's Native
             * History API updates `usePathname()` in the same commit and issues no RSC request for
             * the new segment (measured 260908-g61), so `BoardScreen` repaints out of the entry
             * seeded just above with nothing on the network in the way. An `await` between the two
             * writes and this call would let it read an id with no entry and paint
             * `BoardViewSkeleton` for a frame, which is the defect this whole path removes.
             */
            window.history.pushState(null, "", buildBoardDetailPath(clientId));
        },

        /*
         * Removes THIS create's own row, never restores a snapshot: a second create that landed
         * while this one flew is in the entry but not in that snapshot, and would be erased with it.
         */
        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (_error: unknown, { clientId }: CreateBoardVariables) => {
            queryClient.setQueryData<Board[]>(QUERY_KEY.BOARDS, (current) =>
                isNil(current) ? current : removeBoard({ boards: current, boardId: clientId }),
            );
        },

        /* No exemption needed here, unlike `onError`: the response is the only argument read now. */
        onSuccess: ({ board }) => {
            /*
             * Deliberately writes no boards-list row: the staged one already carries the id, name
             * and version the server answered with — the only three fields that entry holds —
             * measured in `create-board-action.integration.test.ts`.
             */

            /*
             * MERGES, never assigns (ADR tech/0030 rule 2). The entry was seeded in `onMutate`, and
             * by the time this runs the column fan-out has staged its placeholders into it — the
             * `columns: []` this used to write erased exactly those.
             */
            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(board.id), (current) =>
                isNil(current) ? { ...board, columns: [] } : { ...current, ...board },
            );
        },
    });

    /** Reports a board that never landed, offering the reopen that carries the typed values back. */
    const raiseCreateFailureToast = ({ args, status }: { args: CreateBoardArgs; status: ResultStatus }): void => {
        const isSessionExpired = status === RESULT_STATUS.UNAUTHENTICATED;
        const toastId = buildCreateFailureToastId(args);

        toast.add({
            id: toastId,
            type: "danger",
            timeout: NO_AUTO_DISMISS,
            ...(CREATE_FAILURE_COPY[status] ?? GENERIC_CREATE_FAILURE_COPY),
            /* An expired session names itself: a Retry there could only reopen a modal that fails again. */
            ...(!isSessionExpired
                ? {
                      actionProps: {
                          children: RETRY_ACTION_LABEL,
                          onClick: () => {
                              toast.close(toastId);
                              onRetry(args);
                          },
                      },
                  }
                : {}),
        });
    };

    const createBoard = async (args: CreateBoardArgs): Promise<void> => {
        const boardId = mintBoardId();
        /* Read before anything moves the URL — this is where a refused create puts the user back. */
        const previousPath = window.location.pathname;
        const names = toSubmittedColumnNames(args.columnRows);
        const clientIds = names.map(() => crypto.randomUUID());
        /* No existing columns to avoid — the board is being created in this same call. */
        const colors = pickColorsForNewColumns({ existingColumns: [], count: names.length });
        const columns = names.map((name, index) => ({
            id: clientIds[index],
            name,
            version: 0,
            position: index,
            color: colors[index],
            tasks: [],
        }));

        // comment-length-exempt: records why the settle signal is built by hand and why the claim cannot wait for the mutation, both of which read as avoidable indirection otherwise
        /*
         * A hand-built deferred rather than `Promise.withResolvers`, which is newer than this app's
         * browser targets. It has to exist BEFORE `mutateAsync`, because the claim does: `onMutate`
         * moves the URL, which mounts `BoardView` in the same frame, and that mount reads the claim
         * destructively — so a claim made afterwards is one the reader has already missed.
         */
        let reportBoardCreated: (didCreate: boolean) => void = () => undefined;
        const boardCreated = new Promise<boolean>((resolve) => {
            reportBoardCreated = resolve;
        });

        if (names.length > 0) {
            claimPendingColumnFanOut({ boardId, names, clientIds, colors, boardCreated });
        }

        const outcome = await createBoardMutation
            .mutateAsync({ clientId: boardId, name: args.name, columns })
            .then(() => ({ didCreate: true as const }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        /* Releases the fan-out's own dispatch either way — a false here is what retires its placeholders. */
        reportBoardCreated(outcome.didCreate);

        if (outcome.didCreate) {
            return;
        }

        // comment-length-exempt: records the mechanism chosen for the URL rollback, the cost that choice accepts, and the reason it is conditional — a decision a future reader would otherwise re-open
        /*
         * `replaceState`, never `history.back()`. This is deterministic: it does not depend on where
         * the history cursor sits, cannot overshoot when the user moved twice, and is synchronous, so
         * the URL lands in the same frame as the row removal and the toast. Its cost, stated rather
         * than hidden: the rolled-back entry duplicates the one beneath it, so the user's next Back
         * press reads as a no-op — strictly better than leaving them on a board that does not exist.
         *
         * ONLY while they are still standing on that board. Someone who opened another board
         * mid-flight chose it, and yanking them out of it is worse than the entry the removal below
         * cleans up anyway.
         */
        if (window.location.pathname === buildBoardDetailPath(boardId)) {
            window.history.replaceState(null, "", previousPath);
        }

        // comment-length-exempt: records the crash that fixes this write's position, which reads as an arbitrary distance from the `onError` that removes the sibling row
        /*
         * An entry for a board the server never created must not outlive the failure — but removed
         * from `onError`, i.e. while `BoardView` is still mounted on it, `useQuery` hands that
         * component `undefined` and it crashes on `board.columns`, taking the toast viewport down
         * with the tree (measured 2026-09-08). After the URL has moved, nothing is observing it.
         */
        queryClient.removeQueries({ queryKey: buildBoardQueryKey(boardId), exact: true });

        raiseCreateFailureToast({ args, status: outcome.status });
    };

    return { createBoard, createColumns, retryColumns, raiseColumnFailureToast };
};
