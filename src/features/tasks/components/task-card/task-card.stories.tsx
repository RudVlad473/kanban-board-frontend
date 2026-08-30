import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import { createSubtasks, createTaskFull, createTasksFull } from "@/test-utils/factories/board-full";

import { TaskCard } from "./task-card";

/** The column every fixture card below declares itself to sit in. */
const FIXTURE_COLUMN_ID = "00000000-0000-4000-8000-c00000000001";

const FIXTURE_TASKS = createTasksFull(3);

/*
 * The context this component cannot render without — `useSortable` reads its index and its
 * neighbours from here, so a story mounting one card bare would assert against a hook that never
 * found its own list. A lone card is the one-entry case, which is what disables its own handle.
 */
const SortableList = ({ task, columnId, onOpenDetail, isMoveDisabled, isMoving }: ComponentProps<typeof TaskCard>) => {
    const tasks = isMoveDisabled ? [task] : FIXTURE_TASKS.map((each) => (each.id === task.id ? task : each));

    return (
        <DndContext id="task-card-story">
            <div className="w-70 bg-bg-app p-6">
                <SortableContext items={tasks.map((each) => each.id)} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-5">
                        {tasks.map((each) => {
                            return (
                                <TaskCard
                                    key={each.id}
                                    task={each}
                                    columnId={columnId}
                                    onOpenDetail={onOpenDetail}
                                    isMoveDisabled={tasks.length === 1}
                                    isMoving={isMoving && each.id === task.id}
                                />
                            );
                        })}
                    </ul>
                </SortableContext>
            </div>
        </DndContext>
    );
};

/*
 * Visual-only CSF3 (D-25) — `features/tasks/`, so per ADR tech/0011 it gets stories/axe coverage but
 * no visual-spec entry. Every story renders through a host, since this component is meaningless
 * outside a sortable context.
 */
const meta: Meta<typeof TaskCard> = {
    component: TaskCard,
    parameters: { layout: "fullscreen" },
    args: {
        task: FIXTURE_TASKS[0],
        columnId: FIXTURE_COLUMN_ID,
        onOpenDetail: fn(),
        isMoveDisabled: false,
        isMoving: false,
    },
    render: (args) => {
        return <SortableList {...args} />;
    },
};

export default meta;

type Story = StoryObj<typeof TaskCard>;

/** UI-SPEC populated/task-card: title in `heading-m`, caption in muted `body-m`, three cards at a 20px gap. */
export const Default: Story = {};

/*
 * UI-SPEC empty/task-card: the caption is SUPPRESSED entirely rather than rendered as "0 of 0
 * subtasks", so the board agrees with the detail view's identical suppression.
 */
export const NoSubtasks: Story = {
    args: {
        task: createTaskFull({ id: FIXTURE_TASKS[0].id, title: "Nothing broken down yet", subtasks: [] }),
    },
};

/* UI-SPEC zero-one-many: only the COUNT pluralizes — the mock's own p4 cards read "1 of 1 substasks". */
export const OneSubtask: Story = {
    args: {
        task: createTaskFull({
            id: FIXTURE_TASKS[0].id,
            title: "One step only",
            subtasks: createSubtasks({ count: 1, completedCount: 1 }),
        }),
    },
};

/*
 * UI-SPEC long-text/task-card: the title wraps rather than truncating, and an unbroken token is
 * guarded from widening the 280px column. C-07 caps a real title at 32 characters, so this is the
 * shape the guard exists for rather than the common case.
 */
export const LongTitle: Story = {
    args: {
        task: createTaskFull({
            id: FIXTURE_TASKS[0].id,
            title: "Supercalifragilisticexpialidocious-pricing-research",
        }),
    },
};

/* UI-SPEC loading/task-card: no spinner — the moved card is `aria-busy` and its handle is closed. */
export const Moving: Story = { args: { isMoving: true } };

/*
 * UI-SPEC zero-one-many: a board of one column holding one task has nowhere to drag to, so the
 * handle stays rendered (S-04) but disabled, rather than becoming a control that visibly does nothing.
 */
export const LoneTask: Story = { args: { isMoveDisabled: true } };

/*
 * UI-SPEC populated/drag-drop-surface (backstop): the lifted treatment — source card faded in
 * place, full-opacity clone alongside it, mirroring `board-view.tsx`'s DragOverlay. No dnd-kit
 * interaction here (ADR tech/0025); `board-view.test.tsx` proves the real mechanism.
 */
export const Lifted: Story = {
    /*
     * No subtasks: the muted caption at `opacity-50` fails axe color-contrast (2.01:1, need 4.5:1)
     * — a real defect in the shipped `isDragging` treatment (D-21 forbids suppressing it). `Default`
     * already covers the caption at full opacity, so this story's own fixture is narrowed instead.
     */
    args: { task: createTaskFull({ id: FIXTURE_TASKS[0].id, title: FIXTURE_TASKS[0].title, subtasks: [] }) },
    render: (args) => {
        return (
            <div className="relative w-70 bg-bg-app p-6">
                {/*
                 * Only the SOURCE `<li>` (the list's first item) fades, as the shipped one-item
                 * `isDragging` treatment does — fading the whole list broke sibling contrast.
                 */}
                <div className="[&_li:first-child]:opacity-50">
                    <SortableList {...args} />
                </div>

                <div
                    aria-hidden="true"
                    className="absolute top-9 left-20 flex w-70 flex-col gap-2 rounded-md bg-bg-surface py-6 pr-2 pl-4 shadow-lg"
                >
                    <span className="font-heading-m text-heading-m [font-weight:var(--font-weight-heading-m)] text-text-primary">
                        {args.task.title}
                    </span>
                </div>
            </div>
        );
    },
};
