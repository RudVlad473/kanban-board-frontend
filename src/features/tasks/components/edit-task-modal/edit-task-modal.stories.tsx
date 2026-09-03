import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { createColumnFull, createSubtasks, createTaskFull } from "@/test-utils/factories/board-full";

import { EditTaskModal } from "./edit-task-modal";

/** The board id every fixture below declares itself to belong to. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/*
 * `useCreateSubtask` seeds ITS OWN cache read from this `columns` prop (docs/adr/tech/0030), so the
 * "Todo" entry must carry the SAME task object every story renders — never a separately-constructed
 * stand-in — mirroring `task-detail-modal.stories.tsx`'s identical fixture rule.
 */
const createFixtureColumns = (task: TaskFull) => [
    createColumnFull({ id: "00000000-0000-4000-8000-c00000000001", name: "Todo", tasks: [task] }),
];

/* UI-SPEC empty/edit-task-modal: the label, the hint and the add-a-row button — no rows. */
const DEFAULT_TASK = createTaskFull({
    title: "Take coffee break",
    description: "Recharge for fifteen minutes",
    subtasks: [],
});
const NO_DESCRIPTION_TASK = createTaskFull({ title: "Take coffee break", description: undefined, subtasks: [] });
/* UI-SPEC populated/edit-task-modal: existing LIVE rows, one already completed. */
const POPULATED_TASK = createTaskFull({
    title: "Take coffee break",
    description: "Recharge for fifteen minutes",
    subtasks: createSubtasks({ count: 2, completedCount: 1 }),
});
/* UI-SPEC zero-one-many/edit-task-modal: exactly one row, for the "removing the last row" case. */
const SINGLE_SUBTASK_TASK = createTaskFull({ subtasks: createSubtasks({ count: 1 }) });

/*
 * Visual-only CSF3. `onSubmit` is a `fn()` spy so a test asserts by reading its args, never
 * by spreading props onto a composed story (docs/adr/tech/0025).
 */
const meta: Meta<typeof EditTaskModal> = {
    component: EditTaskModal,
    parameters: { nextjs: { appDirectory: true } },
    args: {
        task: DEFAULT_TASK,
        boardId: FIXTURE_BOARD_ID,
        columns: createFixtureColumns(DEFAULT_TASK),
        isPending: false,
        onClose: fn(),
        onSubmit: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof EditTaskModal>;

/** UI-SPEC empty/edit-task-modal: prefilled title and description, no subtask rows. */
export const Default: Story = {};

/* UI-SPEC empty/edit-task-modal: a task with no description still opens with a blank field. */
export const NoDescription: Story = {
    args: { task: NO_DESCRIPTION_TASK, columns: createFixtureColumns(NO_DESCRIPTION_TASK) },
};

/* UI-SPEC populated/edit-task-modal: two live rows, driven by the real subtask hooks. */
export const Populated: Story = {
    args: { task: POPULATED_TASK, columns: createFixtureColumns(POPULATED_TASK) },
};

export const SingleSubtask: Story = {
    args: { task: SINGLE_SUBTASK_TASK, columns: createFixtureColumns(SINGLE_SUBTASK_TASK) },
};

/* UI-SPEC loading/edit-task-modal: Button isLoading, and both dismissal guards held. */
export const Submitting: Story = { args: { isPending: true } };

export const TitleError: Story = { args: { forceTitleError: "Can't be empty" } };
