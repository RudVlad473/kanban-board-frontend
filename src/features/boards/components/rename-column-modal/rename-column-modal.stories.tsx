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
        onClose: fn(),
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
 * Holds the mounted state the modal itself does not own, so the closes-on-submit path is staged by
 * the stories file rather than by a host component declared in the test (docs/adr/tech/0025). It
 * unmounts rather than toggling a prop, which is how `board-view.tsx` closes it in production.
 */
const SettlingHost = (props: ComponentProps<typeof RenameColumnModal>) => {
    const [isMounted, setIsMounted] = useState(true);

    return !isMounted ? null : (
        <RenameColumnModal
            {...props}
            onClose={() => {
                setIsMounted(false);
            }}
            onSubmit={(values) => {
                props.onSubmit(values);
                setIsMounted(false);
            }}
        />
    );
};

/** U-05: the modal closes on submit rather than holding a spinner — the rename is optimistic. */
export const SubmitSettles: Story = {
    render: (args) => {
        return <SettlingHost {...args} />;
    },
};
