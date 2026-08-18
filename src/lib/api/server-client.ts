import "server-only";

import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/generated-types";
import { toUpstreamCookieHeader } from "@/lib/api/session-cookie";
import { verifySession } from "@/lib/dal";

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
 * GC-18's general session-bridging mechanism (T-01-48/T-01-50 threat register) — one module-scope
 * registration covering every caller of `externalApi`, present and future, rather than an
 * auth-shaped special case. Reads the current session through the data access layer's
 * `verifySession()` — never a second direct `session.verify()` call — per this project's
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
});
