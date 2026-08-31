"use client";

// Covered by: `src/features/tasks/components/add-task-provider/add-task-provider.test.tsx`

import { createContext, useContext } from "react";

/** The Status control's own option shape — nothing the header needs beyond an id and a label. */
export type AddTaskColumnOption = { id: string; name: string };

/** Where a new task would go: the open board and the columns it may be added to, or none open. */
export type AddTaskTarget = { boardId: string; columns: AddTaskColumnOption[] } | null;

export type AddTaskTargetStore = {
    target: AddTaskTarget;
    openModal: () => void;
    reportTarget: (next: AddTaskTarget) => void;
};

/*
 * S-06: the header sits in the dashboard layout, above `[boardId]`, so no server component
 * rendering it can receive that param — and the columns it needs carry `board-view.tsx`'s
 * optimistic rename, which a server read would not have (see 04-15's review).
 */
export const AddTaskTargetContext = createContext<AddTaskTargetStore | null>(null);

/*
 * One shared identity, so a consumer rendered outside the provider can still list this hook's
 * result in an effect's deps without re-firing it on every render.
 */
const NO_OP = (): undefined => undefined;

/** The header's own read: the open board's columns (empty with none open) and how to open the modal. */
export const useAddTaskTarget = (): { columns: AddTaskColumnOption[]; openModal: () => void } => {
    const store = useContext(AddTaskTargetContext);

    return {
        columns: store?.target?.columns ?? [],
        openModal: store?.openModal ?? NO_OP,
    };
};

/** The board view's own write: reports the open board and its columns upward, or clears both. */
export const useReportAddTaskTarget = (): ((next: AddTaskTarget) => void) => {
    const store = useContext(AddTaskTargetContext);

    return store?.reportTarget ?? NO_OP;
};
