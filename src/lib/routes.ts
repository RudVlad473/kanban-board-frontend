/**
 * The single declaration of this app's route policy — `proxy.ts` (the optimistic pre-render
 * guard), `app/(dashboard)/layout.tsx` (the authoritative check) and the end-to-end specs all
 * read these same constants so the protected/public path lists and redirect destinations can
 * never drift apart between the two guard layers.
 */

/**
 * Prefix-matched, not exact-matched — `/boards` and every `/boards/:id` path are covered by the
 * same rule, which is the adjacency behaviour AUTH-03 requires (board list and board detail are
 * both protected by one declaration).
 */
export const PROTECTED_PREFIXES = ["/boards"] as const;

export const PUBLIC_PATHS = ["/", "/login", "/register"] as const;

export const SIGN_IN_PATH = "/login";

export const BOARDS_PATH = "/boards";

export const isProtectedPath = (pathname: string): boolean =>
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const isPublicPath = (pathname: string): boolean => (PUBLIC_PATHS as readonly string[]).includes(pathname);
