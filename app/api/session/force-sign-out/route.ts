import { NextResponse, type NextRequest } from "next/server";

import { ROUTE } from "@/lib/core/routing/routes";
import { session } from "@/lib/server/session";

/*
 * ADR tech/0026's one narrow exception to docs/adr/tech/0019's Route-Handler ban — a
 * Suspense-streamed Server Component (server-client.ts's onResponse) cannot legally mutate
 * cookies itself, so it redirects here instead (`/api/**` is outside `proxy.ts`'s own matcher).
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
    /*
     * WR-01 logout-CSRF guard: the session cookie is `SameSite=Lax`, so this fails closed on
     * anything but a browser-set `same-origin` navigation (docs/adr/tech/0026 step 1 for why that
     * header is unspoofable, and `e2e/session-bridge.e2e.spec.ts`'s SESSION-03 for the coverage).
     */
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite !== "same-origin") {
        return new NextResponse(null, { status: 403 });
    }

    await session.destroy();

    return NextResponse.redirect(new URL(ROUTE.SIGN_IN, request.url));
};
