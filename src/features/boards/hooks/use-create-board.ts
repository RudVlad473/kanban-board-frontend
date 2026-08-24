"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBoardAction } from "@/features/boards/actions/create-board";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach this string (D-05's inline-error treatment, UI-SPEC Copywriting Contract).
 */
const CREATE_FAILURE_MESSAGE = "Couldn't create board. Try again.";

/**
 * Orchestrates BOARD-02's create sequence — the client shape docs/adr/tech/0019 names: a
 * `useMutation` wrapping the Server Action directly with `retry: false`, plus local state for the
 * inline error. Resolves truthy only when the board itself was created (D-05).
 */
export const useCreateBoard = () => {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const createBoardMutation = useMutation({ mutationFn: createBoardAction, retry: false });

    const clearError = (): void => {
        setErrorMessage(null);
    };

    const createBoard = async ({ name }: { name: string }): Promise<boolean> => {
        setErrorMessage(null);

        const result = await createBoardMutation.mutateAsync({ name }).catch(() => ({ status: "error" }) as const);

        /*
         * D-05: nothing was created, so there is nothing to reconcile — report failure and let the
         * modal stay open with the entered values intact.
         */
        if (result.status !== "success") {
            setErrorMessage(CREATE_FAILURE_MESSAGE);
            return false;
        }

        router.push(buildBoardDetailPath(result.board.id));
        return true;
    };

    return { createBoard, isPending: createBoardMutation.isPending, errorMessage, clearError };
};
