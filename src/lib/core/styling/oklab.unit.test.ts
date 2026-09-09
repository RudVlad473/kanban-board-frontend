import { describe, expect, it } from "vitest";

import { deltaEOk, HEX_COLOR_PATTERN, toOklab } from "@/lib/core/styling/oklab";

describe("HEX_COLOR_PATTERN", () => {
    it("accepts a well-formed #RRGGBB hex colour in any letter case", () => {
        // Act & Assert
        expect(HEX_COLOR_PATTERN.test("#49C4E5")).toBe(true);
        expect(HEX_COLOR_PATTERN.test("#abcdef")).toBe(true);
        expect(HEX_COLOR_PATTERN.test("#AbCdEf")).toBe(true);
    });

    it("rejects a missing hash, a wrong length, non-hex characters, a non-hex format, and whitespace", () => {
        // Act & Assert
        expect(HEX_COLOR_PATTERN.test("49C4E5")).toBe(false);
        expect(HEX_COLOR_PATTERN.test("#49C4E")).toBe(false);
        expect(HEX_COLOR_PATTERN.test("#49C4E5F")).toBe(false);
        expect(HEX_COLOR_PATTERN.test("#GGGGGG")).toBe(false);
        expect(HEX_COLOR_PATTERN.test("rgb(73,196,229)")).toBe(false);
        expect(HEX_COLOR_PATTERN.test("#49C4E5 ")).toBe(false);
        expect(HEX_COLOR_PATTERN.test("")).toBe(false);
    });
});

/*
 * Reference values computed by hand against Bjorn Ottosson's published formula, not merely
 * re-asserting whatever the code happens to produce — the two transcription traps it invites (a
 * flat-gamma decode, or the XYZ-to-LMS matrix from the same article) would pass a self-referential test.
 */
describe("toOklab", () => {
    it("reproduces the reference l/c/h for the first shipped accent", () => {
        // Act
        const { l, c, h } = toOklab("#49C4E5");

        // Assert
        expect(l).toBeCloseTo(0.765, 3);
        expect(c).toBeCloseTo(0.116, 3);
        expect(h).toBeCloseTo(219, 0);
    });

    it("reproduces the reference l/c/h for the second shipped accent", () => {
        // Act
        const { l, c, h } = toOklab("#8471F2");

        // Assert
        expect(l).toBeCloseTo(0.63, 3);
        expect(c).toBeCloseTo(0.186, 3);
        expect(h).toBeCloseTo(287, 0);
    });

    it("reproduces the reference l/c/h for the third shipped accent", () => {
        // Act
        const { l, c, h } = toOklab("#67E2AE");

        // Assert
        expect(l).toBeCloseTo(0.829, 3);
        expect(c).toBeCloseTo(0.134, 3);
        expect(h).toBeCloseTo(163, 0);
    });

    it("converts a mixed-case hex identically to its uppercase form", () => {
        // Act & Assert
        expect(toOklab("#aBcDeF")).toEqual(toOklab("#ABCDEF"));
    });
});

describe("deltaEOk", () => {
    it("reproduces the reference distance for each shipped pair", () => {
        // Act & Assert
        expect(deltaEOk({ hexA: "#49C4E5", hexB: "#8471F2" })).toBeCloseTo(0.224, 3);
        expect(deltaEOk({ hexA: "#49C4E5", hexB: "#67E2AE" })).toBeCloseTo(0.134, 3);
        expect(deltaEOk({ hexA: "#8471F2", hexB: "#67E2AE" })).toBeCloseTo(0.346, 3);
    });

    it("is symmetric", () => {
        // Act & Assert
        expect(deltaEOk({ hexA: "#49C4E5", hexB: "#8471F2" })).toBeCloseTo(
            deltaEOk({ hexA: "#8471F2", hexB: "#49C4E5" }),
            10,
        );
    });

    it("is zero for a colour against itself", () => {
        // Act & Assert
        expect(deltaEOk({ hexA: "#49C4E5", hexB: "#49C4E5" })).toBe(0);
    });
});
