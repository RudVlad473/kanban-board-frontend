"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { createBoardAction } from "@/features/boards/actions/create-board";
import { createBoardColumnsAction } from "@/features/boards/actions/create-board-columns";
import { toSubmittedColumnNames } from "@/features/boards/model";
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

export type CreateBoardOutcome =
    /** The board itself was created; `failedNames` is empty when every column landed too. */
    | { didCreate: true; boardId: string; failedNames: string[] }
    /** D-05: nothing was created, so the modal stays open with the entered values intact. */
    | { didCreate: false };

/**
 * Orchestrates BOARD-02's two-phase create — the board first, then one column per named row, only
 * if the board landed. A column phase that reports failures does NOT block the modal from closing:
 * whatever succeeded is kept and the failed names are handed back to the caller (D-03/D-04).
 */
export const useCreateBoard = () => {
    const router = useRouter();
    const toast = useToast();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const createBoardMutation = useMutation({ mutationFn: createBoardAction, retry: false });
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
     * because a toast still naming created columns would misreport what persisted (D-04).
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
            // No auto-dismiss: a kept-but-incomplete create must stay visible until acted on.
            timeout: 0,
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

        const result = await createBoardMutation
            .mutateAsync({ name })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            setErrorMessage(CREATE_FAILURE_MESSAGE[result.status] ?? GENERIC_CREATE_FAILURE_MESSAGE);
            return { didCreate: false };
        }

        const boardId = result.board.id;
        const names = toSubmittedColumnNames(columnRows);
        const failedNames = names.length > 0 ? await createColumns({ boardId, names }) : [];

        /*
         * Navigate before raising the notice, so the toast appears over the board it is talking
         * about rather than over the modal that is closing (D-04).
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
