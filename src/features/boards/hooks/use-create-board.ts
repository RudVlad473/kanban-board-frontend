"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx` and `src/features/boards/components/boards-empty-state/boards-empty-state.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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

const buildColumnFailureTitle = (failedCount: number): string => `Couldn't create ${String(failedCount)} column(s).`;

/**
 * A stable, board-scoped toast id. Load-bearing, not an incidental argument: Base UI's manager
 * upserts on an existing id, which is what makes a retry narrow one toast instead of stacking a
 * second beside a stale first.
 */
export const buildColumnFailureToastId = (boardId: string): string => `board-columns-failed:${boardId}`;

/**
 * One id per ATTEMPT, not per call — a retry of the same name upserts the one toast instead of
 * stacking a second beside it, while a different attempt gets its own.
 */
export const buildCreateFailureToastId = ({ name }: CreateBoardArgs): string => `board-create-failed:${name}`;

/** What the create mutation is called with — the placeholder's id rides along so `onSuccess` can find it. */
type CreateBoardVariables = { clientId: string; name: string };

/** What a create was attempted with — a failed one is handed back so its Retry can reopen prefilled. */
export type CreateBoardArgs = { name: string; columnRows: string[] };

/**
 * Orchestrates BOARD-02's two-phase create — the board first, then one column per named row, only
 * if the board landed. Neither phase is waited on by the caller (D-05, reversed 2026-09-03): the
 * modal closes on submit, and each phase reports its own failure through its own toast.
 */
export const useCreateBoard = ({ onRetry }: { onRetry: (args: CreateBoardArgs) => void }) => {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();

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

        /* The rollback only; `createBoard` below raises the toast, which needs the refusal's status. */
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

    /** Reports a board that never landed, offering the reopen that carries the typed values back. */
    const raiseCreateFailureToast = ({ args, status }: { args: CreateBoardArgs; status: ResultStatus }): void => {
        const isSessionExpired = status === RESULT_STATUS.UNAUTHENTICATED;
        const toastId = buildCreateFailureToastId(args);

        toast.add({
            id: toastId,
            type: "danger",
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

    const createBoard = async (args: CreateBoardArgs): Promise<void> => {
        const outcome = await createBoardMutation
            .mutateAsync({ clientId: crypto.randomUUID(), name: args.name })
            .then((result) => ({ didCreate: true as const, board: result.board }))
            .catch((error: unknown) => ({
                didCreate: false as const,
                status: error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR,
            }));

        if (!outcome.didCreate) {
            raiseCreateFailureToast({ args, status: outcome.status });
            return;
        }

        /* The SERVER's id, never the placeholder's — a client-generated id in the URL is a 404. */
        const boardId = outcome.board.id;
        router.push(buildBoardDetailPath(boardId));

        /*
         * Fire-and-forget, as the task create's own fan-out is: awaiting it here held the create
         * across TWO round trips, and D-04 keeps whatever landed regardless of who is watching.
         */
        const names = toSubmittedColumnNames(args.columnRows);

        if (names.length > 0) {
            void createColumns({ boardId, names }).then((failedNames) => {
                if (failedNames.length > 0) {
                    raiseColumnFailureToast({ boardId, failedNames });
                }
            });
        }
    };

    return { createBoard, createColumns, retryColumns };
};
