"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx`

import { useMutationState } from "@tanstack/react-query";

import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/** Every optimistic write submits the version it read, which is what retires it (tech/0029). */
export type VersionedVariables = { version: number };
/*
 * These actions RETURN a refusal rather than throwing, so TanStack records one as a settled
 * success and `mutation.state.status` alone never sees it (docs/adr/tech/0029).
 */
const isRefused = (data: unknown): boolean =>
    typeof data === "object" && data !== null && "status" in data && data.status !== RESULT_STATUS.SUCCESS;

/**
 * Return the variables of every write under `mutationKey` that has not failed, oldest first — a
 * succeeded one stays until the caller's version guard retires it (docs/adr/tech/0029).
 */
export const useOptimisticVariables = <V extends VersionedVariables>(mutationKey: readonly unknown[]): V[] =>
    useMutationState({
        filters: { mutationKey },
        select: (mutation) => ({
            threw: mutation.state.status === "error",
            refused: isRefused(mutation.state.data),
            variables: mutation.state.variables as V,
        }),
    })
        .filter((entry) => !entry.threw && !entry.refused)
        .map((entry) => entry.variables);
