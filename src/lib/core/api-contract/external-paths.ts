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
    SIGN_IN: "/signin",
    SIGN_UP: "/signup",
    USER_THEME: "/users/me/theme",
    ADMIN_RESET: "/admin/reset",
} as const;
