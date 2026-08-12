import { setupServer } from "msw/node";

import { handlers } from "@/lib/mocks/handlers";

/**
 * Node-side MSW interception (Pattern 3, 01-RESEARCH.md) — started from `instrumentation.ts` at
 * server-process startup so the BFF's own outbound server-side calls are intercepted, not just
 * calls made from the browser.
 */
export const server = setupServer(...handlers);
