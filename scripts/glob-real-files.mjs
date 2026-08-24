import { globSync, statSync } from "node:fs";
import path from "node:path";

/*
 * Playwright's toHaveScreenshot() and Vitest Browser Mode's failure screenshots both create a
 * same-named *directory* per spec file (e.g. `__screenshots__/text-field.test.tsx/`), which a
 * naive `**\/*.tsx` glob still matches — reading one throws EISDIR (docs/adr/tech/0023).
 */
export const isRealFile = ({ relativePath, cwd }) => {
    try {
        return statSync(path.resolve(cwd, relativePath)).isFile();
    } catch {
        return false;
    }
};

/*
 * The one entry point every `scripts/check-*.mjs` globs through, so a directory shaped like a
 * source file can never reach a `readFileSync` (or be reported as a violation) again.
 */
export const globRealFiles = ({ patterns, cwd }) => {
    const matches = new Set([patterns].flat().flatMap((pattern) => globSync(pattern, { cwd })));

    return [...matches].filter((relativePath) => isRealFile({ relativePath, cwd }));
};
