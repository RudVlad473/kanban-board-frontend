import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { createSubtasks, createTaskFull } from "@/test-utils/factories/board-full";

import { TaskDetailModal } from "./task-detail-modal";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (empty states, kebab wiring, close guards) live in task-detail-modal.test.tsx.
 */
const meta: Meta<typeof TaskDetailModal> = {
    component: TaskDetailModal,
    args: {
        task: createTaskFull({ subtasks: createSubtasks({ count: 3, completedCount: 1 }) }),
        onClose: fn(),
        onToggleSubtask: fn(),
        pendingSubtaskId: null,
        onEditTask: fn(),
        onDeleteTask: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof TaskDetailModal>;

/** UI-SPEC populated/detail-view: title, description, a mixed complete/incomplete checklist. */
export const Default: Story = {};

/* UI-SPEC empty/detail-view: the description block is omitted entirely — no placeholder prose. */
export const NoDescription: Story = {
    args: { task: createTaskFull({ description: undefined, subtasks: createSubtasks({ count: 2 }) }) },
};

/* UI-SPEC empty/detail-view: the two authored lines, and the caption is suppressed. */
export const NoSubtasks: Story = {
    args: { task: createTaskFull({ subtasks: [] }) },
};

/* UI-SPEC long-text/detail-view: the title wraps and the kebab's name carries the full title. */
export const LongTitle: Story = {
    args: {
        task: createTaskFull({
            title: "A task title long enough to wrap across several lines inside the detail view's panel",
        }),
    },
};

/* SUBTASK-02's in-flight lock (D-08), staged without a real mutation. */
export const SubtaskPending: Story = {
    args: {
        task: createTaskFull({ subtasks: createSubtasks({ count: 3, completedCount: 1 }) }),
        pendingSubtaskId: "00000000-0000-4000-8000-a00000000001",
    },
};
