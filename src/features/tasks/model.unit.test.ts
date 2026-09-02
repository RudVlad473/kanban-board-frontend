import type { Announcements } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";

import {
    withSubtaskCompletion,
    withSubtaskInsert,
    withSubtaskRemove,
    withSubtaskRename,
    withTaskInsert,
    withTaskReplace,
    withTaskUpdate,
    moveTaskInColumns,
    buildSubtaskRowPath,
    createEmptySubtaskRows,
    createTaskMoveAnnouncements,
    toSubmittedSubtaskTitles,
    toSubtaskDetailCaption,
    toSubtaskRowPlaceholder,
    toSubtaskSummary,
    toTaskMoveTargetPosition,
    type NamedTaskColumn,
} from "@/features/tasks/model";
import { createSubtask, createSubtasks, createTaskFull } from "@/test-utils/factories/board-full";

describe("toSubtaskSummary", () => {
    it("reports the completed count out of the total", () => {
        // Act
        const summary = toSubtaskSummary(createSubtasks({ count: 3, completedCount: 1 }));

        // Assert
        expect(summary).toBe("1 of 3 subtasks");
    });

    /* UI-SPEC zero-one-many: only the COUNT pluralizes, matching the mock's own "1 of 1 substasks" cards. */
    it("keeps the plural word at exactly one subtask", () => {
        // Act
        const summary = toSubtaskSummary(createSubtasks({ count: 1, completedCount: 1 }));

        // Assert
        expect(summary).toBe("1 of 1 subtasks");
    });

    /*
     * The zero case is still formatted here — suppression is the CARD's call, so this function stays
     * total and the two surfaces cannot disagree about who decides (UI-SPEC "Card caption").
     */
    it("still formats a zero-subtask task, leaving suppression to the call site", () => {
        // Act
        const summary = toSubtaskSummary([]);

        // Assert
        expect(summary).toBe("0 of 0 subtasks");
    });
});

describe("toSubtaskDetailCaption", () => {
    /* Copywriting Contract "Detail view subtasks caption": Subtasks ({N} of {M}), PDF p5 verbatim. */
    it("reports the completed count out of the total in the parenthesised form", () => {
        // Act
        const caption = toSubtaskDetailCaption(createSubtasks({ count: 3, completedCount: 1 }));

        // Assert
        expect(caption).toBe("Subtasks (1 of 3)");
    });

    /* Suppression is the CALL SITE's decision — this stays total, matching `toSubtaskSummary`. */
    it("still formats a zero-subtask task, leaving suppression to the call site", () => {
        // Act
        const caption = toSubtaskDetailCaption([]);

        // Assert
        expect(caption).toBe("Subtasks (0 of 0)");
    });
});

describe("withSubtaskCompletion", () => {
    const createColumnsWithSubtask = () => [
        {
            id: "column-1",
            tasks: [createTaskFull({ id: "task-1", subtasks: [createSubtask({ id: "subtask-1" })] })],
        },
    ];

    it("flips the named subtask's completion, leaving its other fields untouched", () => {
        // Act
        const columns = withSubtaskCompletion({
            columns: createColumnsWithSubtask(),
            taskId: "task-1",
            subtaskId: "subtask-1",
            isCompleted: true,
        });

        // Assert
        expect(columns[0].tasks[0].subtasks[0]).toEqual(
            expect.objectContaining({ id: "subtask-1", isCompleted: true }),
        );
    });

    /* D-08's per-subtask key: a sibling task's own subtask is never touched by another task's toggle. */
    it("leaves a different task's subtasks untouched", () => {
        // Arrange
        const columns = [
            ...createColumnsWithSubtask(),
            {
                id: "column-2",
                tasks: [createTaskFull({ id: "task-2", subtasks: [createSubtask({ id: "subtask-2" })] })],
            },
        ];

        // Act
        const rendered = withSubtaskCompletion({
            columns,
            taskId: "task-1",
            subtaskId: "subtask-1",
            isCompleted: true,
        });

        // Assert
        expect(rendered[1].tasks[0].subtasks[0].isCompleted).toBe(false);
    });

    /* A subtask id the board no longer holds — e.g. a concurrent delete — yields the input untouched. */
    it("hands the columns back untouched when the subtask is no longer on the board", () => {
        // Arrange
        const columns = createColumnsWithSubtask();

        // Act
        const rendered = withSubtaskCompletion({
            columns,
            taskId: "task-1",
            subtaskId: "deleted",
            isCompleted: true,
        });

        // Assert
        expect(rendered).toEqual(columns);
    });
});

