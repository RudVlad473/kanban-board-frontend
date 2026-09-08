"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx` and `src/features/boards/components/boards-empty-state/boards-empty-state.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { useRouter } from "next/navigation";

import { NO_AUTO_DISMISS, useToast } from "@/components/ui/toast/use-toast";
import { createBoardAction } from "@/features/boards/actions/create-board-action";
import { mintBoardId } from "@/features/boards/board-id";
import { useCreateBoardColumns } from "@/features/boards/hooks/use-create-board-columns";
import { removeBoard, toSubmittedColumnNames, withBoardInsert } from "@/features/boards/model";
import { claimPendingColumnFanOut } from "@/features/boards/pending-column-fan-out";
import type { Board, BoardFull } from "@/features/boards/schemas";
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

/** What the create mutation is called with — the id the client minted, which is also the board's final one. */
type CreateBoardVariables = { clientId: string; name: string };

/** What a create was attempted with — a failed one is handed back so its Retry can reopen prefilled. */
export type CreateBoardArgs = { name: string; columnRows: string[] };

// comment-length-exempt: records why the column phase is handed off rather than run here, and the measurement behind that, which the two-line body below reads as an unexplained omission otherwise
/**
 * Orchestrates BOARD-02's two-phase create — the board first, then one column per named row, only
 * if the board landed. Neither phase is waited on by the caller (D-05, reversed 2026-09-03): the
 * modal closes on submit, and the board phase reports its failure through its own toast.
 *
 * The column phase itself does NOT run here. Measured live (260907-exb Task 1): firing it
 * concurrently with `router.push()` stalls the WHOLE navigation — no URL change, no skeleton, no
 * columns — until the fan-out (and its own trailing `router.refresh()`) settle, because both share
 * Next's single pending-transition commit. `createBoard()` instead claims it via
 * `claimPendingColumnFanOut`, and `useRunPendingColumnFanOut` runs it once the new board's own route
 * has actually mounted — see that hook and `use-create-board-columns.ts` for the rest of the phase.
 */
export const useCreateBoard = ({ onRetry }: { onRetry: (args: CreateBoardArgs) => void }) => {
    const router = useRouter();
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
        onMutate: async ({ clientId, name }: CreateBoardVariables) => {
            // Or an in-flight read could land on top of the optimistic list and undo it.
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.BOARDS });

            /* `version: 0` is the value a fresh board is actually seeded at, measured and pinned in `create-board-action.integration.test.ts`. */
            queryClient.setQueryData<Board[]>(QUERY_KEY.BOARDS, (current) =>
                withBoardInsert({ boards: current ?? [], board: { id: clientId, name, version: 0 } }),
            );
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
             * Seeds the open-board entry (ADR tech/0030 rule 4) — a board with no columns yet, so
             * there is nothing to merge with. Does NOT close the new board's empty-state flash on
             * first paint; see `.planning/debug/board-create-optimistic.md` for that separate race.
             */
            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(board.id), { ...board, columns: [] });
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
        const outcome = await createBoardMutation
            .mutateAsync({ clientId: mintBoardId(), name: args.name })
            .then((result) => ({ didCreate: true as const, board: result.board }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        if (!outcome.didCreate) {
            raiseCreateFailureToast({ args, status: outcome.status });
            return;
        }

        /* Read off the RESPONSE, so the push stays gated on a board the server has confirmed exists. */
        const boardId = outcome.board.id;
        const names = toSubmittedColumnNames(args.columnRows);

        /* Claimed BEFORE the push — see this hook's own doc for why the phase cannot run from here. */
        if (names.length > 0) {
            claimPendingColumnFanOut({ boardId, names, clientIds: names.map(() => crypto.randomUUID()) });
        }

        router.push(buildBoardDetailPath(boardId));
    };

    return { createBoard, createColumns, retryColumns, raiseColumnFailureToast };
};
