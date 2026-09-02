import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { createTaskFull } from "@/test-utils/factories/board-full";

import { EditTaskModal } from "./edit-task-modal";

const DEFAULT_TASK = createTaskFull({ title: "Take coffee break", description: "Recharge for fifteen minutes" });
const NO_DESCRIPTION_TASK = createTaskFull({ title: "Take coffee break", description: undefined });

/*
 * Visual-only CSF3 (D-25). `onSubmit` is a `fn()` spy so a test asserts by reading its args, never
 * by spreading props onto a composed story (docs/adr/tech/0025).
 */
const meta: Meta<typeof EditTaskModal> = {
    component: EditTaskModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        task: DEFAULT_TASK,
        isPending: false,
        onClose: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof EditTaskModal>;

/** UI-SPEC populated/edit-task-modal: prefilled title and description, no rows (04-19's own slot). */
export const Default: Story = {};

/* UI-SPEC empty/edit-task-modal: a task with no description still opens with a blank field. */
export const NoDescription: Story = { args: { task: NO_DESCRIPTION_TASK } };

/* UI-SPEC loading/edit-task-modal: Button isLoading, and both dismissal guards held. */
export const Submitting: Story = { args: { isPending: true } };

export const TitleError: Story = { args: { forceTitleError: "Can't be empty" } };