describe("withTaskInsert", () => {
    it("appends the task to the named column only", () => {
        // Arrange
        const columns = [
            { id: "column-1", tasks: [createTaskFull({ id: "task-1" })] },
            { id: "column-2", tasks: [] },
        ];
        const task = createTaskFull({ id: "task-2" });

        // Act
        const next = withTaskInsert({ columns, columnId: "column-1", task });

        // Assert
        expect(next[0].tasks.map((entry) => entry.id)).toEqual(["task-1", "task-2"]);
        expect(next[1].tasks).toEqual([]);
    });

    it("returns an equivalent board when the id names no column on it", () => {
        // Arrange
        const columns = [{ id: "column-1", tasks: [createTaskFull({ id: "task-1" })] }];

        // Act & Assert
        expect(withTaskInsert({ columns, columnId: "no-such-column", task: createTaskFull({ id: "task-2" }) })).toEqual(
            columns,
        );
    });
});

describe("withTaskReplace", () => {
    /* docs/adr/tech/0030 rule 2: the response carries no subtasks, so an assign would empty the card. */
    it("merges the server's task over the placeholder, keeping the subtasks it already held", () => {
        // Arrange
        const columns = [
            { id: "column-1", tasks: [createTaskFull({ id: "placeholder", subtasks: [createSubtask()] })] },
        ];

        // Act
        const [merged] = withTaskReplace({
            columns,
            taskId: "placeholder",
            task: { id: "real-task", title: "Take coffee break", description: undefined, version: 2, position: 4 },
        })[0].tasks;

        // Assert
        expect(merged).toMatchObject({ id: "real-task", title: "Take coffee break", version: 2, position: 4 });
        expect(merged.subtasks).toEqual(columns[0].tasks[0].subtasks);
    });

    it("returns an equivalent board when the id names no task on it", () => {
        // Arrange
        const columns = [{ id: "column-1", tasks: [createTaskFull({ id: "task-1" })] }];

        // Act & Assert
        expect(
            withTaskReplace({
                columns,
                taskId: "no-such-task",
                task: { id: "real-task", title: "Take coffee break", description: undefined, version: 0, position: 0 },
            }),
        ).toEqual(columns);
    });
});

describe("withSubtaskInsert", () => {
    const createColumnsWithOneSubtask = () => [
        {
            id: "column-1",
            tasks: [createTaskFull({ id: "task-1", subtasks: [createSubtask({ id: "subtask-1" })] })],
        },
    ];

    it("appends the new subtask after the task's existing ones", () => {
        // Act
        const columns = withSubtaskInsert({
            columns: createColumnsWithOneSubtask(),
            taskId: "task-1",
            subtask: createSubtask({ id: "subtask-2", title: "New Subtask" }),
        });

        // Assert
        expect(columns[0].tasks[0].subtasks.map((subtask) => subtask.id)).toEqual(["subtask-1", "subtask-2"]);
    });

    it("leaves a different task's subtasks untouched", () => {
        // Arrange
        const columns = [
            ...createColumnsWithOneSubtask(),
            { id: "column-2", tasks: [createTaskFull({ id: "task-2", subtasks: [] })] },
        ];

        // Act
        const rendered = withSubtaskInsert({ columns, taskId: "task-1", subtask: createSubtask({ id: "new" }) });

        // Assert
        expect(rendered[1].tasks[0].subtasks).toEqual([]);
    });

    /* A task id the board no longer holds — e.g. a concurrent delete — yields the input untouched. */
    it("hands the columns back untouched when the task is no longer on the board", () => {
        // Arrange
        const columns = createColumnsWithOneSubtask();

        // Act
        const rendered = withSubtaskInsert({ columns, taskId: "deleted", subtask: createSubtask({ id: "new" }) });

        // Assert
        expect(rendered).toEqual(columns);
    });
});

