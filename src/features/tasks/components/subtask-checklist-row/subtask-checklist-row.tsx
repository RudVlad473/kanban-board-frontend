"use client";

import type { Subtask } from "@/lib/core/api-contract/task-schemas";

type Props = {
    subtask: Subtask;
    onToggle: (subtaskId: string) => void;
    isPending: boolean;
};

/** RED phase skeleton — Task 1 implements the row's markup next. */
export const SubtaskChecklistRow = (_props: Props) => {
    return null;
};
