import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { createBoard } from "@/test-utils/factories/board";

import { EditBoardModal } from "./edit-board-modal";

/*
 * Visual-only CSF3 (D-25), mirroring `add-board-modal.stories.tsx`. Both handlers are `fn()` spies
 * so a test asserts by reading these args, never by spreading props onto a composed story.
 */
const meta: Meta<typeof EditBoardModal> = {
    component: EditBoardModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        board: createBoard({ id: "8okxhwo6oq2o", name: "Platform Launch", version: 3 }),
        isOpen: true,
        isPending: false,
        onOpenChange: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof EditBoardModal>;

export const Default: Story = {};

export const Renaming: Story = { args: { isPending: true } };

export const EmptyNameError: Story = { args: { forceNameError: "Can't be empty" } };

/** UI-SPEC's long-text row — an overlong current name stays inside the field. */
export const LongName: Story = {
    args: { board: createBoard({ id: "8okxhwo6oq2o", name: `Platform ${"Launch ".repeat(12)}`, version: 3 }) },
};

/*
 * Holds the open state the modal itself does not own, so the settles-successfully path is staged by
 * the stories file rather than by a host component declared in the test (docs/adr/tech/0025).
 */
const SettlingHost = (props: ComponentProps<typeof EditBoardModal>) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <EditBoardModal
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

/** The rename settles successfully, so the caller closes the modal. */
export const SubmitSettles: Story = { render: (args) => <SettlingHost {...args} /> };
