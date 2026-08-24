#!/usr/bin/env node
/*
 * D-01: fails the build if a Route Handler (any nested route.ts under app/) reappears — Route
 * Handlers are banned project-wide as a data-access mechanism (docs/adr/tech/0019). Mirrors
 * `scripts/check-routes.mjs`'s own structure.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/*
 * ADR tech/0026's one narrow, justified exception: cookie mutation forced from a non-Server-Action
 * server context has no legal answer under docs/adr/tech/0019's RSC-read/Server-Action-write
 * split, so this single Route Handler is allow-listed rather than reopening the ban itself.
 */
const ALLOWED_ROUTE_HANDLERS = new Set(["app/api/session/force-sign-out/route.ts"]);

const violations = globRealFiles({ patterns: "app/**/route.{ts,tsx,js,mjs}", cwd: repoRoot }).filter(
    (relativePath) => !ALLOWED_ROUTE_HANDLERS.has(relativePath.replaceAll("\\", "/")),
);

if (violations.length > 0) {
    console.error(
        "handlers:check failed — Route Handlers are banned as a data-access mechanism " +
            "(docs/adr/tech/0019). Use a React Server Component for reads or a Server Action for writes.\n",
    );
    for (const violation of violations) {
        console.error(`  ${violation}`);
    }
    process.exit(1);
}

console.log("handlers:check passed — no Route Handler found under app/.");
