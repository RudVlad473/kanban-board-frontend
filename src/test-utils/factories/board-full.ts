import type { BoardFull, ColumnFull } from "@/features/boards/schemas";
import type { Subtask, TaskFull } from "@/lib/core/api-contract/task-schemas";

/**
 * D-11's fixture-entity mechanism for the full-board hierarchy — plain factory functions taking
 * `Partial<T>` overrides, never a class needing `new` (matches `factories/board.ts`).
 */
export const createSubtask = (overrides: Partial<Subtask> = {}): Subtask => ({
    id: "00000000-0000-4000-8000-00000000000a",
    title: "Fixture Subtask",
    isCompleted: false,
    version: 0,
    ...overrides,
});

export const createTaskFull = (overrides: Partial<TaskFull> = {}): TaskFull => ({
    id: "00000000-0000-4000-8000-00000000000b",
    title: "Fixture Task",
    description: "Fixture description",
    version: 0,
    position: 0,
    subtasks: [createSubtask()],
    ...overrides,
});

export const createColumnFull = (overrides: Partial<ColumnFull> = {}): ColumnFull => ({
    id: "00000000-0000-4000-8000-00000000000c",
    name: "Todo",
    version: 0,
    position: 0,
    tasks: [createTaskFull()],
    ...overrides,
});

export const createBoardFull = (overrides: Partial<BoardFull> = {}): BoardFull => ({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Fixture Board",
    version: 0,
    columns: [createColumnFull()],
    ...overrides,
});

/** `count` subtasks, the first `completedCount` of them marked done. */
export const createSubtasks = ({ count, completedCount = 0 }: { count: number; completedCount?: number }): Subtask[] =>
    Array.from({ length: count }, (_, index) =>
        createSubtask({
            id: `00000000-0000-4000-8000-a${String(index + 1).padStart(11, "0")}`,
            title: `Fixture Subtask ${String(index + 1)}`,
            isCompleted: index < completedCount,
        }),
    );

/** `count` tasks, each with a distinct id/title and ascending position, derived from its index. */
export const createTasksFull = (count: number): TaskFull[] =>
    Array.from({ length: count }, (_, index) =>
        createTaskFull({
            id: `00000000-0000-4000-8000-b${String(index + 1).padStart(11, "0")}`,
            title: `Fixture Task ${String(index + 1)}`,
            position: index,
            subtasks: createSubtasks({ count: 3, completedCount: index % 4 }),
        }),
    );

/** `count` columns, each with a distinct id/name, ascending position, and `taskCount` tasks. */
export const createColumnsFull = ({ count, taskCount = 2 }: { count: number; taskCount?: number }): ColumnFull[] =>
    Array.from({ length: count }, (_, index) =>
        createColumnFull({
            id: `00000000-0000-4000-8000-c${String(index + 1).padStart(11, "0")}`,
            name: `Fixture Column ${String(index + 1)}`,
            position: index,
            tasks: createTasksFull(taskCount).map((task, taskIndex) => ({
                ...task,
                id: `00000000-0000-4000-8000-d${String(index + 1)}${String(taskIndex + 1).padStart(10, "0")}`,
            })),
        }),
    );
