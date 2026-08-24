import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AddBoardModal } from "./add-board-modal";

/*
 * Visual-only CSF3 (D-25) — every state below is staged through props, never a play function.
 * `appDirectory` mounts a working App Router context, matching `sign-up-form.stories.tsx`.
 */
const meta: Meta<typeof AddBoardModal> = {
    component: AddBoardModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        isOpen: true,
        isPending: false,
        onOpenChange: () => undefined,
        onSubmit: () => undefined,
    },
};

export default meta;

type Story = StoryObj<typeof AddBoardModal>;

export const Default: Story = {};

export const Filled: Story = { args: { defaultValues: { name: "Platform Launch" } } };

export const Submitting: Story = { args: { defaultValues: { name: "Platform Launch" }, isPending: true } };

export const NameError: Story = { args: { forceNameError: "Can't be empty" } };

export const CreateFailed: Story = {
    args: { defaultValues: { name: "Platform Launch" }, errorMessage: "Couldn't create board. Try again." },
};

/** D-01: the form's own default — three empty rows, no staging needed beyond naming the state. */
export const ThreeEmptyRows: Story = {};

export const ManyColumns: Story = {
    args: {
        defaultValues: { name: "Platform Launch" },
        defaultColumns: ["Todo", "Doing", "In Review", "Blocked", "Done"],
    },
};

/** D-02: zero named columns is a valid submission, so zero rows is a real state to render. */
export const NoColumns: Story = { args: { defaultValues: { name: "Platform Launch" }, defaultColumns: [] } };

export const ColumnNameError: Story = {
    args: { defaultColumns: ["To", "", ""], forceColumnError: "Column name must be between 3 and 32 characters." },
};

/*
 * UI-SPEC's long-text row: an overlong board name stays inside the field rather than widening the
 * modal panel — the field's own `truncate` treatment, demonstrated at the real panel width.
 */
export const LongValues: Story = {
    args: { defaultValues: { name: `Board ${"a".repeat(120)}` }, defaultColumns: ["A".repeat(32)] },
};
