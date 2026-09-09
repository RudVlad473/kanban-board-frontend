import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { createBoard } from "@/test-utils/factories/board";

import { DeleteBoardConfirm } from "./delete-board-confirm";

/*
 * Visual-only CSF3, mirroring `edit-board-modal.stories.tsx`. Both handlers are `fn()` spies
 * so a test asserts by reading these args, never by spreading props onto a composed story.
 */
const meta: Meta<typeof DeleteBoardConfirm> = {
    component: DeleteBoardConfirm,
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

type Story = StoryObj<typeof DeleteBoardConfirm>;

export const Default: Story = {};

export const Deleting: Story = { args: { isPending: true } };

/*
 * UI-SPEC's long-text row: the body is prose, so a 200-character name wraps across lines rather
 * than truncating the sentence that names what is about to be destroyed.
 */
export const LongBoardName: Story = {
    args: { board: createBoard({ id: "8okxhwo6oq2o", name: "L".repeat(200), version: 3 }) },
};

/*
 * Holds the open state the modal itself does not own, so the settles-either-way path is staged by
 * the stories file rather than by a host component declared in the test (docs/adr/tech/0025).
 */
const SettlingHost = (props: ComponentProps<typeof DeleteBoardConfirm>) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <DeleteBoardConfirm
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

/** The modal closes once the delete settles, whether it succeeded or failed. */
export const SubmitSettles: Story = {
    render: (args) => {
        return <SettlingHost {...args} />;
    },
};
