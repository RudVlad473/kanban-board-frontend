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
} as const;

export type Route = (typeof ROUTE)[keyof typeof ROUTE];

// Not a ROUTE member — would pull a function into Route's derived union type (ADR tech/0012).
export const buildBoardDetailPath = (boardId: string): string => `${ROUTE.BOARDS}/${boardId}`;

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
