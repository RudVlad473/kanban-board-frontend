import { describe, expect, it } from "vitest";

import {
    createTaskAwareCollisionDetection,
    isPastOverTaskCentre,
    toDragItemData,
} from "@/features/tasks/task-drag-model";
import { buildColumnBodyDroppableId, DRAG_ITEM_TYPE } from "@/lib/core/drag/drag-items";

/** A card-sized rect at a given top edge; only the vertical axis decides this predicate. */
const createCardRect = (top: number) => ({ top, bottom: top + 88, left: 0, right: 280, width: 280, height: 88 });

describe("isPastOverTaskCentre", () => {
    it("reads a card resting level with the one it landed on as NOT past it", () => {
        // Act & Assert
        expect(isPastOverTaskCentre({ activeRect: createCardRect(100), overRect: createCardRect(100) })).toBe(false);
    });

    /* One pixel past the shared centre is enough — an edge test would never reach the last slot. */
    it("reads a card nudged one pixel below the one it landed on as past it", () => {
        // Act & Assert
        expect(isPastOverTaskCentre({ activeRect: createCardRect(101), overRect: createCardRect(100) })).toBe(true);
    });

    it("reads a card still overlapping from above as not past it", () => {
        // Act & Assert
        expect(isPastOverTaskCentre({ activeRect: createCardRect(60), overRect: createCardRect(100) })).toBe(false);
    });

    it("reports no translated rect as not past, since nothing was dragged", () => {
        // Act & Assert
        expect(isPastOverTaskCentre({ activeRect: null, overRect: createCardRect(100) })).toBe(false);
    });
});

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

const createContainer = ({
    id,
    left,
    top,
    data,
}: {
    id: string;
    left: number;
    top: number;
    /** Left `undefined` for the task-path fixtures below, which never read a container's own type. */
    data?: Record<string, unknown>;
}) => ({
    id,
    key: id,
    disabled: false,
    node: { current: null },
    rect: { current: createRect({ left, top }) },
    data: { current: data },
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
        // comment-length-exempt: an empirically-confirmed dnd-kit interaction a future reader would otherwise revert as unnecessary (docs/adr/tech/0023)
        /*
         * The column branch narrows `closestCenter` to COLUMN-declared containers only — the
         * regression this narrowing fixed: `sortableKeyboardCoordinates` picks its own candidate
         * from every ENABLED droppable regardless of type, so an un-narrowed column-body or task
         * container competing on centre distance sent a keyboard column step to the wrong rect
         * entirely (see the matching notes in `use-column-drag-sensors.ts` and
         * `sortable-column.tsx`). The containers below carry their real declared types so the
         * narrowing has something concrete to exclude, exactly as production registers them.
         */
        const containers = [
            createContainer({ id: "left", left: 0, top: 0, data: { type: DRAG_ITEM_TYPE.COLUMN } }),
            createContainer({
                id: buildColumnBodyDroppableId("left"),
                left: 0,
                top: 0,
                data: { type: DRAG_ITEM_TYPE.COLUMN_BODY, columnId: "left" },
            }),
            createContainer({ id: "left-1", left: 0, top: 0, data: { type: DRAG_ITEM_TYPE.TASK, columnId: "left" } }),
            createContainer({ id: "right", left: 300, top: 0, data: { type: DRAG_ITEM_TYPE.COLUMN } }),
            createContainer({
                id: buildColumnBodyDroppableId("right"),
                left: 300,
                top: 0,
                data: { type: DRAG_ITEM_TYPE.COLUMN_BODY, columnId: "right" },
            }),
            createContainer({
                id: "right-1",
                left: 300,
                top: 0,
                data: { type: DRAG_ITEM_TYPE.TASK, columnId: "right" },
            }),
        ];

        // Arrange
        const detect = createTaskAwareCollisionDetection({ columnTaskIds: COLUMN_TASK_IDS });

        // Act
        const collisions = detect({
            droppableContainers: containers,
            droppableRects: new Map(containers.map((container) => [container.id, container.rect.current])),
            collisionRect: createRect({ left: 300, top: 0 }),
            pointerCoordinates: { x: 400, y: 20 },
            active: {
                id: "right",
                data: { current: { type: DRAG_ITEM_TYPE.COLUMN } },
                rect: { current: { initial: null, translated: null } },
            },
        });

        // Assert — the closest collision is the COLUMN container, never the body or card beside it.
        expect(collisions.length).toBeGreaterThan(0);
        expect(collisions[0].id).toBe("right");
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
