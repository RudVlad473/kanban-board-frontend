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

/*
 * UI-SPEC's long-text row: an overlong board name stays inside the field rather than widening the
 * modal panel — the field's own `truncate` treatment, demonstrated at the real panel width.
 */
export const LongValues: Story = { args: { defaultValues: { name: `Board ${"a".repeat(120)}` } } };
