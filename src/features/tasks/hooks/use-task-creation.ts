"use client";

// Covered by: `src/features/tasks/components/task-creation-provider/task-creation-provider.test.tsx`

import { createContext, useContext } from "react";

/** The Status control's own option shape — nothing the header needs beyond an id and a label. */
export type TaskCreationColumn = { id: string; name: string };

export type TaskCreationState = { boardId: string; columns: TaskCreationColumn[] } | null;

export type TaskCreationStore = {
    state: TaskCreationState;
    openModal: () => void;
    publish: (next: TaskCreationState) => void;
};

/**
 * S-06's bridge: shared so the header can read the open board's columns and open state that
 * `TaskCreationProvider` (mounted in the dashboard layout) publishes across two Suspense boundaries.
 */
export const TaskCreationContext = createContext<TaskCreationStore | null>(null);

/** The header's own read: the open board's columns (empty with none open) and how to open the modal. */
export const useTaskCreation = (): { columns: TaskCreationColumn[]; hasOpenBoard: boolean; openModal: () => void } => {
    const store = useContext(TaskCreationContext);

    return {
        columns: store?.state?.columns ?? [],
        hasOpenBoard: store?.state !== null && store?.state !== undefined,
        openModal: store?.openModal ?? (() => undefined),
    };
};

/** The layout-ring board view's own write: publishes the open board's id and columns, or clears both. */
export const usePublishTaskCreationColumns = (): ((next: TaskCreationState) => void) => {
    const store = useContext(TaskCreationContext);

    return store?.publish ?? (() => undefined);
};
