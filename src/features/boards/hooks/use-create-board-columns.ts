"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `e2e/boards-create.e2e.spec.ts`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";

import { useToast } from "@/components/ui/toast/use-toast";
import { createBoardColumnsAction } from "@/features/boards/actions/create-board-columns-action";
import { withColumnInsert, withColumnRemove } from "@/features/boards/model";
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
type CreateColumnsVariables = {
    boardId: string;
    names: string[];
    clientIds: string[];
    colors: (string | undefined)[];
    /** Absent for a RETRY and for a board that already exists; inert to the two readers above, which read named fields. */
    boardCreated?: Promise<boolean>;
};

/**
 * What `createColumns` reports — a bare `string[]` could not say "the board itself never landed".
 * That arm exists so the caller can stay silent: the board's own toast is the one failure the user
 * gets, and a `router.refresh()` against a path they are being rolled back from is worse than none.
 */
export type CreateColumnsOutcome = { boardLanded: true; failedNames: string[] } | { boardLanded: false };

// comment-length-exempt: records why this hook exists apart from `use-create-board.ts` and the mount-time contract it hands off to, neither of which the body states
/**
 * BOARD-02's column fan-out (docs/adr/tech/0030), split out of `use-create-board.ts` on purpose.
 *
 * `createBoard()` does not call this directly. `useRunPendingColumnFanOut` is the only intended
 * caller of `createColumns`, run once the new board has actually mounted — the earliest point
 * anything is subscribed to the `["board", id]` entry this hook's `onMutate` stages into, and now
 * also the point at which the board's own create may still be in flight. `board-list.tsx` still
 * uses `retryColumns` and `raiseColumnFailureToast` directly, since a retry's failure toast can
 * fire from either surface.
 */
export const useCreateBoardColumns = () => {
    const toast = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationKey: MUTATION_KEY.CREATE_COLUMN,
        mutationFn: async ({ boardId, names, boardCreated }: CreateColumnsVariables) => {
            // comment-length-exempt: records the measured backend refusal this gate exists for and why it sits here rather than around the whole mutation, neither recoverable from the two-line body
            /*
             * The gate, sited inside `mutationFn` so `onMutate`'s staging stays instant and only the
             * DISPATCH waits: the URL now moves before the board is created, so this runs 300-1400ms
             * ahead of it, and the backend answers `404 ENTITY_NOT_FOUND` for a column on a board id
             * it has never seen (measured 2026-09-08 against the nonprod backend). A board that never
             * landed throws instead, so `onError` retires the placeholders it staged.
             */
            if (!isNil(boardCreated) && !(await boardCreated)) {
                throw new ActionRefusedError(RESULT_STATUS.ERROR);
            }

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

            // comment-length-exempt: records why this write retires before it inserts, which reads as redundant beside an entry that is usually empty
            /*
             * Retires every OWNED id before re-inserting it, exactly as `onSuccess` below does, so
             * this write is idempotent: `useCreateBoard` has already staged these same placeholders
             * before the URL moved, and a plain append would show each typed column twice. The
             * colours come from the same claim, so both writes name the same hexes.
             *
             * `version: 0` is inert placeholder filler — the server owns it, and success replaces it.
             */
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
                              clientIds.reduce(
                                  (columns, columnId) => withColumnRemove({ columns, columnId }),
                                  current.columns,
                              ),
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
        colors = [],
        boardCreated,
    }: {
        boardId: string;
        names: string[];
        ownedClientIds?: string[];
        /* The caller's, never re-picked here: `useCreateBoard` staged these same placeholders already. */
        colors?: string[];
        boardCreated?: Promise<boolean>;
    }): Promise<CreateColumnsOutcome> => {
        const result = await mutation
            .mutateAsync({ boardId, names, clientIds: ownedClientIds, colors, boardCreated })
            .catch(() => ({ status: RESULT_STATUS.ERROR, failedNames: names, created: [] }) as const);

        /* Settled by now, and only a caller that passed one can reach this arm — a retry passes none. */
        if (!isNil(boardCreated) && !(await boardCreated)) {
            return { boardLanded: false };
        }

        // A wholesale failure leaves the set unchanged rather than reporting fewer failures than there are.
        return {
            boardLanded: true,
            failedNames: result.status !== RESULT_STATUS.SUCCESS ? names : result.failedNames,
        };
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
        const outcome = await createColumns({ boardId, names });

        /* Unreachable for a retry, which passes no `boardCreated` — a narrowing, not a branch. */
        if (!outcome.boardLanded) {
            return;
        }

        const stillFailingNames = outcome.failedNames;

        if (stillFailingNames.length === 0) {
            toast.close(buildColumnFailureToastId(boardId));
            return;
        }

        raiseColumnFailureToast({ boardId, failedNames: stillFailingNames });
    };

    return { createColumns, retryColumns, raiseColumnFailureToast };
};
