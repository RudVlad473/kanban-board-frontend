import { NextResponse, type NextRequest } from "next/server";

import { ROUTE, type Route } from "@/lib/core/routing/routes";
import { session } from "@/lib/server/session";

/**
 * The set of in-app destinations this handler will redirect to — restricts the `redirect` query
 * param to a known `ROUTE` value so this cookie-clearing endpoint can never become an open
 * redirect for an arbitrary attacker-supplied URL.
 */
const isKnownRoute = (value: string | null): value is Route =>
    value !== null && (Object.values(ROUTE) as string[]).includes(value);

/*
 * ADR tech/0026's one narrow exception to docs/adr/tech/0019's Route-Handler ban — a
 * Suspense-streamed Server Component (server-client.ts's onResponse) cannot legally mutate
 * cookies itself, so it redirects here instead (`/api/**` is outside `proxy.ts`'s own matcher).
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
    await session.destroy();

    const requestedDestination = request.nextUrl.searchParams.get("redirect");
    const destination = isKnownRoute(requestedDestination) ? requestedDestination : ROUTE.SIGN_IN;

    return NextResponse.redirect(new URL(destination, request.url));
};
