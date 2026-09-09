// Covered by: `src/features/tasks/task-drag-model.unit.test.ts`

/**
 * What a dragged or hovered item declares itself to be, read back off `useSortable`'s `data` option
 * in every drag handler. Declared once here (ADR tech/0012) because the columns half lives in the
 * boards feature and the tasks half in the tasks feature, which may not import each other.
 */
export const DRAG_ITEM_TYPE = {
    COLUMN: "COLUMN",
    TASK: "TASK",
    COLUMN_BODY: "COLUMN_BODY",
} as const;

export type DragItemType = (typeof DRAG_ITEM_TYPE)[keyof typeof DRAG_ITEM_TYPE];

/**
 * The droppable id a column's own card list registers under. It cannot be the column id: the column
 * is already a sortable under that id, and dnd-kit keys droppables by id alone.
 */
export const buildColumnBodyDroppableId = (columnId: string): string => `column-body-${columnId}`;
