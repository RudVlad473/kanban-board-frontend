import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { createSubtask } from "@/test-utils/factories/board-full";

import { SubtaskChecklistRow } from "./subtask-checklist-row";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (click-to-toggle, colour/decoration, top-alignment) live in subtask-checklist-row.test.tsx.
 */
const meta: Meta<typeof SubtaskChecklistRow> = {
    component: SubtaskChecklistRow,
    parameters: { layout: "padded" },
    args: {
        subtask: createSubtask(),
        onToggle: fn(),
        isPending: false,
    },
    decorators: [
        (Story) => {
            return (
                <div className="w-70">
                    <Story />
                </div>
            );
        },
    ],
};

export default meta;

type Story = StoryObj<typeof SubtaskChecklistRow>;

/** UI-SPEC populated/subtask-checklist-row: an incomplete row at full primary colour. */
export const Default: Story = {};

/* UI-SPEC populated/subtask-checklist-row: the completed treatment, both themes. */
export const Completed: Story = {
    args: { subtask: createSubtask({ isCompleted: true }) },
};

/* UI-SPEC loading/subtask-checklist-row: no spinner — the busy checkbox and grayed-out label. */
export const Pending: Story = {
    args: { isPending: true },
};

/*
 * UI-SPEC long-text/subtask-checklist-row: a two-line title grows the row, and the checkbox stays
 * aligned to the FIRST line rather than centring against the whole block.
 */
export const LongTitle: Story = {
    args: {
        subtask: createSubtask({ title: "A subtask title long enough to wrap onto a second line entirely" }),
    },
};

/*
 * UI-SPEC partial/subtask-checklist-row (backstop): hover is staged via class application on a
 * wrapping decorator, never a real pointer interaction (D-25 keeps stories visual-only).
 */
export const Hover: Story = {
    decorators: [
        (Story) => {
            return (
                <div className="[&>div]:bg-bg-primary/25">
                    <Story />
                </div>
            );
        },
    ],
};

/* The global focus ring, staged on the CHECKBOX itself — never the row. */
export const Focus: Story = {
    decorators: [
        (Story) => {
            return (
                <div className="[&_[role=checkbox]]:ring-2 [&_[role=checkbox]]:ring-ring-focus [&_[role=checkbox]]:ring-offset-2">
                    <Story />
                </div>
            );
        },
    ],
};
