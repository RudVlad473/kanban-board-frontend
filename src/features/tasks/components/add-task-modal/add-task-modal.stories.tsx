import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { fn } from "storybook/test";

import { AddTaskModal } from "./add-task-modal";

const FIXTURE_COLUMNS = [
    { id: "todo", name: "Todo" },
    { id: "doing", name: "Doing" },
    { id: "done", name: "Done" },
];

/*
 * Visual-only CSF3. Both handlers are `fn()` spies so a test asserts by reading these args,
 * never by spreading props onto a composed story (docs/adr/tech/0025).
 */
const meta: Meta<typeof AddTaskModal> = {
    component: AddTaskModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        isPending: false,
        columns: FIXTURE_COLUMNS,
        onClose: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof AddTaskModal>;

/** UI-SPEC empty/add-task-modal: the modal opens with two blank subtask rows. */
export const Default: Story = {};

export const Filled: Story = {
    args: {
        defaultValues: { title: "Take coffee break", description: "Recharge for fifteen minutes", columnId: "doing" },
        defaultSubtasks: ["Make coffee", "Drink coffee & smile"],
    },
};

export const Submitting: Story = {
    args: { defaultValues: { title: "Take coffee break" }, isPending: true },
};

export const TitleError: Story = { args: { forceTitleError: "Can't be empty" } };

export const CreateFailed: Story = {
    args: {
        defaultValues: { title: "Take coffee break" },
        errorMessage: "Couldn't create task. Try again.",
    },
};

export const ManySubtasks: Story = {
    args: { defaultSubtasks: ["Make coffee", "Drink coffee & smile", "Wash the mug", "Return to desk"] },
};

/** UI-SPEC empty/add-task-modal: removing both seeded rows is legal — a task with no subtasks is valid. */
export const NoSubtasks: Story = { args: { defaultSubtasks: [] } };

/** A single column board — the Status control renders its one option, matching zero-one-many. */
export const SingleColumn: Story = { args: { columns: [FIXTURE_COLUMNS[0]] } };

/*
 * UI-SPEC long-text: the title stays inside the field's own bound, the description scrolls inside
 * its fixed-height box, and a long subtask title stays inside its own row.
 */
export const LongValues: Story = {
    args: {
        defaultValues: { title: "A".repeat(32), description: "a".repeat(400) },
        defaultSubtasks: ["b".repeat(120)],
    },
};

/*
 * Holds the open/error state the modal itself does not own, so the failed-submit path is staged by
 * the story file rather than by a host component declared in the test (docs/adr/tech/0025).
 */
const FailingSubmitHost = (props: ComponentProps<typeof AddTaskModal>) => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) {
        return null;
    }

    return (
        <AddTaskModal
            {...props}
            onClose={() => {
                setIsOpen(false);
            }}
            errorMessage={errorMessage}
            onSubmit={(values) => {
                props.onSubmit(values);
                setErrorMessage("Couldn't create task. Try again.");
            }}
        />
    );
};

/** The submit handler reports failure, so the modal stays open with everything typed intact. */
export const SubmitFails: Story = {
    args: { defaultValues: { title: "Take coffee break" } },
    render: (args) => {
        return <FailingSubmitHost {...args} />;
    },
};
