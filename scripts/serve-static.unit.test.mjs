import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { resolveWithinRoot } from "./serve-static.mjs";

// Repository root: `package.json` (a real file) sits one level up from this file's parent dir.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("resolveWithinRoot", () => {
    it("returns the joined path inside root for a top-level file", () => {
        expect(resolveWithinRoot({ root, pathname: "/index.html" })).toBe(path.join(root, "index.html"));
    });

    it("returns the joined path inside root for a nested file", () => {
        expect(resolveWithinRoot({ root, pathname: "/assets/nested/app.js" })).toBe(
            path.join(root, "assets/nested/app.js"),
        );
    });

    it("refuses a simple `../` escape", () => {
        expect(resolveWithinRoot({ root, pathname: "/../package.json" })).toBeNull();
    });

    it("refuses an encoded `..` escape (decoded after the check would otherwise pass before decoding)", () => {
        expect(resolveWithinRoot({ root, pathname: "/..%2fpackage.json" })).toBeNull();
    });

    it("refuses a deeper `../../` escape", () => {
        expect(resolveWithinRoot({ root, pathname: "/a/../../package.json" })).toBeNull();
    });

    it("returns root itself for the root path, so directory-index resolution still fires", () => {
        expect(resolveWithinRoot({ root, pathname: "/" })).toBe(root);
    });

    it("refuses a sibling directory whose name merely starts with root's name", () => {
        const siblingPathname = `/../${path.basename(root)}-other/secret.txt`;

        expect(resolveWithinRoot({ root, pathname: siblingPathname })).toBeNull();
    });

    it("refuses a malformed percent-escape instead of throwing", () => {
        expect(resolveWithinRoot({ root, pathname: "/%E0%A4%A" })).toBeNull();
    });
});
