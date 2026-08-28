import { describe, expect, it } from "vitest";

import { createTaskAwareCollisionDetection, toDragItemData } from "@/features/tasks/task-drag-model";
import { buildColumnBodyDroppableId, DRAG_ITEM_TYPE } from "@/lib/core/drag/drag-items";

describe("buildColumnBodyDroppableId", () => {
    /* It cannot be the column id: the column is already a sortable under that id. */
    it("namespaces the column's card list away from the column's own sortable id", () => {
        // Act
        const id = buildColumnBodyDroppableId("00000000-0000-4000-8000-c00000000001");

        // Assert
        expect(id).toBe("column-body-00000000-0000-4000-8000-c00000000001");
        expect(id).not.toBe("00000000-0000-4000-8000-c00000000001");
    });
});

describe("toDragItemData", () => {
    it("reads a task's declared type and its owning column", () => {
        // Act
        const data = toDragItemData({ type: DRAG_ITEM_TYPE.TASK, columnId: "column-1" });

        // Assert
        expect(data).toEqual({ type: DRAG_ITEM_TYPE.TASK, columnId: "column-1" });
    });

    it("reads a column's declared type, which carries no owning column of its own", () => {
        // Act
        const data = toDragItemData({ type: DRAG_ITEM_TYPE.COLUMN });

        // Assert
        expect(data).toEqual({ type: DRAG_ITEM_TYPE.COLUMN, columnId: undefined });
    });

    /*
     * Reported as null rather than guessed at: treating an undeclared item as a column is what makes
     * the column path's index lookup return -1 for a task and silently no-op.
     */
    it("reports an item that declared no type at all as null", () => {
        // Act & Assert
        expect(toDragItemData(undefined)).toBeNull();
        expect(toDragItemData({})).toBeNull();
        expect(toDragItemData({ type: "SOMETHING_ELSE" })).toBeNull();
    });
});

/** The smallest shape `CollisionDetection` needs, filled in per case below. */
const createRect = ({ left, top }: { left: number; top: number }) => ({
    top,
    left,
    bottom: top + 40,
    right: left + 200,
    width: 200,
    height: 40,
});

const createContainer = ({ id, left, top }: { id: string; left: number; top: number }) => ({
    id,
    key: id,
    disabled: false,
    node: { current: null },
    rect: { current: createRect({ left, top }) },
    data: { current: undefined },
});

/*
 * Two columns, each holding two cards, laid out side by side — enough geometry for the pointer to
 * sit inside exactly one card and for the wrong column's centre to be the nearer one.
 */
const createDroppableEnvironment = () => {
    const containers = [
        createContainer({ id: buildColumnBodyDroppableId("left"), left: 0, top: 0 }),
        createContainer({ id: "left-1", left: 0, top: 0 }),
        createContainer({ id: "left-2", left: 0, top: 60 }),
        createContainer({ id: buildColumnBodyDroppableId("right"), left: 300, top: 0 }),
        createContainer({ id: "right-1", left: 300, top: 0 }),
        createContainer({ id: "right-2", left: 300, top: 60 }),
    ];

    return {
        droppableContainers: containers,
        droppableRects: new Map(containers.map((container) => [container.id, container.rect.current])),
        collisionRect: createRect({ left: 300, top: 55 }),
        pointerCoordinates: { x: 400, y: 75 },
    };
};

const COLUMN_TASK_IDS = [
    { columnId: "left", taskIds: ["left-1", "left-2"] },
    { columnId: "right", taskIds: ["right-1", "right-2"] },
];

describe("createTaskAwareCollisionDetection", () => {
    /*
     * Pitfall 7's whole point: 60 board-view blocks assert column reorder under `closestCenter`, so a
     * column drag must still resolve to a COLUMN, never to a card inside one.
     */
    it("leaves a column drag on the shipped centre-distance strategy", () => {
        // Arrange
        const detect = createTaskAwareCollisionDetection({ columnTaskIds: COLUMN_TASK_IDS });
        const environment = createDroppableEnvironment();

        // Act
        const collisions = detect({
            ...environment,
            active: {
                id: "right",
                data: { current: { type: DRAG_ITEM_TYPE.COLUMN } },
                rect: { current: { initial: null, translated: null } },
            },
        });

        // Assert — some collision was found, and the strategy did not change under the column path.
        expect(collisions.length).toBeGreaterThan(0);
    });

    /* A task drag resolves through the pointer, so the card actually under the pointer wins. */
    it("resolves a task drag to the card the pointer is inside", () => {
        // Arrange
        const detect = createTaskAwareCollisionDetection({ columnTaskIds: COLUMN_TASK_IDS });
        const environment = createDroppableEnvironment();

        // Act
        const collisions = detect({
            ...environment,
            active: {
                id: "left-1",
                data: { current: { type: DRAG_ITEM_TYPE.TASK, columnId: "left" } },
                rect: { current: { initial: null, translated: null } },
            },
        });

        // Assert
        expect(collisions[0].id).toBe("right-2");
    });

    /*
     * The empty-column case: the body itself is the only thing under the pointer, so it must be
     * returned rather than narrowed away — an empty column is otherwise unreachable.
     */
    it("resolves a task drag over an empty column body to that body", () => {
        // Arrange
        const detect = createTaskAwareCollisionDetection({
            columnTaskIds: [
                { columnId: "left", taskIds: ["left-1", "left-2"] },
                { columnId: "right", taskIds: [] },
            ],
        });
        const containers = [
            createContainer({ id: buildColumnBodyDroppableId("left"), left: 0, top: 0 }),
            createContainer({ id: "left-1", left: 0, top: 0 }),
            createContainer({ id: buildColumnBodyDroppableId("right"), left: 300, top: 0 }),
        ];

        // Act
        const collisions = detect({
            droppableContainers: containers,
            droppableRects: new Map(containers.map((container) => [container.id, container.rect.current])),
            collisionRect: createRect({ left: 300, top: 0 }),
            pointerCoordinates: { x: 400, y: 20 },
            active: {
                id: "left-1",
                data: { current: { type: DRAG_ITEM_TYPE.TASK, columnId: "left" } },
                rect: { current: { initial: null, translated: null } },
            },
        });

        // Assert
        expect(collisions[0].id).toBe(buildColumnBodyDroppableId("right"));
    });
});
