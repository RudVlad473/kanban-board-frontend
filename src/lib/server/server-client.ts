import "server-only";

import { redirect } from "next/navigation";
import createClient from "openapi-fetch";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import type { paths } from "@/lib/core/api-contract/generated-types";
import { PROBLEM_CODE, parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { ROUTE } from "@/lib/core/routing/routes";
import { upstreamCookie } from "@/lib/server/cookies/upstream-cookie";
import { verifySession } from "@/lib/server/dal";

/*
 * ADR tech/0006 forbids a hardcoded API base URL — a fallback default value here would silently
 * reintroduce exactly that. Fail fast at module load instead, so a missing environment variable
 * surfaces immediately rather than as a mysterious downstream fetch failure.
 */
const readExternalApiBaseUrl = () => {
    const baseUrl = process.env.EXTERNAL_API_BASE_URL;

    if (!baseUrl) {
        throw new Error(
            "EXTERNAL_API_BASE_URL is not set. Configure it per environment (see .env.example) — " +
                "the external API base URL is never hardcoded (ADR tech/0006).",
        );
    }

    return baseUrl;
};

/**
 * The two routes the backend serves without a session (T-01-49) — sending a stale bridged
 * credential to a request that is meant to mint a fresh one is pointless and confusing to debug.
 * Matched against `schemaPath`, the OpenAPI path template, not the resolved URL.
 */
const UNAUTHENTICATED_SCHEMA_PATHS = new Set<string>([EXTERNAL_PATH.SIGN_IN, EXTERNAL_PATH.SIGN_UP]);

/**
 * The only client instance targeting the external API contract (Pattern 1, 01-RESEARCH.md) —
 * `import "server-only"` above makes any Client Component that imports this fail the build,
 * mechanically enforcing the BFF-only auth rule (CONVENTIONS.md) rather than relying on review.
 */
export const externalApi = createClient<paths>({ baseUrl: readExternalApiBaseUrl() });

/*
 * GC-18's general session-bridging middleware (T-01-48/T-01-50/T-01-51/T-01-52) — one
 * module-scope registration covering every present and future `externalApi` caller. Reads the
 * session via the DAL's `verifySession()`, never a second direct `session.verify()` call (see 01-32-SUMMARY.md).
 */
externalApi.use({
    onRequest: async ({ request, schemaPath }) => {
        if (UNAUTHENTICATED_SCHEMA_PATHS.has(schemaPath)) {
            return request;
        }

        const record = await verifySession();
        if (record) {
            request.headers.set("Cookie", upstreamCookie.toHeader(record.jsessionId));
        }

        return request;
    },
    onResponse: async ({ request, response }) => {
        /*
         * Only a refusal on a call this middleware itself bridged a credential onto is a
         * forced-sign-out candidate — an anonymous 401 (no bridged credential) is expected and
         * must not force one (see 01-32-SUMMARY.md).
         */
        if (response.status !== 401 || !request.headers.has("Cookie")) {
            return response;
        }

        /*
         * Read a clone, not `response` itself — a consumed body breaks every downstream call site
         * (T-01-53). A rejecting `.json()` (empty/non-JSON body) is caught and treated like a
         * non-problem-shaped body: `parseProblemDetail(null)` returns `null`.
         */
        const clonedBody: unknown = await response
            .clone()
            .json()
            .catch(() => null);
        const problem = parseProblemDetail(clonedBody);

        /*
         * A wrong-password refusal is `BAD_CREDENTIALS` (T-01-51) and must never sign out a
         * working session in another tab. Every other 401 here is the backend's own session
         * quietly expiring (GC-18, T-01-52) and forces a full sign-out (see 01-32-SUMMARY.md).
         */
        if (problem?.code === PROBLEM_CODE.BAD_CREDENTIALS) {
            return response;
        }

        /*
         * cookies() writes are illegal from this Suspense-streamed Server Component context
         * (Next.js restricts them to Server Actions/Route Handlers) — redirect to the one Route
         * Handler legally allowed to clear the cookie instead of destroying it here (ADR tech/0026).
         */
        redirect(ROUTE.FORCE_SIGN_OUT);
    },
});
