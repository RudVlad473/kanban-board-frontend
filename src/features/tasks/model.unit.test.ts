import type { Announcements } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";

import {
    applyTaskMoveOverride,
    createTaskMoveAnnouncements,
    toSubtaskSummary,
    toTaskMoveTargetPosition,
    type NamedTaskColumn,
} from "@/features/tasks/model";
import { createSubtasks, createTaskFull } from "@/test-utils/factories/board-full";

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

describe("applyTaskMoveOverride", () => {
    it("returns the props array itself when there is no override", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = applyTaskMoveOverride({ columns, override: null });

        // Assert — reference equality, which is what the hook reads as "no override applied".
        expect(rendered).toBe(columns);
    });

    it("re-parents the task into the destination at the recorded index", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = applyTaskMoveOverride({
            columns,
            override: {
                taskId: "s1",
                targetColumnId: "destination",
                targetIndex: 1,
                previousTaskIds: [
                    { columnId: "source", taskIds: ["s1", "s2"] },
                    { columnId: "destination", taskIds: ["d1", "d2"] },
                ],
            },
        });

        // Assert
        expect(toRenderedIds(rendered)).toEqual([["s2"], ["d1", "s1", "d2"]]);
    });

    it("reorders within one column when the source and the destination are the same", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = applyTaskMoveOverride({
            columns,
            override: {
                taskId: "s1",
                targetColumnId: "source",
                targetIndex: 1,
                previousTaskIds: [{ columnId: "source", taskIds: ["s1", "s2"] }],
            },
        });

        // Assert
        expect(toRenderedIds(rendered)).toEqual([
            ["s2", "s1"],
            ["d1", "d2"],
        ]);
    });

    /*
     * The retirement signal: once the refreshed props carry the move, the recorded server order no
     * longer matches and the helper hands the props array back by reference — nothing clears state.
     */
    it("retires itself by reference once the server's own order has moved on", () => {
        // Arrange — the board as it reads AFTER the move landed and the action's refresh returned.
        const columns: NamedTaskColumn[] = [
            { id: "source", name: "Source", tasks: [createTaskFull({ id: "s2", title: "S2" })] },
            {
                id: "destination",
                name: "Destination",
                tasks: [
                    createTaskFull({ id: "d1", title: "D1" }),
                    createTaskFull({ id: "s1", title: "S1" }),
                    createTaskFull({ id: "d2", title: "D2" }),
                ],
            },
        ];

        // Act
        const rendered = applyTaskMoveOverride({
            columns,
            override: {
                taskId: "s1",
                targetColumnId: "destination",
                targetIndex: 1,
                previousTaskIds: [
                    { columnId: "source", taskIds: ["s1", "s2"] },
                    { columnId: "destination", taskIds: ["d1", "d2"] },
                ],
            },
        });

        // Assert
        expect(rendered).toBe(columns);
    });

    it("hands the props array back when the moved task is no longer on the board", () => {
        // Arrange
        const columns = createBoardColumns();

        // Act
        const rendered = applyTaskMoveOverride({
            columns,
            override: {
                taskId: "deleted",
                targetColumnId: "destination",
                targetIndex: 0,
                previousTaskIds: [{ columnId: "source", taskIds: ["s1", "s2"] }],
            },
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