describe("withSubtaskRename", () => {
    const createColumnsWithSubtask = () => [
        {
            id: "column-1",
            tasks: [createTaskFull({ id: "task-1", subtasks: [createSubtask({ id: "subtask-1", title: "Old" })] })],
        },
    ];

    it("renames the named subtask, leaving its other fields untouched", () => {
        // Act
        const columns = withSubtaskRename({
            columns: createColumnsWithSubtask(),
            taskId: "task-1",
            subtaskId: "subtask-1",
            title: "New",
        });

        // Assert
        expect(columns[0].tasks[0].subtasks[0]).toEqual(expect.objectContaining({ id: "subtask-1", title: "New" }));
    });

    it("leaves a different task's subtasks untouched", () => {
        // Arrange
        const columns = [
            ...createColumnsWithSubtask(),
            {
                id: "column-2",
                tasks: [
                    createTaskFull({ id: "task-2", subtasks: [createSubtask({ id: "subtask-2", title: "Sibling" })] }),
                ],
            },
        ];

        // Act
        const rendered = withSubtaskRename({ columns, taskId: "task-1", subtaskId: "subtask-1", title: "New" });

        // Assert
        expect(rendered[1].tasks[0].subtasks[0].title).toBe("Sibling");
    });

    /* A subtask id the board no longer holds — e.g. a concurrent delete — yields the input untouched. */
    it("hands the columns back untouched when the subtask is no longer on the board", () => {
        // Arrange
        const columns = createColumnsWithSubtask();

        // Act
        const rendered = withSubtaskRename({ columns, taskId: "task-1", subtaskId: "deleted", title: "New" });

        // Assert
        expect(rendered).toEqual(columns);
    });
});

describe("withSubtaskRemove", () => {
    const createColumnsWithTwoSubtasks = () => [
        {
            id: "column-1",
            tasks: [
                createTaskFull({
                    id: "task-1",
                    subtasks: [createSubtask({ id: "subtask-1" }), createSubtask({ id: "subtask-2" })],
                }),
            ],
        },
    ];

    /* D-09/S-05: the row the delete removed is gone; a sibling row keeps its own original position. */
    it("removes only the named subtask, leaving a sibling subtask at its original index", () => {
        // Act
        const columns = withSubtaskRemove({
            columns: createColumnsWithTwoSubtasks(),
            taskId: "task-1",
            subtaskId: "subtask-1",
        });

        // Assert
        expect(columns[0].tasks[0].subtasks.map((subtask) => subtask.id)).toEqual(["subtask-2"]);
    });

    it("leaves a different task's subtasks untouched", () => {
        // Arrange
        const columns = [
            ...createColumnsWithTwoSubtasks(),
            {
                id: "column-2",
                tasks: [createTaskFull({ id: "task-2", subtasks: [createSubtask({ id: "subtask-3" })] })],
            },
        ];

        // Act
        const rendered = withSubtaskRemove({ columns, taskId: "task-1", subtaskId: "subtask-1" });

        // Assert
        expect(rendered[1].tasks[0].subtasks.map((subtask) => subtask.id)).toEqual(["subtask-3"]);
    });

    /* A subtask id the board no longer holds — e.g. a concurrent delete — yields the input untouched. */
    it("hands the columns back untouched when the subtask is no longer on the board", () => {
        // Arrange
        const columns = createColumnsWithTwoSubtasks();

        // Act
        const rendered = withSubtaskRemove({ columns, taskId: "task-1", subtaskId: "deleted" });

        // Assert
        expect(rendered).toEqual(columns);
    });
});

describe("withTaskUpdate", () => {
    const createColumnsWithTask = () => [
        { id: "column-1", tasks: [createTaskFull({ id: "task-1", title: "Old Title", description: "Old desc" })] },
    ];

    it("applies the new title and description, leaving other fields untouched", () => {
        // Act
        const columns = withTaskUpdate({
            columns: createColumnsWithTask(),
            taskId: "task-1",
            title: "New Title",
            description: "New desc",
        });

        // Assert
        expect(columns[0].tasks[0]).toEqual(
            expect.objectContaining({ id: "task-1", title: "New Title", description: "New desc" }),
        );
    });

    /* T9: a save that leaves the description untouched by the server still updates the client's own view of it. */
    it("applies an undefined description, clearing the client's own copy", () => {
        // Act
        const columns = withTaskUpdate({
            columns: createColumnsWithTask(),
            taskId: "task-1",
            title: "New Title",
            description: undefined,
        });

        // Assert
        expect(columns[0].tasks[0].description).toBeUndefined();
    });

    it("leaves a different task's title and description untouched", () => {
        // Arrange
        const columns = [
            ...createColumnsWithTask(),
            { id: "column-2", tasks: [createTaskFull({ id: "task-2", title: "Sibling Title" })] },
        ];

        // Act
        const rendered = withTaskUpdate({ columns, taskId: "task-1", title: "New Title", description: undefined });

        // Assert
        expect(rendered[1].tasks[0].title).toBe("Sibling Title");
    });

    /* A task id the board no longer holds — e.g. a concurrent delete — yields the input untouched. */
    it("hands the columns back untouched when the task is no longer on the board", () => {
        // Arrange
        const columns = createColumnsWithTask();

        // Act
        const rendered = withTaskUpdate({ columns, taskId: "deleted", title: "New Title", description: undefined });

        // Assert
        expect(rendered).toEqual(columns);
    });
});

