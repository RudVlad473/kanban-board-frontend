import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, isPublicPath, ROUTE } from "@/lib/core/routing/routes";
import { session, SESSION_COOKIE_NAME } from "@/lib/session";

/*
 * The Next.js 16 file convention (renamed from `middleware.ts` — RESEARCH.md Pitfall 2). This is
 * an optimisation, not the authorisation decision: `app/(dashboard)/layout.tsx` calls
 * `verifySession()` itself and refuses access on its own authority, so disabling or bypassing
 * this file (the CVE-2025-29927 class of vulnerability) still does not expose protected content.
 *
 * `session.verifyToken()` is the same jose verification `session.verify()` uses, factored out so
 * this file doesn't reimplement it — it exists here rather than `session.verify()` because
 * `next/headers`'s `cookies()` requires a Server Component/Route Handler/Server Action request
 * scope that a proxy/middleware function does not have; `NextRequest.cookies` is this file's own
 * cookie-reading API instead.
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

    return NextResponse.next();
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
