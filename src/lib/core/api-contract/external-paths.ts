/**
 * The backend's own REST contract path templates, passed as `externalApi`'s first argument — not
 * this app's page routes (`src/lib/core/routing/routes.ts`). Declared once here `as const` (ADR
 * tech/0012) so every call site shares the literal-typed value `openapi-fetch` needs for typing.
 */
export const EXTERNAL_PATH = {
    BOARDS: "/boards",
    BOARD_DETAIL: "/boards/{boardId}",
    BOARD_FULL: "/boards/{boardId}/full",
    BOARD_COLUMNS: "/boards/{boardId}/columns",
    /*
     * Target of three operations, one of which reads like a mistake: task CREATION posts here, to
     * the column resource itself, with no trailing segment naming the child. The sibling path that
     * does name it is GET-only, so "correcting" this to `.../tasks` produces a 405 (Pitfall 1).
     */
    COLUMN_DETAIL: "/boards/{boardId}/columns/{columnId}",
    COLUMN_REORDER: "/boards/{boardId}/columns/{columnId}/reorder",
    TASK_DETAIL: "/boards/{boardId}/columns/{columnId}/tasks/{taskId}",
    /*
     * Root-level, outside the boards family, and carrying no board or column scoping at all — so
     * cross-board and cross-account authorization is entirely the backend's (Pitfall 5, whose probe
     * question T7 in `.planning/phases/04-task-subtask-workflow/04-RESEARCH.md` confirms it refuses).
     */
    TASK_MOVE: "/tasks/{taskId}/move",
    TASK_SUBTASKS: "/boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks",
    SUBTASK_DETAIL: "/boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks/{subtaskId}",
    SIGN_IN: "/signin",
    SIGN_UP: "/signup",
    USER_THEME: "/users/me/theme",
    ADMIN_RESET: "/admin/reset",
} as const;
