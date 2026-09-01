"use client";

import type { TaskFull } from "@/lib/core/api-contract/task-schemas";

type Props = {
    task: TaskFull;
    onClose: () => void;
    onToggleSubtask: (subtaskId: string) => void;
    pendingSubtaskId?: string | null;
    onEditTask: (task: TaskFull) => void;
    onDeleteTask: (task: TaskFull) => void;
};

/** RED phase skeleton — Task 2 implements the detail view's markup next. */
export const TaskDetailModal = (_props: Props) => {
    return null;
};
