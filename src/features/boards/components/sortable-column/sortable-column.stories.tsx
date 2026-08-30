import { DndContext } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps, ReactNode } from "react";
import { fn } from "storybook/test";

import { useReorderColumns } from "@/features/boards/hooks/use-reorder-columns";
import type { ColumnFull } from "@/features/boards/schemas";
import { createColumnFull, createColumnsFull, createTasksFull } from "@/test-utils/factories/board-full";

import { SortableColumn } from "./sortable-column";

/** The board id every `createBoardFull()` fixture carries, and so the id a reorder must report. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/*
 * D-18's render-prop bridge, staged with inert rows rather than real `TaskCard`s: this file is in
 * the boards feature, which may not import the tasks feature — which is the property these stories
 * exist to demonstrate. The layout ring's own stories cover the real cards.
 */
const renderStubbedTasks = (column: ColumnFull) => {
    return (): ReactNode => {
        return column.tasks.map((task) => {
            return (
                <li key={task.id} data-testid="stubbed-task" className="rounded-md bg-bg-surface px-4 py-6 shadow-sm">
                    {task.title}
                </li>
            );
        });
    };
};

const FIXTURE_COLUMNS = createColumnsFull({ count: 4 });

/*
 * The context this component cannot render without — `useSortable` reads its index and its
 * neighbours from here, so a story mounting one column bare would assert against a hook that never
 * found its own list. A lone column is the one-entry case, which is what disables its own reorder.
 */
