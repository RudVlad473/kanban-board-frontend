"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { createColumnAction } from "@/features/boards/actions/create-column-action";
import { shouldNudgeOnColumnCount, withColumnInsert, withColumnReplace } from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

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

export type CreateColumnArgs = { boardId: string; name: string };

/** What the create mutation is called with — the placeholder's id rides along so `onSuccess` can find it. */
type CreateColumnVariables = CreateColumnArgs & { clientId: string };

/**
 * COLUMN-01's optimistic create (docs/adr/tech/0030). A failure is reported inline rather than as a
 * toast: the rollback puts the board back as it was, so there is nothing left to reconcile and the
 * modal stays open holding the typed name. The refresh is the action's own, not this hook's.
 */
export const useCreateColumn = ({ columnCount }: { columnCount: number }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async ({ boardId, name }: CreateColumnVariables) => {
            const result = await createColumnAction({ boardId, name });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, clientId, name }: CreateColumnVariables) => {
            const queryKey = buildBoardQueryKey(boardId);
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });
            const previousBoard = queryClient.getQueryData<BoardFull>(queryKey);

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
                                  tasks: [],
                              },
                          }),
                      },
            );

            return { previousBoard };
        },

        /*
         * No toast here, unlike every other rollback in this repo: nothing was created, so the
         * failure stays inline in the still-open modal (03-UI-SPEC error/Add-Column-generic).
         */
        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (_error: unknown, { boardId }: CreateColumnVariables, context) => {
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(buildBoardQueryKey(boardId), context.previousBoard);
            }
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

    const clearError = (): void => {
        setErrorMessage(null);
    };

    const createColumn = async ({ boardId, name }: CreateColumnArgs): Promise<{ didCreate: boolean }> => {
        setErrorMessage(null);

        const outcome = await mutation
            .mutateAsync({ boardId, name, clientId: crypto.randomUUID() })
            .then(() => ({ didCreate: true as const }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        if (!outcome.didCreate) {
            setErrorMessage(CREATE_FAILURE_MESSAGE[outcome.status] ?? GENERIC_CREATE_FAILURE_MESSAGE);
            return { didCreate: false };
        }

        /*
         * Raised strictly after the success branch is taken, so it can never gate, delay or alter a
         * create — the predicate lives in `model.ts` and tests one exact transition.
         */
        if (shouldNudgeOnColumnCount({ nextCount: columnCount + 1 })) {
            toast.add(COLUMN_COUNT_NUDGE_COPY);
        }

        return { didCreate: true };
    };

    return { createColumn, isPending: mutation.isPending, errorMessage, clearError };
};