/** Four cards in one column, named so an index assertion reads as an order rather than a number. */
const DESTINATION_IDS = ["alpha", "bravo", "charlie", "delta"];

describe("toTaskMoveTargetPosition", () => {
    it("puts a cross-column drop at the index of the card it landed on", () => {
        // Act — the dragged task is not in this column, so nothing is removed from it.
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "elsewhere",
            overTaskId: "alpha",
        });

        // Assert
        expect(position).toBe(0);
    });

    it("puts a cross-column drop on the last card before it, not after", () => {
        // Act
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "elsewhere",
            overTaskId: "delta",
        });

        // Assert
        expect(position).toBe(3);
    });

    /* T3: omitting the field means "append", so a drop on the body must send the end index itself. */
    it("appends when the drop landed on the column body rather than a card", () => {
        // Act
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "elsewhere",
            overTaskId: null,
        });

        // Assert
        expect(position).toBe(4);
    });

    it("appends into an empty column", () => {
        // Act
        const position = toTaskMoveTargetPosition({ destinationTaskIds: [], taskId: "elsewhere", overTaskId: null });

        // Assert
        expect(position).toBe(0);
    });

    /*
     * The case the two readings differ on: dropping alpha on charlie must land it AFTER charlie, as
     * dnd-kit's own preview shows it. Reading the reduced list's index alone lands it one short.
     */
    it("adds the downward step for a within-column move, so the card lands where the preview showed it", () => {
        // Act
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "alpha",
            overTaskId: "charlie",
        });

        // Assert — [bravo, charlie, alpha, delta], which is index 2.
        expect(position).toBe(2);
    });

    it("takes a within-column move to the last index when dropped on the last card", () => {
        // Act
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "alpha",
            overTaskId: "delta",
        });

        // Assert
        expect(position).toBe(3);
    });

    it("takes a within-column upward move to index 0 without the downward step", () => {
        // Act
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "delta",
            overTaskId: "alpha",
        });

        // Assert
        expect(position).toBe(0);
    });

    it("appends when the card it landed on is no longer in the destination", () => {
        // Act
        const position = toTaskMoveTargetPosition({
            destinationTaskIds: DESTINATION_IDS,
            taskId: "elsewhere",
            overTaskId: "gone",
        });

        // Assert
        expect(position).toBe(4);
    });
});

/** Two columns of two tasks each, with ids a rendered order can be read off directly. */
const createBoardColumns = (): NamedTaskColumn[] => [
    {
        id: "source",
        name: "Source",
        tasks: [createTaskFull({ id: "s1", title: "S1" }), createTaskFull({ id: "s2", title: "S2" })],
    },
    {
        id: "destination",
        name: "Destination",
        tasks: [createTaskFull({ id: "d1", title: "D1" }), createTaskFull({ id: "d2", title: "D2" })],
    },
];

const toRenderedIds = (columns: NamedTaskColumn[]): string[][] =>
    columns.map((column) => column.tasks.map((task) => task.id));

describe("moveTaskInColumns", () => {
    it("re-parents the task into the destination at the given index", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = moveTaskInColumns({
            columns,
            taskId: "s1",
            targetColumnId: "destination",
            targetIndex: 1,
        });

        // Assert
        expect(toRenderedIds(rendered)).toEqual([["s2"], ["d1", "s1", "d2"]]);
    });

    it("reorders within one column when the source and the destination are the same", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = moveTaskInColumns({ columns, taskId: "s1", targetColumnId: "source", targetIndex: 1 });

        // Assert
        expect(toRenderedIds(rendered)).toEqual([
            ["s2", "s1"],
            ["d1", "d2"],
        ]);
    });

    /* A card the board no longer holds is never synthesised into the destination. */
    it("hands the columns back untouched when the moved task is no longer on the board", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = moveTaskInColumns({
            columns,
            taskId: "deleted",
            targetColumnId: "destination",
            targetIndex: 0,
        });

        // Assert
        expect(rendered).toBe(columns);
    });
});

/** A fallback that reports which handler ran, so delegation is observable rather than inferred. */
const createRecordingFallback = (): Announcements => ({
    onDragStart: () => "fallback start",
    onDragOver: () => "fallback over",
    onDragEnd: () => "fallback end",
    onDragCancel: () => "fallback cancel",
});

