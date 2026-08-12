import "server-only";

import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/generated-types";

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
 * The only client instance that targets the external API contract (Pattern 1, 01-RESEARCH.md).
 * Importing `server-only` above makes any client component that imports this module fail the
 * build, mechanically enforcing CONVENTIONS.md's BFF-only auth rule instead of relying on code
 * review alone.
 */
export const externalApi = createClient<paths>({ baseUrl: readExternalApiBaseUrl() });
