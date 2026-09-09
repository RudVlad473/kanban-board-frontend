"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx` and `src/features/boards/components/board-list/board-list.test.tsx`

import { useToast } from "@/components/ui/toast/use-toast";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

export type FailureToastCopy = { title: string; description: string };

/**
 * Return a raiser that turns a rejected mutation into one danger toast.
 *
 * It picks the caller's own entry for the refusal status the action reported, falling back to
 * `fallback` for an unlisted status and for a rejection that carries no status at all.
 */
export const useFailureToast = ({
    copy = {},
    fallback,
}: {
    copy?: Partial<Record<ResultStatus, FailureToastCopy>>;
    fallback: FailureToastCopy;
}): ((error: unknown) => void) => {
    const toast = useToast();

    return (error: unknown): void => {
        const status = error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR;

        toast.add({ type: "danger", ...(copy[status] ?? fallback) });
    };
};
