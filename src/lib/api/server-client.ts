import "server-only";

import { redirect } from "next/navigation";
import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/generated-types";
import { PROBLEM_CODE, parseProblemDetail } from "@/lib/api/problem-detail";
import { toUpstreamCookieHeader } from "@/lib/api/session-cookie";
import { verifySession } from "@/lib/dal";
import { ROUTE } from "@/lib/routes";
import { session } from "@/lib/session";

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
 * The two routes the backend serves without a session — sending a stale bridged credential on the
 * very request that is meant to mint a fresh one is both pointless and confusing to debug
 * (T-01-49). Matched against `schemaPath`, the original OpenAPI path template, not the resolved
 * URL.
 */
const UNAUTHENTICATED_SCHEMA_PATHS = new Set(["/signin", "/signup"]);

/**
 * The only client instance that targets the external API contract (Pattern 1, 01-RESEARCH.md).
 * Importing `server-only` above makes any client component that imports this module fail the
 * build, mechanically enforcing CONVENTIONS.md's BFF-only auth rule instead of relying on code
 * review alone.
 */
export const externalApi = createClient<paths>({ baseUrl: readExternalApiBaseUrl() });

/*
 * GC-18's general session-bridging mechanism (T-01-48/T-01-50/T-01-51/T-01-52 threat register) —
 * one module-scope registration covering every caller of `externalApi`, present and future,
 * rather than an auth-shaped special case. Reads the current session through the data access
 * layer's `verifySession()` — never a second direct `session.verify()` call — per this project's
 * established single-identity-source rule (DAL as the single source of identity).
 */
externalApi.use({
    onRequest: async ({ request, schemaPath }) => {
        if (UNAUTHENTICATED_SCHEMA_PATHS.has(schemaPath)) {
            return request;
        }

        const record = await verifySession();
        if (record) {
            request.headers.set("Cookie", toUpstreamCookieHeader(record.jsessionId));
        }

        return request;
    },
    onResponse: async ({ request, response }) => {
        /*
         * Only a refusal on a call this middleware itself bridged a credential onto is a candidate
         * for the forced sign-out (`01-32-PLAN.md`'s Task 2 behaviour: "on a call made with a
         * bridged credential") — an anonymous call made with no session in the first place (the
         * common case for an unauthenticated visitor) is expected to 401, and forcing a sign-out
         * over it would be a no-op at best and a surprising redirect at worst.
         */
        if (response.status !== 401 || !request.headers.has("Cookie")) {
            return response;
        }

        /*
         * Read a clone, not `response` itself — a consumed body would break every call site
         * downstream of this middleware (T-01-53). `.json()` rejecting (an empty or non-JSON
         * body) is caught and treated the same as a body that parsed but wasn't problem-shaped:
         * `parseProblemDetail(null)` returns `null`.
         */
        const clonedBody: unknown = await response
            .clone()
            .json()
            .catch(() => null);
        const problem = parseProblemDetail(clonedBody);

        /*
         * A failed sign-in attempt (wrong password) is a `BAD_CREDENTIALS` 401 — a wrong password
         * typed in one tab must never sign out a working session in another (T-01-51). Every other
         * 401 on an already-bridged call, including one whose body didn't parse at all, is treated
         * as the backend's own session having quietly expired (GC-18, T-01-52, `01-RESEARCH.md`
         * Finding 3) and forces a full sign-out — the same destination the route guard already
         * sends an unauthenticated visitor to.
         */
        if (problem?.code === PROBLEM_CODE.BAD_CREDENTIALS) {
            return response;
        }

        await session.destroy();
        redirect(ROUTE.SIGN_IN);
    },
});
