import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SubtaskEditorRow } from "./subtask-editor-row";

/*
 * Visual-only CSF3 — no play function anywhere in this file. Behavioural assertions (commit
 * on blur/Enter, unchanged-blur no-op, empty-value error, busy-disables-remove-only) live in
 * subtask-editor-row.test.tsx.
 */
const meta: Meta<typeof SubtaskEditorRow> = {
    component: SubtaskEditorRow,
    parameters: { layout: "padded" },
    args: {
        title: "Make coffee",
        isDraft: false,
        rowLabel: "Subtask 1",
        isPending: false,
        onCommit: fn(() => Promise.resolve(true)),
        onRemove: fn(),
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

type Story = StoryObj<typeof SubtaskEditorRow>;

/** UI-SPEC populated/edit-task-modal: a LIVE row, already persisted, its title prefilled. */
export const Default: Story = {};

/** A newly-added row stays a DRAFT until its first commit — no title, the seeded placeholder. */
export const Draft: Story = {
    args: { title: "", isDraft: true, rowLabel: "Subtask 2" },
};

/* UI-SPEC loading/subtask-checklist-row: the row's OWN remove control disabled, no spinner elsewhere. */
export const Pending: Story = {
    args: { isPending: true },
};

/* UI-SPEC error/subtask-checklist-row: the required-field message, staged without a real blur. */
export const EmptyError: Story = {
    args: { forceErrorMessage: "Can't be empty" },
};
