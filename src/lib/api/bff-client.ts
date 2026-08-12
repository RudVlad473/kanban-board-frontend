import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/bff-generated-types";

/*
 * Typed client for this app's OWN BFF routes (app/api/**\/route.ts) — the browser-safe
 * counterpart to server-client.ts's `externalApi`, which is marked `server-only` and targets the
 * external contract instead. No baseUrl: same-origin, relative paths resolve against wherever
 * this app is served from.
 */
export const bffApi = createClient<paths>({ credentials: "same-origin" });
