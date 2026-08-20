/**
 * The *backend's* own REST contract path templates (`docs/api/kanban-board-openapi.json`'s schema
 * paths, passed as `externalApi`'s first argument) — not this app's own page routes, which live in
 * `src/lib/core/routing/routes.ts` instead. Declared once here, `as const`, so every Route Handler
 * this phase (and Phases 3-4) adds reaches the external API through the same literal-typed values
 * `openapi-fetch`'s generic path parameter needs for response typing, instead of restating the
 * string inline at each call site.
 */
export const EXTERNAL_PATH = {
    BOARDS: "/boards",
    BOARD_DETAIL: "/boards/{boardId}",
    BOARD_FULL: "/boards/{boardId}/full",
    BOARD_COLUMNS: "/boards/{boardId}/columns",
} as const;
