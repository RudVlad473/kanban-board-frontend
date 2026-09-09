import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, isPublicPath, PATHNAME_HEADER, ROUTE } from "@/lib/core/routing/routes";
import { session, SESSION_COOKIE_NAME } from "@/lib/server/session";

/*
 * Next.js 16's file convention (renamed from `middleware.ts`; RESEARCH.md Pitfall 2) — an
 * optimisation only, not the authoritative check: `app/(dashboard)/layout.tsx`'s own
 * `verifySession()` call is what actually stops the CVE-2025-29927 bypass (see docs/adr/tech/0019, T-01-05).
 */
const proxy = async (request: NextRequest): Promise<NextResponse> => {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const identity = await session.verifyToken(token);

    /*
     * Every non-valid session (absent, malformed, tampered, expired) takes this branch identically
     * — `verifyToken` already collapses all four failure modes to `null`, so no special-casing is
     * added here.
     */
    if (isProtectedPath(pathname) && !identity) {
        return NextResponse.redirect(new URL(ROUTE.SIGN_IN, request.url));
    }

    if (isPublicPath(pathname) && identity) {
        return NextResponse.redirect(new URL(ROUTE.BOARDS, request.url));
    }

    /*
     * The pathname, carried forward so `app/(dashboard)/layout.tsx` can resolve the open board's
     * id: it holds the board's hydration boundary but sits ABOVE `[boardId]`, so it receives no
     * `params` of its own and has no other way to learn which board is open.
     */
    const headers = new Headers(request.headers);
    headers.set(PATHNAME_HEADER, pathname);

    return NextResponse.next({ request: { headers } });
};

export default proxy;

/*
 * Excludes the BFF's own API routes (they authenticate themselves), Next.js's static/image asset
 * paths, and any request for a static file extension (favicon, images, fonts, etc.) — this guard
 * has no protective purpose there and would only add latency.
 */
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
