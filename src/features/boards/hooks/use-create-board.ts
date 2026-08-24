"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBoardAction } from "@/features/boards/actions/create-board";
import { createBoardColumnsAction } from "@/features/boards/actions/create-board-columns";
import { toCreatableColumnNames } from "@/features/boards/model";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";

/*
 * Authored copy only — the actions return bare discriminants, so nothing the backend said can
 * reach this string (D-05's inline-error treatment, UI-SPEC Copywriting Contract).
 */
const CREATE_FAILURE_MESSAGE = "Couldn't create board. Try again.";

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
            .catch(() => ({ status: "error" }) as const);

        // A wholesale failure leaves the set unchanged rather than reporting fewer failures than there are.
        return result.status === "success" ? result.failedNames : names;
    };

    const createBoard = async ({
        name,
        columnRows,
    }: {
        name: string;
        columnRows: string[];
    }): Promise<CreateBoardOutcome> => {
        setErrorMessage(null);

        const result = await createBoardMutation.mutateAsync({ name }).catch(() => ({ status: "error" }) as const);

        if (result.status !== "success") {
            setErrorMessage(CREATE_FAILURE_MESSAGE);
            return { didCreate: false };
        }

        const boardId = result.board.id;
        const names = toCreatableColumnNames(columnRows);
        const failedNames = names.length > 0 ? await createColumns({ boardId, names }) : [];

        router.push(buildBoardDetailPath(boardId));

        return { didCreate: true, boardId, failedNames };
    };

    return {
        createBoard,
        createColumns,
        isPending: createBoardMutation.isPending || createColumnsMutation.isPending,
        errorMessage,
        clearError,
    };
};
