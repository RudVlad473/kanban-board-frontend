import { describe, expect, it } from "vitest";

import {
    DECODER_SOURCE,
    parseCols,
    parseDuration,
    parseName,
    parseRect,
    parseViewport,
    UsageError,
} from "./filmstrip.mjs";

const viewport = { width: 1440, height: 900 };

describe("parseName", () => {
    it("accepts a plain slug", () => {
        expect(parseName("v13-fixed")).toBe("v13-fixed");
    });

    /*
     * The name reaches a recursive `force: true` delete, and that delete runs BEFORE the browser
     * launches — so an unreachable --url did not stop `--name ../src` destroying the source tree.
     */
    it("refuses a `../` escape", () => {
        expect(() => parseName("../src")).toThrow(UsageError);
    });

    it("refuses an escape buried mid-path", () => {
        expect(() => parseName("runs/../../etc")).toThrow(UsageError);
    });

    it("refuses a path separator", () => {
        expect(() => parseName("a/b")).toThrow(UsageError);
    });

    it("refuses `..` alone", () => {
        expect(() => parseName("..")).toThrow(UsageError);
    });

    it("refuses a missing name", () => {
        expect(() => parseName(undefined)).toThrow(UsageError);
    });
});

describe("parseRect", () => {
    it("accepts a rect inside the viewport", () => {
        expect(parseRect({ value: "1040,0,400,900", viewport })).toEqual({ x: 1040, y: 0, w: 400, h: 900 });
    });

    /*
     * `getImageData` pads out-of-bounds area with transparent black instead of throwing, and that
     * padding never changes between frames — so an overhanging rect reported `inside moved 0.00%`
     * on an animation that ran perfectly.
     */
    it("refuses a rect that overhangs the viewport", () => {
        expect(() => parseRect({ value: "1200,700,900,900", viewport })).toThrow(/outside the 1440x900 viewport/);
    });

    it("refuses a negative origin", () => {
        expect(() => parseRect({ value: "-100,-100,400,900", viewport })).toThrow(UsageError);
    });

    it("refuses a zero-width rect, which used to fail as an IndexSizeError inside the decoder", () => {
        expect(() => parseRect({ value: "1040,0,0,900", viewport })).toThrow(/positive width and height/);
    });

    it("refuses the wrong number of components", () => {
        expect(() => parseRect({ value: "1,2,3", viewport })).toThrow(UsageError);
    });
});

describe("parseDuration", () => {
    it("returns the fallback when absent", () => {
        expect(parseDuration({ value: undefined, fallback: 700, flag: "settle" })).toBe(700);
    });

    /*
     * `Number("900ms")` is NaN and `waitForTimeout(NaN)` silently becomes 1ms, so the wait the
     * flag names vanished while the run still looked successful.
     */
    it("refuses a unit suffix rather than silently waiting 1ms", () => {
        expect(() => parseDuration({ value: "900ms", fallback: 700, flag: "settle" })).toThrow(/milliseconds/);
    });

    it("refuses a negative duration", () => {
        expect(() => parseDuration({ value: "-1", fallback: 700, flag: "capture" })).toThrow(UsageError);
    });
});

describe("parseViewport", () => {
    it("parses WxH", () => {
        expect(parseViewport("800x600")).toEqual({ width: 800, height: 600 });
    });

    it("refuses a missing height", () => {
        expect(() => parseViewport("1440")).toThrow(UsageError);
    });

    it("refuses a non-numeric size", () => {
        expect(() => parseViewport("big")).toThrow(UsageError);
    });
});

describe("parseCols", () => {
    it("accepts a positive count", () => {
        expect(parseCols("8")).toBe(8);
    });

    /*
     * `Math.ceil(n / 0)` is Infinity, which surfaced as "Failed to construct 'OffscreenCanvas':
     * Value is infinite" at an anonymous line that exists in no file on disk.
     */
    it("refuses zero", () => {
        expect(() => parseCols("0")).toThrow(UsageError);
    });
});

/*
 * The decoder is browser code carried as a string, so `node --check`, eslint and prettier all pass
 * on a version that cannot parse — two deliberately injected defects left every gate green. `new
 * Function` parses without executing, which catches that class here instead of at runtime.
 */
describe("DECODER_SOURCE", () => {
    it("parses as JavaScript", () => {
        expect(() => new Function(DECODER_SOURCE)).not.toThrow();
    });

    it("defines both entry points the Node side calls", () => {
        expect(DECODER_SOURCE).toContain("window.__addFrame =");
        expect(DECODER_SOURCE).toContain("window.__tile =");
    });
});
