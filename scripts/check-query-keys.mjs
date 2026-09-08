#!/usr/bin/env node
// comment-length-exempt: records why comments are blanked before matching and why e2e/ is excluded, both invisible from the pattern or glob alone
/*
 * GC-04-style gate for the query-key family: fails when a raw `["boards"]`/`["board", ...]`
 * literal reappears outside `query-keys.ts`. Comments are blanked before matching because nine
 * source files carry the singular key inside load-bearing prose (docs/adr/tech/0030) that a naive
 * line regex would flag. `e2e/**` is excluded from SEARCH_GLOBS: it holds no QueryClient, and
 * `e2e/seed.ts:52` builds a CLI argv array shaped exactly like a key.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const SEARCH_GLOBS = ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"];

const EXCLUDED_FILES = new Set(["src/lib/core/query-keys/query-keys.ts"].map((p) => path.resolve(repoRoot, p)));

const BOARD_KEY_LITERAL_PATTERN = /\[\s*["'](boards?)["']\s*[,\]]/;

/** Blanks `//` and `/* *\/` comment contents to spaces, preserving every newline for line numbers. */
const blankComments = (source) => {
    let result = "";
    let index = 0;

    while (index < source.length) {
        const twoChars = source.slice(index, index + 2);

        if (twoChars === "//") {
            const end = source.indexOf("\n", index);
            const stop = end === -1 ? source.length : end;
            result += " ".repeat(stop - index);
            index = stop;
            continue;
        }

        if (twoChars === "/*") {
            const end = source.indexOf("*/", index + 2);
            const stop = end === -1 ? source.length : end + 2;
            result += source
                .slice(index, stop)
                .split("")
                .map((char) => (char === "\n" ? "\n" : " "))
                .join("");
            index = stop;
            continue;
        }

        result += source[index];
        index += 1;
    }

    return result;
};

export const findQueryKeyViolations = ({ source }) => {
    const blanked = blankComments(source);
    const lines = blanked.split("\n");
    const violations = [];

    lines.forEach((line, index) => {
        if (BOARD_KEY_LITERAL_PATTERN.test(line)) {
            violations.push({ line: index + 1 });
        }
    });

    return violations;
};

const scanFile = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findQueryKeyViolations({ source }).map((violation) => ({ ...violation, relativePath }));
};

const runCli = () => {
    const files = globRealFiles({ patterns: SEARCH_GLOBS, cwd: repoRoot }).filter(
        (relativePath) => !EXCLUDED_FILES.has(path.resolve(repoRoot, relativePath)),
    );

    const violations = files
        .flatMap(scanFile)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

    if (violations.length > 0) {
        console.error("keys:check failed — a raw board query-key literal was found outside its declaration file:\n");
        for (const violation of violations) {
            console.error(`  ${violation.relativePath}:${String(violation.line)}`);
        }
        console.error(
            "\nImport QUERY_KEY from '@/lib/core/query-keys/query-keys' (or the relative equivalent) instead.",
        );
        process.exit(1);
    }

    console.log("keys:check passed — no board query-key literal found outside its declaration file.");
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
