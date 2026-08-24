#!/usr/bin/env node
/*
 * D-22: mechanises CONVENTIONS.md PC-05's "at most 1-3 lines" comment-prose rule, previously
 * enforced only by code review. See docs/adr/tech/0023 for the full rationale.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const MAX_PROSE_LINES = 3;

const DEFAULT_GLOBS = [
    "app/**/*.{ts,tsx}",
    "src/**/*.{ts,tsx}",
    "e2e/**/*.ts",
    "visual/**/*.ts",
    "tokens/**/*.ts",
    "scripts/**/*.mjs",
    ".storybook/**/*.{ts,tsx}",
    "*.config.{ts,mjs}",
    "*.setup.{ts,mjs}",
    "proxy.ts",
];

const IGNORED_FILES = new Set(
    ["src/lib/core/api-contract/generated-types.ts", "src/styles/tokens.css"].map((relativePath) =>
        path.resolve(repoRoot, relativePath),
    ),
);

const IGNORED_DIR_PREFIXES = ["node_modules", ".next", "storybook-static"];

const EXEMPT_MARKER = "comment-length-exempt:";

const isIgnoredPath = (relativePath) =>
    IGNORED_FILES.has(path.resolve(repoRoot, relativePath)) ||
    IGNORED_DIR_PREFIXES.some(
        (prefix) => relativePath.startsWith(`${prefix}/`) || relativePath.startsWith(`${prefix}\\`),
    );

/*
 * Strips one leading comment delimiter (longest match first) and trims; a bare delimiter/spacer
 * line reduces to "" here, which is exactly how callers distinguish it from real prose.
 */
const stripDelimiter = (trimmed) => {
    if (trimmed.startsWith("/**")) return trimmed.slice(3).trim();
    if (trimmed.startsWith("/*")) return trimmed.slice(2).trim();
    if (trimmed.startsWith("*/")) return trimmed.slice(2).trim();
    if (trimmed.startsWith("*")) return trimmed.slice(1).trim();
    if (trimmed.startsWith("//")) return trimmed.slice(2).trim();
    return trimmed;
};

export const findLongCommentRuns = ({ source, max }) => {
    const lines = source.split("\n");
    const violations = [];

    let blockStart = null;
    let proseCount = 0;
    let blockExempt = false;
    let pendingExemptLine = null;

    const closeBlock = () => {
        if (blockStart !== null && proseCount > max && !blockExempt) {
            violations.push({ startLine: blockStart, length: proseCount });
        }
        blockStart = null;
        proseCount = 0;
        blockExempt = false;
    };

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();
        const isCommentLine = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");

        if (!isCommentLine) {
            closeBlock();
            return;
        }

        const stripped = stripDelimiter(trimmed);

        /*
         * A marker line is a boundary, not prose: it closes whatever came before and, if it sits
         * directly above the next comment block, exempts that block instead of merging into it.
         */
        if (stripped.includes(EXEMPT_MARKER)) {
            closeBlock();
            pendingExemptLine = lineNumber;
            return;
        }

        if (blockStart === null) {
            blockStart = lineNumber;
            blockExempt = pendingExemptLine === lineNumber - 1;
        }

        if (stripped !== "") {
            proseCount += 1;
        }
    });

    closeBlock();

    return violations;
};

const expandArgToGlobs = (arg) => {
    const absolute = path.resolve(repoRoot, arg);
    try {
        if (statSync(absolute).isDirectory()) {
            return [`${arg.replace(/[/\\]$/, "")}/**/*.{ts,tsx,mjs}`];
        }
    } catch {
        // Not a real path on disk — treat the argument as a glob pattern, unchanged.
    }
    return [arg];
};

const resolveGlobs = (cliArgs) => (cliArgs.length > 0 ? cliArgs.flatMap(expandArgToGlobs) : DEFAULT_GLOBS);

const scanFile = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findLongCommentRuns({ source, max: MAX_PROSE_LINES }).map((violation) => ({
        ...violation,
        relativePath,
    }));
};

const runCli = () => {
    const cliArgs = process.argv.slice(2);
    const globs = resolveGlobs(cliArgs);
    const files = globRealFiles({ patterns: globs, cwd: repoRoot });

    const violations = files
        .filter((relativePath) => !isIgnoredPath(relativePath))
        .flatMap(scanFile)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.startLine - b.startLine);

    if (violations.length > 0) {
        console.error("comments:check failed\n");
        for (const violation of violations) {
            console.error(
                `${violation.relativePath}:${violation.startLine}: ${violation.length} prose lines (max ${MAX_PROSE_LINES})`,
            );
        }
        console.error(
            "\nCompress the rationale to one sentence and move the detail to the relevant ADR/CONTEXT.md/SUMMARY.md, referenced by a short pointer (CONVENTIONS.md PC-05).",
        );
        process.exit(1);
    }

    console.log(`comments:check passed — no comment block exceeds ${MAX_PROSE_LINES} prose lines.`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
