import { NextResponse, type NextRequest } from "next/server";

import { ROUTE } from "@/lib/core/routing/routes";
import { session } from "@/lib/server/session";

/*
 * ADR tech/0026's one narrow exception to docs/adr/tech/0019's Route-Handler ban — a
 * Suspense-streamed Server Component (server-client.ts's onResponse) cannot legally mutate
 * cookies itself, so it redirects here instead (`/api/**` is outside `proxy.ts`'s own matcher).
 *
 * WR-01 guard: the session cookie is `SameSite=Lax`, which still attaches on a top-level
 * cross-site GET navigation — without this check, a third-party page linking straight to this
 * URL could force any signed-in visitor's session to be destroyed (logout CSRF). `Sec-Fetch-Site`
 * is set by the browser itself on every navigation and cannot be spoofed by a cross-site page;
 * only the internal same-origin redirect this handler exists for produces `same-origin`. A
 * missing header (older browsers, or a non-navigation request) is treated as untrusted and fails
 * closed — the session is left intact rather than destroyed.
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite !== "same-origin") {
        return new NextResponse(null, { status: 403 });
    }

    await session.destroy();

    return NextResponse.redirect(new URL(ROUTE.SIGN_IN, request.url));
};
