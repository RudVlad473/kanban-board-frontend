import { describe, expect, it } from "vitest";

import { isTheme, THEME } from "./theme";

describe("THEME", () => {
    it("carries the backend contract's wire-format values", () => {
        expect(THEME.LIGHT).toBe("LIGHT");
        expect(THEME.DARK).toBe("DARK");
    });
});

describe("isTheme", () => {
    it("accepts both THEME members", () => {
        expect(isTheme(THEME.LIGHT)).toBe(true);
        expect(isTheme(THEME.DARK)).toBe(true);
    });

    it("rejects undefined, empty string, lowercase, and arbitrary strings", () => {
        expect(isTheme(undefined)).toBe(false);
        expect(isTheme("")).toBe(false);
        expect(isTheme("dark")).toBe(false);
        expect(isTheme("PURPLE")).toBe(false);
    });
});
