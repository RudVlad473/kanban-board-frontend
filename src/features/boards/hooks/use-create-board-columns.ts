"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `e2e/boards-create.e2e.spec.ts`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";

import { useToast } from "@/components/ui/toast/use-toast";
import { createBoardColumnsAction } from "@/features/boards/actions/create-board-columns-action";
import { pickColorsForNewColumns } from "@/features/boards/column-palette";
import {
    toInFlightColumns,
    withColumnInsert,
    withColumnRemove,
    type InFlightColumnCreate,
} from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";

const buildColumnFailureTitle = (failedCount: number): string => `Couldn't create ${String(failedCount)} column(s).`;

const RETRY_ACTION_LABEL = "Retry";

/**
 * A stable, board-scoped toast id. Load-bearing, not an incidental argument: Base UI's manager
 * upserts on an existing id, which is what makes a retry narrow one toast instead of stacking a
 * second beside a stale first.
 */
export const buildColumnFailureToastId = (boardId: string): string => `board-columns-failed:${boardId}`;

/**
 * What the fan-out mutation is called with. `clientIds`/`colors` ride on the variables — empty for
 * a RETRY, which owns no placeholders — so `useUnconfirmedIds` and `toInFlightColumns` can read them
 * back before anything has been written to the board entry (docs/adr/tech/0030).
 */
type CreateColumnsVariables = { boardId: string; names: string[]; clientIds: string[]; colors: (string | undefined)[] };

// comment-length-exempt: records why this hook exists apart from `use-create-board.ts`, the measurement behind that split, and the mount-time contract it hands off to
/**
 * BOARD-02's column fan-out (docs/adr/tech/0030), split out of `use-create-board.ts` on purpose.
 *
 * `createBoard()` no longer calls this directly — measured live (260907-exb Task 1) that dispatching
 * the fan-out concurrently with `router.push()` stalls the WHOLE navigation until the fan-out (and
 * its own trailing `router.refresh()`) settle, because both share Next's single pending-transition
 * commit. `useRunPendingColumnFanOut` is the only intended caller of `createColumns`, run once the
 * new board has actually mounted — the earliest point anything is subscribed to the `["board", id]`
 * entry this hook's `onMutate` stages into. `board-list.tsx` still uses `retryColumns` and
 * `raiseColumnFailureToast` directly, since a retry's failure toast can fire from either surface.
 */
