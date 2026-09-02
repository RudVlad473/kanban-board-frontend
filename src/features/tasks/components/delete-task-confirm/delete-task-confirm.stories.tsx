import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { createTaskFull } from "@/test-utils/factories/board-full";

import { DeleteTaskConfirm } from "./delete-task-confirm";

/*
 * Visual-only CSF3 (D-25), mirroring `delete-column-confirm.stories.tsx`. Both handlers are `fn()`
 * spies so a test asserts by reading these args, never by spreading props onto a composed story.
 */
const meta: Meta<typeof DeleteTaskConfirm> = {
    component: DeleteTaskConfirm,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        boardId: "00000000-0000-4000-8000-000000000001",
        columnId: "00000000-0000-4000-8000-00000000000c",
        task: createTaskFull({ title: "Take coffee break" }),
        isPending: false,
        onClose: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof DeleteTaskConfirm>;

export const Default: Story = {};

export const Deleting: Story = { args: { isPending: true } };

/*
 * UI-SPEC's long-text row, at the backend's own 32-character title ceiling: the body is prose, so
 * the title wraps across lines rather than truncating the sentence that names what is about to go.
 */
export const LongTaskTitle: Story = {
    args: { task: createTaskFull({ title: "Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm" }) },
};

/*
 * Holds the mounted state the modal itself does not own, so the settles-either-way path is staged
 * by the stories file rather than by a host component declared in the test (docs/adr/tech/0025). It
 * unmounts rather than toggling a prop, which is how `board-view.tsx` closes it in production.
 */
const SettlingHost = (props: ComponentProps<typeof DeleteTaskConfirm>) => {
    const [isMounted, setIsMounted] = useState(true);

    return isMounted ? (
        <DeleteTaskConfirm
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

/** The modal closes once the delete settles, whether it succeeded or failed — never optimistic. */
export const SubmitSettles: Story = {
    render: (args) => {
        return <SettlingHost {...args} />;
    },
};
