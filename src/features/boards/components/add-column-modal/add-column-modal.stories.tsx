import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { AddColumnModal } from "./add-column-modal";

/*
 * Visual-only CSF3, `appDirectory` matching `add-board-modal.stories.tsx`. Both handlers are
 * `fn()` spies so a test asserts by reading these args, never by spreading props onto a composed
 * story (docs/adr/tech/0025).
 */
const meta: Meta<typeof AddColumnModal> = {
    component: AddColumnModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        isOpen: true,
        isPending: false,
        onOpenChange: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof AddColumnModal>;

export const Default: Story = {};

export const Submitting: Story = { args: { defaultValues: { name: "Backlog" }, isPending: true } };

export const NameError: Story = { args: { forceNameError: "Can't be empty" } };

export const CreateFailed: Story = {
    args: { defaultValues: { name: "Backlog" }, errorMessage: "Couldn't create column. Try again." },
};

/*
 * The under-length name as a user would actually produce it — no force prop, so the message comes
 * from real validation rather than from staging (distinct from `NameError`, which stages it).
 */
export const ShortColumnName: Story = { args: { defaultValues: { name: "To" } } };

/** The backend's own 32-character ceiling — the longest name this field may legitimately submit. */
export const LongColumnName: Story = { args: { defaultValues: { name: "A".repeat(32) } } };
