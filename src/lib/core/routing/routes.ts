/**
 * The single declaration of every application path — every call site imports `ROUTE` (or the
 * dynamic path builder below) instead of a literal; `pnpm routes:check` fails the build if one
 * reappears. Follows ADR tech/0012's `as const` pattern, keys deliberately not mirroring values.
 */
export const ROUTE = {
    HOME: "/",
    SIGN_IN: "/login",
    SIGN_UP: "/register",
    BOARDS: "/boards",
    /*
     * The one narrow Route Handler exception to docs/adr/tech/0019's ban (ADR tech/0026) — not a
     * page, so it is deliberately absent from PUBLIC_PATHS/PROTECTED_PREFIXES below.
     */
    FORCE_SIGN_OUT: "/api/session/force-sign-out",
} as const;

export type Route = (typeof ROUTE)[keyof typeof ROUTE];

// Not a ROUTE member — would pull a function into Route's derived union type (ADR tech/0012).
export const buildBoardDetailPath = (boardId: string): string => `${ROUTE.BOARDS}/${boardId}`;

/** Exactly one segment below the board-list route, so a deeper path never reads as a board id. */
const BOARD_DETAIL_PATH_PATTERN = new RegExp(`^${ROUTE.BOARDS}/([^/]+)$`);

/** `buildBoardDetailPath`'s inverse — the board id a path names, or null when it names none. */
export const toBoardIdFromPath = (pathname: string): string | null => {
    const match = BOARD_DETAIL_PATH_PATTERN.exec(pathname);

    return match !== null ? match[1] : null;
};

/**
 * Prefix-matched (AUTH-03: the board list and every board-detail path share one protection rule),
 * built from `ROUTE` members rather than fresh literals so the policy can't drift from the paths
 * the app actually links to.
 */
export const PROTECTED_PREFIXES = [ROUTE.BOARDS] as const;

export const PUBLIC_PATHS = [ROUTE.HOME, ROUTE.SIGN_IN, ROUTE.SIGN_UP] as const;

export const isProtectedPath = (pathname: string): boolean =>
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const isPublicPath = (pathname: string): boolean => (PUBLIC_PATHS as readonly string[]).includes(pathname);

/**
 * The request header `proxy.ts` stamps the pathname onto, so a Server Component can resolve the
 * open board's id — a layout receives no `params` for a segment below it, and the board is
 * hydrated by the dashboard layout rather than by the board page (docs/adr/tech/0030).
 */
export const PATHNAME_HEADER = "x-kanban-pathname";
