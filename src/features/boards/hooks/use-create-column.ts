"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { NO_AUTO_DISMISS, useToast } from "@/components/ui/toast/use-toast";
import { createColumnAction } from "@/features/boards/actions/create-column-action";
import { pickNextColumnColor } from "@/features/boards/column-palette";
import {
    shouldNudgeOnColumnCount,
    toInFlightColumns,
    withColumnInsert,
    withColumnRemove,
    withColumnReplace,
} from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (03-UI-SPEC Copywriting Contract, T-03-03).
 */
const GENERIC_CREATE_FAILURE_MESSAGE = "Couldn't create column. Try again.";

/*
 * Only the branches with something distinct to tell the user, mirroring `use-create-board.ts`'s
 * own table. `DUPLICATE` is advisory here: 03-BACKEND-FACTS R5 observed the backend ACCEPTING a
 * duplicate column name, so nothing upstream selects this entry today (see 03-07-SUMMARY.md).
 */
const CREATE_FAILURE_MESSAGE: Partial<Record<ResultStatus, string>> = {
    [RESULT_STATUS.DUPLICATE]: "A column with that name already exists on this board.",
    [RESULT_STATUS.UNAUTHENTICATED]: "Your session has expired. Sign in again to create a column.",
};

/*
 * D-03/the nudge, authored here beside the failure table. It reports a fact about the board and
 * stops — no scolding, no undo offer, and no suggestion the user did anything wrong, because D-02
 * leaves the column count uncapped.
 */
const COLUMN_COUNT_NUDGE_COPY = {
    title: "That's 9 columns on this board.",
    description: "Columns scroll horizontally from here.",
};

const RETRY_ACTION_LABEL = "Retry";

/**
 * One id per ATTEMPT, so retrying upserts its own toast instead of stacking beside a stale first.
 *
 * BOARD-scoped as well as name-scoped: without the board id, the same column name refused on two
 * boards collides on one toast and the first board's Retry is unreachable.
 */
export const buildCreateFailureToastId = ({ boardId, name }: CreateColumnArgs): string =>
    `column-create-failed:${JSON.stringify([boardId, name])}`;

export type CreateColumnArgs = { boardId: string; name: string };

/**
 * What the create mutation is called with — the placeholder's id rides along so `onSuccess` can
 * find it, and `color` is chosen once in `createColumn` (never here) so `onMutate`'s optimistic
 * insert and `mutationFn`'s upstream call agree on the same pick.
 */
type CreateColumnVariables = CreateColumnArgs & { clientId: string; color?: string };

/**
 * COLUMN-01's optimistic create (docs/adr/tech/0030). The modal closes at submit, so a failure is
 * reported by a toast whose Retry reopens it holding the typed name — the D-05 reversal of
 * 2026-09-03, matching create-task and create-board. The refresh is the action's own.
 */
export const useCreateColumn = ({
    columnCount,
    onRetry,
}: {
    columnCount: number;
    onRetry: (args: CreateColumnArgs) => void;
}) => {
    const toast = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationKey: MUTATION_KEY.CREATE_COLUMN,
        mutationFn: async ({ boardId, name, color }: CreateColumnVariables) => {
            const result = await createColumnAction({ boardId, name, color });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, clientId, name, color }: CreateColumnVariables) => {
            const queryKey = buildBoardQueryKey(boardId);
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            /* `version` is inert placeholder filler — the server owns it, and success replaces it. */
            queryClient.setQueryData<BoardFull>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: withColumnInsert({
                              columns: current.columns,
                              column: {
                                  id: clientId,
                                  name,
                                  version: 0,
                                  position: current.columns.length,
                                  color,
                                  tasks: [],
                              },
                          }),
                      },
            );

            /* Removes THIS column only — see the hook doc for why a snapshot cannot be restored here. */
            return { undo: (current: BoardFull) => withColumnRemove({ columns: current.columns, columnId: clientId }) };
        },

        /* No toast here: `createColumn` below raises it, so a retry can carry the typed name back. */
        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (_error: unknown, { boardId }: CreateColumnVariables, context) => {
            if (context === undefined) {
                return;
            }

            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(boardId), (current) =>
                current === undefined ? current : { ...current, columns: context.undo(current) },
            );
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSuccess positionally (ADR tech/0016 exemption)
        onSuccess: ({ column }, { boardId, clientId }) => {
            /* MERGED, never assigned — `ColumnResponseDTO` carries no `tasks` (docs/adr/tech/0030 rule 2). */
            queryClient.setQueryData<BoardFull>(buildBoardQueryKey(boardId), (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: withColumnReplace({ columns: current.columns, columnId: clientId, column }),
                      },
            );
        },
    });

    /** Reports a column that never landed, offering the reopen that carries the typed name back. */
    const raiseCreateFailureToast = ({ args, status }: { args: CreateColumnArgs; status: ResultStatus }): void => {
        const isSessionExpired = status === RESULT_STATUS.UNAUTHENTICATED;
        const toastId = buildCreateFailureToastId(args);

        toast.add({
            id: toastId,
            type: "danger",
            timeout: NO_AUTO_DISMISS,
            title: CREATE_FAILURE_MESSAGE[status] ?? GENERIC_CREATE_FAILURE_MESSAGE,
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

    const createColumn = async (args: CreateColumnArgs): Promise<void> => {
        const { boardId, name } = args;

        /*
         * Read straight from the entry every sibling column already lives in (ADR tech/0030) — an
         * absent entry means an empty column list, which `pickNextColumnColor` reads as entry 0. A
         * retry re-reads this at call time, so it re-picks against whatever the board looks like then.
         */
        const boardEntry = queryClient.getQueryData<BoardFull>(buildBoardQueryKey(boardId));
        /* Creates already in flight on THIS board, whose picks are not in the entry yet. */
        const inFlight = toInFlightColumns({
            pending: queryClient
                .getMutationCache()
                .findAll({ mutationKey: MUTATION_KEY.CREATE_COLUMN, status: "pending" })
                .map((pending) => pending.state.variables as CreateColumnVariables | undefined),
            boardId,
        });

        const color = pickNextColumnColor({ columns: [...(boardEntry?.columns ?? []), ...inFlight] });

        const outcome = await mutation
            .mutateAsync({ boardId, name, color, clientId: crypto.randomUUID() })
            .then(() => ({ didCreate: true as const }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        if (!outcome.didCreate) {
            raiseCreateFailureToast({ args, status: outcome.status });
            return;
        }

        /*
         * Raised strictly after the success branch is taken, so it can never gate, delay or alter a
         * create — the predicate lives in `model.ts` and tests one exact transition.
         */
        if (shouldNudgeOnColumnCount({ nextCount: columnCount + 1 })) {
            toast.add(COLUMN_COUNT_NUDGE_COPY);
        }
    };

    /*
     * No `isPending`: one hook instance serves every create on the board, so its flag is shared and
     * a second create would read the first one's. Concurrent creates are independent by design.
     */
    return { createColumn };
};
