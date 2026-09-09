import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { createColumnFull, createTasksFull } from "@/test-utils/factories/board-full";

import { DeleteColumnConfirm } from "./delete-column-confirm";

/*
 * Visual-only CSF3, mirroring `delete-board-confirm.stories.tsx`. Both handlers are `fn()`
 * spies so a test asserts by reading these args, never by spreading props onto a composed story.
 */
const meta: Meta<typeof DeleteColumnConfirm> = {
    component: DeleteColumnConfirm,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        boardId: "00000000-0000-4000-8000-000000000001",
        column: createColumnFull({ name: "Todo", position: 0, version: 3, tasks: createTasksFull(4) }),
        isPending: false,
        onClose: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof DeleteColumnConfirm>;

export const Default: Story = {};

export const Deleting: Story = { args: { isPending: true } };

/*
 * UI-SPEC's long-text row, at the backend's own 32-character ceiling: the body is prose, so the
 * name wraps across lines rather than truncating the sentence that names what is about to go.
 */
export const LongColumnName: Story = {
    args: {
        column: createColumnFull({
            name: "Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm",
            position: 0,
            version: 3,
            tasks: createTasksFull(4),
        }),
    },
};

/*
 * Holds the mounted state the modal itself does not own, so the settles-either-way path is staged
 * by the stories file rather than by a host component declared in the test (docs/adr/tech/0025). It
 * unmounts rather than toggling a prop, which is how `board-view.tsx` closes it in production.
 */
const SettlingHost = (props: ComponentProps<typeof DeleteColumnConfirm>) => {
    const [isMounted, setIsMounted] = useState(true);

    return isMounted ? (
        <DeleteColumnConfirm
            {...props}
            onClose={() => {
                setIsMounted(false);
            }}
            onSubmit={(values) => {
                props.onSubmit(values);
                setIsMounted(false);
            }}
        />
    ) : null;
};

/** The modal closes once the delete settles, whether it succeeded or failed. */
export const SubmitSettles: Story = {
    render: (args) => {
        return <SettlingHost {...args} />;
    },
};
