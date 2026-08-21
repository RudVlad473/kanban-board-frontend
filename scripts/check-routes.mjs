#!/usr/bin/env node
/*
 * GC-04: fails the build if a hardcoded application-path or external-API-path literal reappears
 * outside its one declaration file (`ROUTE` / `EXTERNAL_PATH`). See docs/adr/tech/0005 (typed
 * OpenAPI client) and docs/adr/tech/0012 (const-object-as-const declaration pattern) for the why.
 */
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const ROUTE_PATH_PATTERN = /"\/(login|register|boards)"/g;
const EXTERNAL_PATH_PATTERN = /"\/(signin|signup|signout|users\/me\/theme|admin\/reset)"/g;

const EXCLUDED_FILES = new Set(
    [
        "src/lib/core/routing/routes.ts",
        "src/lib/core/api-contract/generated-types.ts",
        "src/lib/core/api-contract/external-paths.ts",
    ].map((p) => path.resolve(repoRoot, p)),
);

const SEARCH_GLOBS = ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}"];

const files = new Set(SEARCH_GLOBS.flatMap((pattern) => globSync(pattern, { cwd: repoRoot })));
files.add("proxy.ts");

const violations = [];

for (const relativePath of files) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    if (EXCLUDED_FILES.has(absolutePath)) {
        continue;
    }

    const contents = readFileSync(absolutePath, "utf8");
    const lines = contents.split("\n");

    lines.forEach((line, index) => {
        ROUTE_PATH_PATTERN.lastIndex = 0;
        if (ROUTE_PATH_PATTERN.test(line)) {
            violations.push(
                `${relativePath}:${String(index + 1)}: ${line.trim()} (belongs in ROUTE, src/lib/core/routing/routes.ts)`,
            );
        }

        EXTERNAL_PATH_PATTERN.lastIndex = 0;
        if (EXTERNAL_PATH_PATTERN.test(line)) {
            violations.push(
                `${relativePath}:${String(index + 1)}: ${line.trim()} (belongs in EXTERNAL_PATH, src/lib/core/api-contract/external-paths.ts)`,
            );
        }
    });
}

if (violations.length > 0) {
    console.error("routes:check failed — hardcoded path literal(s) found outside their declaration file:\n");
    for (const violation of violations) {
        console.error(`  ${violation}`);
    }
    console.error(
        "\nImport ROUTE from '@/lib/core/routing/routes' or EXTERNAL_PATH from " +
            "'@/lib/core/api-contract/external-paths' (or the relative equivalent) instead.",
    );
    process.exit(1);
}

console.log(
    "routes:check passed — no application-path or external-API-path literal found outside its declaration file.",
);
