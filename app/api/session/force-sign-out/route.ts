import { NextResponse, type NextRequest } from "next/server";

import { ROUTE } from "@/lib/core/routing/routes";
import { session } from "@/lib/server/session";

/*
 * ADR tech/0026's one narrow exception to docs/adr/tech/0019's Route-Handler ban — a
 * Suspense-streamed Server Component (server-client.ts's onResponse) cannot legally mutate
 * cookies itself, so it redirects here instead (`/api/**` is outside `proxy.ts`'s own matcher).
 */

/**
 * WR-01's allow-list. `same-origin` is the streamed-RSC redirect; `none` is a server-issued
 * redirect descending from an address-bar navigation, which no attacker page can produce — every
 * navigation one initiates is `cross-site` or `same-site` (docs/adr/tech/0026 step 1).
 */
const ALLOWED_FETCH_SITES = new Set(["same-origin", "none"]);

export const GET = async (request: NextRequest): Promise<NextResponse> => {
    /*
     * WR-01 logout-CSRF guard: the session cookie is `SameSite=Lax`, so this fails closed on any
     * browser-set value outside the allow-list above, an absent header included
     * (`e2e/session-bridge.e2e.spec.ts`'s SESSION-01 and SESSION-03 cover both directions).
     */
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === null || !ALLOWED_FETCH_SITES.has(secFetchSite)) {
        return new NextResponse(null, { status: 403 });
    }

    await session.destroy();

    return NextResponse.redirect(new URL(ROUTE.SIGN_IN, request.url));
};