export const useCreateBoardColumns = () => {
    const toast = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationKey: MUTATION_KEY.CREATE_COLUMN,
        mutationFn: async ({ boardId, names }: CreateColumnsVariables) => {
            const result = await createBoardColumnsAction({ boardId, names });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, names, clientIds, colors }: CreateColumnsVariables) => {
            const queryKey = buildBoardQueryKey(boardId);
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            // A retry owns no placeholders (`clientIds` empty) — nothing to stage.
            if (clientIds.length === 0) {
                return;
            }

            /* `version: 0` is inert placeholder filler — the server owns it, and success replaces it. */
            queryClient.setQueryData<BoardFull>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: names.reduce(
                              (columns, name, index) =>
                                  withColumnInsert({
                                      columns,
                                      column: {
                                          id: clientIds[index],
                                          name,
                                          version: 0,
                                          position: columns.length,
                                          color: colors[index],
                                          tasks: [],
                                      },
                                  }),
                              current.columns,
                          ),
                      },
            );
        },

        /* A wholesale failure retires the owned placeholders — the board must not claim columns the server never heard of. */
        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (_error: unknown, { boardId, clientIds }: CreateColumnsVariables) => {
            if (clientIds.length === 0) {
                return;
            }

            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(boardId), (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: clientIds.reduce(
                              (columns, columnId) => withColumnRemove({ columns, columnId }),
                              current.columns,
                          ),
                      },
            );
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSuccess positionally (ADR tech/0016 exemption)
        onSuccess: (result, { boardId, clientIds }: CreateColumnsVariables) => {
            // comment-length-exempt: records the rule this write exists to satisfy and the navigation failure that leaving it to refresh() causes, which is what kept `prefetch` off the sidebar links
            /*
             * The fan-out writes the board entry itself (docs/adr/tech/0030 rule 4). It landed
             * through the action's own `refresh()` alone until now, and `refresh()` never reaches a
             * PREFETCHED route — so a board opened from a prefetched link rendered with none of its
             * columns. `board-card.tsx` names this hook as one of the two blockers for turning
             * `prefetch` on.
             */
            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(boardId), (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          /* Retire every OWNED placeholder before inserting what landed — `created` holds only what survived, so pairing by index would misattribute a partial failure. */
                          columns: result.created.reduce(
                              (columns, column) => withColumnInsert({ columns, column: { ...column, tasks: [] } }),
                              clientIds.reduce(
                                  (columns, columnId) => withColumnRemove({ columns, columnId }),
                                  current.columns,
                              ),
                          ),
                      },
            );
        },
    });

    /**
     * Runs the column phase for exactly the names given, returning the ones that still failed.
     * `ownedClientIds` names the placeholders THIS call stages and retires — empty for a retry,
     * which owns none (mirrors `use-create-task.ts`'s `ownedClientIds`).
     */
    const createColumns = async ({
        boardId,
        names,
        ownedClientIds = [],
    }: {
        boardId: string;
        names: string[];
        ownedClientIds?: string[];
    }): Promise<string[]> => {
        /*
         * Colours are picked HERE, once, rather than inside `onMutate` — `toInFlightColumns` reads
         * them off `pending.state.variables`, which are fixed the moment `mutateAsync` is called, so
         * a concurrent single-column create (`use-create-column.ts`) sees the SAME hexes this stages.
         */
        const colors =
            ownedClientIds.length > 0
                ? pickColorsForNewColumns({
                      existingColumns: [
                          ...(queryClient.getQueryData<BoardFull>(buildBoardQueryKey(boardId))?.columns ?? []),
                          ...toInFlightColumns({
                              pending: queryClient
                                  .getMutationCache()
                                  .findAll({ mutationKey: MUTATION_KEY.CREATE_COLUMN, status: "pending" })
                                  .map((pending) => pending.state.variables as InFlightColumnCreate | undefined),
                              boardId,
                          }),
                      ],
                      count: names.length,
                  })
                : [];

        const result = await mutation
            .mutateAsync({ boardId, names, clientIds: ownedClientIds, colors })
            .catch(() => ({ status: RESULT_STATUS.ERROR, failedNames: names, created: [] }) as const);

        // A wholesale failure leaves the set unchanged rather than reporting fewer failures than there are.
        return result.status !== RESULT_STATUS.SUCCESS ? names : result.failedNames;
    };

    /** Reports a fan-out that left columns missing, offering the Retry that re-runs just those names. */
    const raiseColumnFailureToast = ({ boardId, failedNames }: { boardId: string; failedNames: string[] }): void => {
        toast.add({
            id: buildColumnFailureToastId(boardId),
            type: "danger",
            title: buildColumnFailureTitle(failedNames.length),
            actionProps: {
                children: RETRY_ACTION_LABEL,
                onClick: () => {
                    void retryColumns({ boardId, names: failedNames });
                },
            },
        });
    };

    /**
     * Re-runs the column phase for exactly the still-failing names. A retry that itself partially
     * fails upserts the SAME toast id with the smaller set; one that fully succeeds closes it,
     * because a toast still naming created columns would misreport what persisted.
     */
    const retryColumns = async ({ boardId, names }: { boardId: string; names: string[] }): Promise<void> => {
        const stillFailingNames = await createColumns({ boardId, names });

        if (stillFailingNames.length === 0) {
            toast.close(buildColumnFailureToastId(boardId));
            return;
        }

        raiseColumnFailureToast({ boardId, failedNames: stillFailingNames });
    };

    return { createColumns, retryColumns, raiseColumnFailureToast };
};
