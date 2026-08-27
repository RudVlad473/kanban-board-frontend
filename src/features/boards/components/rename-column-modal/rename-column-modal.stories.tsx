import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { createBoardFull, createColumnFull } from "@/test-utils/factories/board-full";

import { RenameColumnModal } from "./rename-column-modal";

/*
 * Visual-only CSF3 (D-25), mirroring `edit-board-modal.stories.tsx`. Both handlers are `fn()` spies
 * so a test asserts by reading these args, never by spreading props onto a composed story.
 */
const meta: Meta<typeof RenameColumnModal> = {
    component: RenameColumnModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        boardId: createBoardFull().id,
        column: createColumnFull({ name: "Todo", version: 3 }),
        isOpen: true,
        onOpenChange: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof RenameColumnModal>;

export const Default: Story = {};

export const NameError: Story = { args: { forceNameError: "Can't be empty" } };

/** The backend's own 32-character ceiling — the panel must seed it without growing (UI-SPEC long-text). */
export const LongColumnName: Story = {
    args: { column: createColumnFull({ name: "Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm", version: 3 }) },
};

/*
 * Holds the open state the modal itself does not own, so the closes-on-submit path is staged by the
 * stories file rather than by a host component declared in the test (docs/adr/tech/0025).
 */
const SettlingHost = (props: ComponentProps<typeof RenameColumnModal>) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <RenameColumnModal
            {...props}
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onSubmit={(values) => {
                props.onSubmit(values);
                setIsOpen(false);
            }}
        />
    );
};

/** U-05: the modal closes on submit rather than holding a spinner — the rename is optimistic. */
export const SubmitSettles: Story = { render: (args) => <SettlingHost {...args} /> };
