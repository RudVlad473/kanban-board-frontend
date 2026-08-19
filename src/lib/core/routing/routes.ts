/**
 * The single declaration of every application path — `proxy.ts` (the optimistic pre-render
 * guard), `app/(dashboard)/layout.tsx` (the authoritative check), every auth hook and cross-link,
 * and the end-to-end specs all read from `ROUTE` (or `boardDetail` for the one dynamic path) so
 * no application path literal exists anywhere else, and `pnpm routes:check` fails the build if
 * one reappears.
 *
 * Follows ADR tech/0012's enum-like constant pattern (`as const` object, derived union type) with
 * one deliberate deviation: the keys do not mirror their own values. The ADR's own examples
 * (`DEVICE_TYPE`, `THEME`) are labels, where a key identical to its value keeps the two
 * interchangeable. A route's value is a URL path — a key mirroring it would be path-shaped
 * (`"/login": "/login"`) and unusable as an identifier. What this file replicates is the half of
 * the pattern that carries the actual benefit: one `as const` object as the single runtime
 * source, and a type derived from it via the index-access idiom rather than declared separately.
 */
export const ROUTE = {
    HOME: "/",
    SIGN_IN: "/login",
    SIGN_UP: "/register",
    BOARDS: "/boards",
} as const;

export type Route = (typeof ROUTE)[keyof typeof ROUTE];

/*
 * A separate export, not a member of `ROUTE` — a function stored inside the object would be
 * swept into `Route`'s derived type by the index-access idiom, turning it into a union of paths
 * and a function. `boardDetail` builds its result from `ROUTE.BOARDS` instead, so the prefix
 * still has exactly one source.
 */
export const boardDetail = (boardId: string): string => `${ROUTE.BOARDS}/${boardId}`;

/**
 * Prefix-matched, not exact-matched — `/boards` and every `/boards/:id` path are covered by the
 * same rule, which is the adjacency behaviour AUTH-03 requires (board list and board detail are
 * both protected by one declaration). Built from `ROUTE` members, not fresh literals, so the
 * policy can never state a path in a form differing by a character from the path the app actually
 * links to.
 */
export const PROTECTED_PREFIXES = [ROUTE.BOARDS] as const;

export const PUBLIC_PATHS = [ROUTE.HOME, ROUTE.SIGN_IN, ROUTE.SIGN_UP] as const;

export const isProtectedPath = (pathname: string): boolean =>
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const isPublicPath = (pathname: string): boolean => (PUBLIC_PATHS as readonly string[]).includes(pathname);
