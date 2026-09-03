"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx` and `src/features/boards/components/boards-empty-state/boards-empty-state.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { createBoardAction } from "@/features/boards/actions/create-board-action";
import { createBoardColumnsAction } from "@/features/boards/actions/create-board-columns-action";
import { toSubmittedColumnNames, withBoardInsert, withBoardReplace } from "@/features/boards/model";
import { BOARDS_QUERY_KEY } from "@/features/boards/queries/boards-query";
import type { Board } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";

/*
 * Authored copy only — the actions return bare discriminants, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract).
 */
const GENERIC_CREATE_FAILURE_MESSAGE = "Couldn't create board. Try again.";

/*
 * Only the branches with something distinct to tell the user, mirroring `use-rename-board.ts`'s
 * own table — collapsed to one sentence each, because this modal renders a single alert paragraph
 * rather than the toast's title/description pair.
 */
const CREATE_FAILURE_MESSAGE: Partial<Record<ResultStatus, string>> = {
    [RESULT_STATUS.DUPLICATE]: "A board with that name already exists. Choose a different name.",
    [RESULT_STATUS.UNAUTHENTICATED]: "Your session has expired. Sign in again to create a board.",
};

const RETRY_ACTION_LABEL = "Retry";

const buildColumnFailureTitle = (failedCount: number): string => `Couldn't create ${String(failedCount)} column(s).`;

/**
 * A stable, board-scoped toast id. Load-bearing, not an incidental argument: Base UI's manager
 * upserts on an existing id, which is what makes a retry narrow one toast instead of stacking a
 * second beside a stale first.
 */
export const buildColumnFailureToastId = (boardId: string): string => `board-columns-failed:${boardId}`;

/** What the create mutation is called with — the placeholder's id rides along so `onSuccess` can find it. */
type CreateBoardVariables = { clientId: string; name: string };

export type CreateBoardOutcome =
    /** The board itself was created; `failedNames` is empty when every column landed too. */
    | { didCreate: true; boardId: string; failedNames: string[] }
    /** Nothing was created, so the modal stays open with the entered values intact. */
    | { didCreate: false };

/**
 * Orchestrates BOARD-02's two-phase create — the board first, then one column per named row, only
 * if the board landed. A column phase that reports failures does NOT block the modal from closing:
 * Whatever succeeded is kept and the failed names are handed back to the caller.
 */
export const useCreateBoard = () => {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    /*
     * The sidebar's row appears on submit, not on settle — the panel reads this cache entry rather
     * than the RSC props, so the action's `refresh()` cannot reach it (docs/adr/tech/0030). The
     * placeholder's `clientId` never leaves the cache; `createBoard` below navigates with the server's.
     */
    const createBoardMutation = useMutation({
        mutationFn: async ({ name }: CreateBoardVariables) => {
            const result = await createBoardAction({ name });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ clientId, name }: CreateBoardVariables) => {
            // Or an in-flight read could land on top of the optimistic list and undo it.
            await queryClient.cancelQueries({ queryKey: BOARDS_QUERY_KEY });
            const previousBoards = queryClient.getQueryData<Board[]>(BOARDS_QUERY_KEY);

            /* `version: 0` is inert placeholder filler — the server owns it, and success replaces it. */
            queryClient.setQueryData<Board[]>(BOARDS_QUERY_KEY, (current) =>
                withBoardInsert({ boards: current ?? [], board: { id: clientId, name, version: 0 } }),
            );

            return { previousBoards };
        },

        /*
         * No toast here, unlike every other rollback in this repo: nothing was created, so D-05 keeps
         * the failure inline in the still-open modal — `createBoard` below sets that copy.
         */
        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (_error: unknown, _variables, context) => {
            if (context?.previousBoards !== undefined) {
                queryClient.setQueryData(BOARDS_QUERY_KEY, context.previousBoards);
            }
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSuccess positionally (ADR tech/0016 exemption)
        onSuccess: ({ board }, { clientId }) => {
            /* The placeholder row is swapped for the server's real id and version — never inserted twice. */
            queryClient.setQueryData<Board[]>(BOARDS_QUERY_KEY, (current) =>
                withBoardReplace({ boards: current ?? [], boardId: clientId, board }),
            );
        },
    });
    const createColumnsMutation = useMutation({ mutationFn: createBoardColumnsAction, retry: false });

    const clearError = (): void => {
        setErrorMessage(null);
    };

    /**
     * Runs the column phase for exactly the names given, returning the ones that still failed.
     * Exported through the hook's return value so a retry can re-run it scoped to that subset.
     */
    const createColumns = async ({ boardId, names }: { boardId: string; names: string[] }): Promise<string[]> => {
        const result = await createColumnsMutation
            .mutateAsync({ boardId, names })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        // A wholesale failure leaves the set unchanged rather than reporting fewer failures than there are.
        return result.status === RESULT_STATUS.SUCCESS ? result.failedNames : names;
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

    const createBoard = async ({
        name,
        columnRows,
    }: {
        name: string;
        columnRows: string[];
    }): Promise<CreateBoardOutcome> => {
        setErrorMessage(null);

        const outcome = await createBoardMutation
            .mutateAsync({ clientId: crypto.randomUUID(), name })
            .then((result) => ({ didCreate: true as const, board: result.board }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        if (!outcome.didCreate) {
            setErrorMessage(CREATE_FAILURE_MESSAGE[outcome.status] ?? GENERIC_CREATE_FAILURE_MESSAGE);
            return { didCreate: false };
        }

        /* The SERVER's id, never the placeholder's — a client-generated id in the URL is a 404. */
        const boardId = outcome.board.id;
        const names = toSubmittedColumnNames(columnRows);
        const failedNames = names.length > 0 ? await createColumns({ boardId, names }) : [];

        /*
         * Navigate before raising the notice, so the toast appears over the board it is talking
         * about rather than over the modal that is closing.
         */
        router.push(buildBoardDetailPath(boardId));

        if (failedNames.length > 0) {
            raiseColumnFailureToast({ boardId, failedNames });
        }

        return { didCreate: true, boardId, failedNames };
    };

    return {
        createBoard,
        createColumns,
        retryColumns,
        isPending: createBoardMutation.isPending || createColumnsMutation.isPending,
        errorMessage,
        clearError,
    };
};