describe("createTaskMoveAnnouncements", () => {
    it("names the task, its column and its 1-based position on the lift", () => {
        // Arrange
        const announcements = createTaskMoveAnnouncements({
            columns: createBoardColumns(),
            fallback: createRecordingFallback(),
        });

        // Act
        const spoken = announcements.onDragStart({
            active: { id: "d2", data: { current: undefined }, rect: { current: { initial: null, translated: null } } },
        });

        // Assert
        expect(spoken).toBe(
            "Picked up D2 from Destination, position 2 of 2. Use arrow keys to move, space to drop, escape to cancel.",
        );
    });

    /** A minimal `Active`/`Over` pair — only the fields `resolveTask` and the drag-event shape need. */
    const createActive = (id: string) => ({
        id,
        data: { current: undefined },
        rect: { current: { initial: null, translated: null } },
    });
    const OVER_RECT = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    const createOver = (id: string) => ({ id, rect: OVER_RECT, disabled: false, data: { current: undefined } });

    it("announces a within-column move in the contract's own wording, naming the column last", () => {
        // Arrange
        const announcements = createTaskMoveAnnouncements({
            columns: createBoardColumns(),
            fallback: createRecordingFallback(),
        });

        // Act — S1 hovers over S2, both in "Source".
        const spoken = announcements.onDragOver({ active: createActive("s1"), over: createOver("s2") });

        // Assert
        expect(spoken).toBe("S1 moved to position 2 of 2 in Source.");
    });

    it("announces a cross-column move in the contract's own wording, naming the column first", () => {
        // Arrange
        const announcements = createTaskMoveAnnouncements({
            columns: createBoardColumns(),
            fallback: createRecordingFallback(),
        });

        // Act — S1 (in "Source") hovers over D1, in "Destination".
        const spoken = announcements.onDragOver({ active: createActive("s1"), over: createOver("d1") });

        // Assert
        expect(spoken).toBe("S1 moved to Destination, position 1 of 2.");
    });

    /* One `DndContext` takes one announcements object, so a column id must still reach Phase 3's strings. */
    it("delegates an id this board holds no task for to the column reorder's own announcements", () => {
        // Arrange
        const announcements = createTaskMoveAnnouncements({
            columns: createBoardColumns(),
            fallback: createRecordingFallback(),
        });

        // Act
        const spoken = announcements.onDragStart({
            active: {
                id: "source",
                data: { current: undefined },
                rect: { current: { initial: null, translated: null } },
            },
        });

        // Assert
        expect(spoken).toBe("fallback start");
    });
});

describe("createEmptySubtaskRows", () => {
    it("creates the requested number of blank rows", () => {
        // Act
        const rows = createEmptySubtaskRows(2);

        // Assert
        expect(rows).toEqual([{ value: "" }, { value: "" }]);
    });

    it("creates zero rows when asked for none", () => {
        // Act
        const rows = createEmptySubtaskRows(0);

        // Assert
        expect(rows).toEqual([]);
    });
});

describe("buildSubtaskRowPath", () => {
    it("builds the react-hook-form field path for a given row index", () => {
        // Act & Assert
        expect(buildSubtaskRowPath(0)).toBe("subtasks.0.value");
        expect(buildSubtaskRowPath(3)).toBe("subtasks.3.value");
    });
});

describe("toSubmittedSubtaskTitles", () => {
    /* UI-SPEC empty/add-task-modal: a blank row is omitted from the fan-out, not validation-blocked. */
    it("drops blank and whitespace-only rows", () => {
        // Act
        const titles = toSubmittedSubtaskTitles(["Make coffee", "", "   ", "Drink coffee & smile"]);

        // Assert
        expect(titles).toEqual(["Make coffee", "Drink coffee & smile"]);
    });

    it("trims the rows it keeps", () => {
        // Act
        const titles = toSubmittedSubtaskTitles(["  Make coffee  "]);

        // Assert
        expect(titles).toEqual(["Make coffee"]);
    });

    /* UI-SPEC empty/add-task-modal: removing every row is legal — a task with no subtasks is valid. */
    it("returns an empty array when every row is blank", () => {
        // Act
        const titles = toSubmittedSubtaskTitles(["", "   "]);

        // Assert
        expect(titles).toEqual([]);
    });
});

describe("toSubtaskRowPlaceholder", () => {
    it("returns each seeded row's own placeholder for the first two rows", () => {
        // Act & Assert
        expect(toSubtaskRowPlaceholder(0)).toBe("e.g. Make coffee");
        expect(toSubtaskRowPlaceholder(1)).toBe("e.g. Drink coffee & smile");
    });

    it("repeats the first row's placeholder for every row after the seeded two", () => {
        // Act
        expect(toSubtaskRowPlaceholder(2)).toBe("e.g. Make coffee");
        expect(toSubtaskRowPlaceholder(5)).toBe("e.g. Make coffee");
    });
});
