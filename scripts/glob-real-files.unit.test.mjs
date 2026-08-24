import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { globRealFiles, isRealFile } from "./glob-real-files.mjs";

let cwd;

/*
 * Reproduces the layout Vitest Browser Mode leaves behind on a failed assertion: a *directory*
 * named exactly like the spec file it screenshotted, sitting next to real sources.
 */
beforeAll(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "glob-real-files-"));
    mkdirSync(path.join(cwd, "src/__screenshots__/widget.test.tsx"), { recursive: true });
    writeFileSync(path.join(cwd, "src/__screenshots__/widget.test.tsx/shot.png"), "");
    writeFileSync(path.join(cwd, "src/widget.tsx"), "export const Widget = () => null;\n");
});

afterAll(() => {
    rmSync(cwd, { recursive: true, force: true });
});

describe("globRealFiles", () => {
    it("excludes a directory whose name matches the glob but keeps real files", () => {
        expect(globRealFiles({ patterns: "src/**/*.tsx", cwd })).toEqual(["src/widget.tsx"]);
    });

    it("accepts several patterns at once and returns each match only once", () => {
        expect(globRealFiles({ patterns: ["src/**/*.tsx", "src/**/*.tsx"], cwd })).toEqual(["src/widget.tsx"]);
    });
});

describe("isRealFile", () => {
    it("is false for a directory and for a path that does not exist", () => {
        expect(isRealFile({ relativePath: "src/__screenshots__/widget.test.tsx", cwd })).toBe(false);
        expect(isRealFile({ relativePath: "src/nope.tsx", cwd })).toBe(false);
    });

    it("is true for a real file", () => {
        expect(isRealFile({ relativePath: "src/widget.tsx", cwd })).toBe(true);
    });
});