const SortableRow = ({
    column,
    isReorderDisabled,
    isReordering,
    onRename,
    onDelete,
}: ComponentProps<typeof SortableColumn>) => {
    const columns = isReorderDisabled ? [column] : FIXTURE_COLUMNS;

    return (
        <DndContext id="sortable-column-story">
            <SortableContext items={columns.map((each) => each.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex h-100 gap-6 bg-bg-app p-6">
                    {columns.map((each) => {
                        return (
                            <SortableColumn
                                key={each.id}
                                column={each}
                                renderTasks={renderStubbedTasks(each)}
                                isReorderDisabled={columns.length === 1}
                                isReordering={isReordering && each.id === column.id}
                                onRename={onRename}
                                onDelete={onDelete}
                            />
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );
};

/*
 * Owns the hook the way the real board container does, plus one button standing in for a completed
 * move — the keyboard and pointer paths are `src/components/layout/board-view/`'s to prove, so this
 * harness asserts only what the override, the rollback and the in-flight lock do.
 */
const ReorderHost = ({ onRename, onDelete }: ComponentProps<typeof SortableColumn>) => {
    const {
        reorderColumns: requestReorder,
        columns: renderedColumns,
        reorderingColumnId,
    } = useReorderColumns({ columns: FIXTURE_COLUMNS });

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    void requestReorder({ boardId: FIXTURE_BOARD_ID, fromIndex: 0, toIndex: 2 });
                }}
            >
                Move the first column to the third position
            </button>

            <DndContext id="sortable-column-reorder-story">
                <SortableContext
                    items={renderedColumns.map((column) => column.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div className="flex h-100 gap-6 bg-bg-app p-6">
                        {renderedColumns.map((column) => {
                            return (
                                <SortableColumn
                                    key={column.id}
                                    column={column}
                                    renderTasks={renderStubbedTasks(column)}
                                    isReorderDisabled={renderedColumns.length === 1}
                                    isReordering={column.id === reorderingColumnId}
                                    onRename={onRename}
                                    onDelete={onDelete}
                                />
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>
        </>
    );
};

/*
 * Visual-only CSF3 (D-25) — `features/boards/`, so per ADR tech/0011 it gets stories/axe coverage
 * but no visual-spec entry. Every story renders through a host, since this component is meaningless
 * outside a sortable context.
 */
const meta: Meta<typeof SortableColumn> = {
    component: SortableColumn,
    parameters: { layout: "fullscreen" },
    args: {
        column: FIXTURE_COLUMNS[0],
        renderTasks: renderStubbedTasks(FIXTURE_COLUMNS[0]),
        isReorderDisabled: false,
        isReordering: false,
        onRename: fn(),
        onDelete: fn(),
    },
    render: (args) => {
        return <SortableRow {...args} />;
    },
};

export default meta;

type Story = StoryObj<typeof SortableColumn>;

/** Four columns, so every one of them has somewhere to go and carries a real drag handle. */
export const Default: Story = {};

/*
 * UI-SPEC loading/reorder-in-flight, staged as a prop rather than driven: no spinner, the moved
 * column is `aria-busy` and its own two menu entries are disabled until the PATCH settles.
 */
export const Reordering: Story = { args: { isReordering: true } };

/*
 * UI-SPEC zero-one-many/exactly-1-column: no drag, no keyboard lift, and no role description
 * announcing an affordance that cannot do anything. The kebab still offers both entries.
 */
export const LoneColumn: Story = {
    args: {
        isReorderDisabled: true,
        column: createColumnFull({
            id: "00000000-0000-4000-8000-c00000000009",
            name: "Only Column",
            position: 0,
            tasks: createTasksFull(2),
        }),
    },
};

/*
 * The hook's own harness. The stub the test configures decides whether the move succeeds, fails or
 * conflicts — the story stages only the board it acts on.
 */
export const OptimisticReorder: Story = {
    render: (args) => {
        return <ReorderHost {...args} />;
    },
};

/*
 * UI-SPEC partial/column-task-list: a column with zero tasks still gets a real 88px hit area and no
 * copy or control inside it — `isReorderDisabled` renders it alone so `tasks: []` is what the browser
 * measures, not `FIXTURE_COLUMNS`' own two-task shape.
 */
export const EmptyColumn: Story = {
    args: {
        isReorderDisabled: true,
        column: createColumnFull({
            id: "00000000-0000-4000-8000-c00000000010",
            name: "Empty Column",
            position: 0,
            tasks: [],
        }),
    },
};

/*
 * UI-SPEC partial/drag-drop-surface (backstop): S-08's axis-flipped indicator bar, drawn between
 * two stubbed cards — a decorative reproduction, no dnd-kit interaction (ADR tech/0025 bars play
 * functions); `board-view.test.tsx` proves the real mechanism, indices and both input paths.
 */
export const TaskDropIndicator: Story = {
    render: (args) => {
        return (
            <DndContext id="task-drop-indicator-story">
                <SortableContext items={[FIXTURE_COLUMNS[0].id]} strategy={horizontalListSortingStrategy}>
                    <div className="flex h-100 gap-6 bg-bg-app p-6">
                        <SortableColumn
                            {...args}
                            isReorderDisabled
                            column={FIXTURE_COLUMNS[0]}
                            renderTasks={() => {
                                const [first, second] = FIXTURE_COLUMNS[0].tasks;

                                return (
                                    <>
                                        <li
                                            data-testid="stubbed-task"
                                            className="rounded-md bg-bg-surface px-4 py-6 shadow-sm"
                                        >
                                            {first.title}
                                        </li>

                                        <span aria-hidden="true" className="-mt-2.5 h-1 rounded-full bg-bg-primary" />

                                        <li
                                            data-testid="stubbed-task"
                                            className="rounded-md bg-bg-surface px-4 py-6 shadow-sm"
                                        >
                                            {second.title}
                                        </li>
                                    </>
                                );
                            }}
                        />
                    </div>
                </SortableContext>
            </DndContext>
        );
    },
};

/*
 * UI-SPEC partial/column-task-list and empty/drag-drop-surface (backstop): the same bar, drawn
 * inside an empty column's own 88px body rather than a card's gap — Pitfall 9's own visual half.
 */
export const EmptyColumnDropIndicator: Story = {
    args: {
        isReorderDisabled: true,
        column: createColumnFull({
            id: "00000000-0000-4000-8000-c00000000011",
            name: "Empty Column",
            position: 0,
            tasks: [],
        }),
    },
    render: (args) => {
        return (
            <DndContext id="empty-column-drop-indicator-story">
                <SortableContext items={[args.column.id]} strategy={horizontalListSortingStrategy}>
                    <div className="flex h-100 gap-6 bg-bg-app p-6">
                        <SortableColumn
                            {...args}
                            renderTasks={() => {
                                return (
                                    <span
                                        aria-hidden="true"
                                        className="absolute inset-x-0 top-0 h-1 rounded-full bg-bg-primary"
                                    />
                                );
                            }}
                        />
                    </div>
                </SortableContext>
            </DndContext>
        );
    },
};
