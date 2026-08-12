import { setupWorker } from "msw/browser";

import { handlers } from "@/lib/mocks/handlers";

/**
 * Browser-side MSW worker for Storybook and Vitest Browser Mode test runs — distinct from
 * `node-server.ts`, which is what actually stands in for the backend in the deployed app
 * (Pitfall 3, 01-RESEARCH.md: the browser worker alone does nothing for the BFF's own
 * server-side calls).
 */
export const worker = setupWorker(...handlers);
