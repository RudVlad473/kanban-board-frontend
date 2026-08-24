#!/usr/bin/env node
/*
 * D-05: fails the build if any `*.stories.tsx` declares a story property named `play` —
 * interaction functions belong in the component's co-located `*.test.tsx` (docs/adr/tech/0025).
 * Mirrors scripts/check-no-route-handlers.mjs/check-comment-length.mjs's file-scanning shape.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/*
 * Line-anchored key-then-colon/paren pattern: allows leading whitespace, an optional `async`
 * prefix, and an optional quoted-key form — matches `play:`, `async play(`, `"play":`, but not
 * `displayName: "play"` or a `// play: ...` comment line.
 */
const PLAY_KEY_PATTERN = /^\s*(async\s+)?["']?play["']?\s*[:(]/;

export const findPlayFunctionViolations = ({ source }) => {
    const lines = source.split("\n");
    const violations = [];

    lines.forEach((line, index) => {
        if (PLAY_KEY_PATTERN.test(line)) {
            violations.push({ line: index + 1 });
        }
    });

    return violations;
};

const scanFile = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findPlayFunctionViolations({ source }).map((violation) => ({ ...violation, relativePath }));
};

const runCli = () => {
    const files = globRealFiles({
        patterns: ["src/**/*.stories.{ts,tsx}", "app/**/*.stories.{ts,tsx}"],
        cwd: repoRoot,
    });

    const violations = files
        .flatMap(scanFile)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

    if (violations.length > 0) {
        console.error(
            "stories:check failed — a story declares a `play` interaction function, banned by " +
                "docs/adr/tech/0025-direct-composed-story-rendering.md. Assert the interaction in the " +
                "component's co-located *.test.tsx by rendering the composed story directly, not inside the story.\n",
        );
        for (const violation of violations) {
            console.error(`  ${violation.relativePath}:${String(violation.line)}`);
        }
        process.exit(1);
    }

    console.log("stories:check passed — no *.stories.tsx declares a play interaction function.");
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
