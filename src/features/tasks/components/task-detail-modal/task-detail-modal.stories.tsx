import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { createColumnFull, createSubtasks, createTaskFull } from "@/test-utils/factories/board-full";

import { TaskDetailModal } from "./task-detail-modal";

/** The board id every fixture below declares itself to belong to. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/*
 * `useToggleSubtask` seeds ITS OWN cache read from this `columns` prop (docs/adr/tech/0030), so the
 * "Todo" entry must carry the SAME task object every story renders — never a separately-constructed
 * stand-in — or the checklist and this fixture would silently disagree on the subtask list.
 */
const createFixtureColumns = (task: TaskFull) => [
    createColumnFull({ id: "00000000-0000-4000-8000-c00000000001", name: "Todo", tasks: [task] }),
    createColumnFull({ id: "00000000-0000-4000-8000-c00000000002", name: "Doing", tasks: [] }),
    createColumnFull({ id: "00000000-0000-4000-8000-c00000000003", name: "Done", tasks: [] }),
];

const DEFAULT_TASK = createTaskFull({ subtasks: createSubtasks({ count: 3, completedCount: 1 }) });
const NO_DESCRIPTION_TASK = createTaskFull({ description: undefined, subtasks: createSubtasks({ count: 2 }) });
const NO_SUBTASKS_TASK = createTaskFull({ subtasks: [] });
const LONG_TITLE_TASK = createTaskFull({
    title: "A task title long enough to wrap across several lines inside the detail view's panel",
});

/*
 * Visual-only CSF3 — no play function anywhere in this file. Behavioural assertions
 * (empty states, kebab wiring, close guards, the status control, the toggle) live in
 * task-detail-modal.test.tsx.
 */
const meta: Meta<typeof TaskDetailModal> = {
    component: TaskDetailModal,
    args: {
        boardId: FIXTURE_BOARD_ID,
        task: DEFAULT_TASK,
        columns: createFixtureColumns(DEFAULT_TASK),
        onClose: fn(),
        onDeleteTask: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof TaskDetailModal>;

/** UI-SPEC populated/detail-view: title, description, a mixed complete/incomplete checklist. */
export const Default: Story = {};

/* UI-SPEC empty/detail-view: the description block is omitted entirely — no placeholder prose. */
export const NoDescription: Story = {
    args: { task: NO_DESCRIPTION_TASK, columns: createFixtureColumns(NO_DESCRIPTION_TASK) },
};

/* UI-SPEC empty/detail-view: the two authored lines, and the caption is suppressed. */
export const NoSubtasks: Story = {
    args: { task: NO_SUBTASKS_TASK, columns: createFixtureColumns(NO_SUBTASKS_TASK) },
};

/* UI-SPEC long-text/detail-view: the title wraps and the kebab's name carries the full title. */
export const LongTitle: Story = {
    args: { task: LONG_TITLE_TASK, columns: createFixtureColumns(LONG_TITLE_TASK) },
};
