"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { createColumnAction } from "@/features/boards/actions/create-column-action";
import { shouldNudgeOnColumnCount } from "@/features/boards/model";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

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
 * D-03/D-05's nudge, authored here beside the failure table. It reports a fact about the board and
 * stops — no scolding, no undo offer, and no suggestion the user did anything wrong, because D-02
 * leaves the column count uncapped.
 */
const COLUMN_COUNT_NUDGE_COPY = {
    title: "That's 9 columns on this board.",
    description: "Columns scroll horizontally from here.",
};

export type CreateColumnArgs = { boardId: string; name: string };

/**
 * COLUMN-01's create orchestration. A failure is reported inline rather than as a toast: nothing
 * was created, so there is nothing to reconcile and the modal stays open holding the typed name
 * (03-UI-SPEC error/Add-Column-generic). The refresh is the action's own, not this hook's.
 */
export const useCreateColumn = ({ columnCount }: { columnCount: number }) => {
    const toast = useToast();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const mutation = useMutation({ mutationFn: createColumnAction, retry: false });

    const clearError = (): void => {
        setErrorMessage(null);
    };

    const createColumn = async ({ boardId, name }: CreateColumnArgs): Promise<{ didCreate: boolean }> => {
        setErrorMessage(null);

        const result = await mutation
            .mutateAsync({ boardId, name })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            setErrorMessage(CREATE_FAILURE_MESSAGE[result.status] ?? GENERIC_CREATE_FAILURE_MESSAGE);
            return { didCreate: false };
        }

        /*
         * Raised strictly after the success branch is taken, so it can never gate, delay or alter a
         * create — the predicate lives in `model.ts` and tests one exact transition (D-05).
         */
        if (shouldNudgeOnColumnCount({ nextCount: columnCount + 1 })) {
            toast.add(COLUMN_COUNT_NUDGE_COPY);
        }

        return { didCreate: true };
    };

    return { createColumn, isPending: mutation.isPending, errorMessage, clearError };
};
