import { describe, expect, it } from "vitest";

import { EXTERNAL_PATH } from "./external-paths";
import type { paths } from "./generated-types";

/*
 * Compile-time only: every EXTERNAL_PATH value must be a real key of the generated OpenAPI
 * `paths` type. A member drifting from the contract fails `tsc --noEmit`, not a runtime surprise.
 */
type ExternalPathValue = (typeof EXTERNAL_PATH)[keyof typeof EXTERNAL_PATH];
const _contractKeyAssertion: ExternalPathValue extends keyof paths ? true : never = true;
void _contractKeyAssertion;

describe("EXTERNAL_PATH", () => {
    it("has no duplicate path values", () => {
        // Arrange
        const values = Object.values(EXTERNAL_PATH);

        // Act
        const uniqueValues = new Set(values);

        // Assert
        expect(uniqueValues.size).toBe(values.length);
    });

    it("has every value starting with a forward slash", () => {
        // Arrange
        const values = Object.values(EXTERNAL_PATH);

        // Act / Assert
        for (const value of values) {
            expect(value.startsWith("/")).toBe(true);
        }
    });

    it("has no value containing an empty segment", () => {
        // Arrange
        const values = Object.values(EXTERNAL_PATH);

        // Act / Assert
        for (const value of values) {
            expect(value.includes("//")).toBe(false);
        }
    });
});

/*
 * The task and subtask templates, pinned literally: three of the seven mutations hang off ancestor
 * segments the generated type does not require, so a silently truncated template is a 404 rather
 * than a type error (04-RESEARCH.md Pitfall 2).
 */
describe("EXTERNAL_PATH task and subtask templates", () => {
    it("addresses a task under its column", () => {
        // Act & Assert
        expect(EXTERNAL_PATH.TASK_DETAIL).toBe("/boards/{boardId}/columns/{columnId}/tasks/{taskId}");
    });

    /* Pitfall 5: the move path is root-level and carries no board or column scoping at all. */
    it("addresses a move by task id alone, outside the boards family", () => {
        // Act & Assert
        expect(EXTERNAL_PATH.TASK_MOVE).toBe("/tasks/{taskId}/move");
    });

    it("addresses the subtask collection under its task", () => {
        // Act & Assert
        expect(EXTERNAL_PATH.TASK_SUBTASKS).toBe("/boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks");
    });

    it("addresses a subtask under its task", () => {
        // Act & Assert
        expect(EXTERNAL_PATH.SUBTASK_DETAIL).toBe(
            "/boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks/{subtaskId}",
        );
    });

    /*
     * Pitfall 1: task creation POSTs to the column resource itself. The sibling path that does name
     * the child is GET-only, so an invented create-task literal would produce a 405.
     */
    it("reuses the column resource path as the create-task target rather than declaring its own", () => {
        // Arrange
        const values: string[] = Object.values(EXTERNAL_PATH);

        // Act & Assert
        expect(EXTERNAL_PATH.COLUMN_DETAIL).toBe("/boards/{boardId}/columns/{columnId}");
        expect(values).not.toContain("/boards/{boardId}/columns/{columnId}/tasks");
    });
});
