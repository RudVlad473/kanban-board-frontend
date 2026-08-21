import { describe, expect, it } from "vitest";

import { isBoard, isBoardArray } from "./types";

const validBoard = { id: "board-1", name: "Platform Launch", version: 0 };

describe("isBoard", () => {
    it("accepts a well-formed board", () => {
        expect(isBoard(validBoard)).toBe(true);
    });

    it("rejects an object missing id", () => {
        const { id: _id, ...rest } = validBoard;
        expect(isBoard(rest)).toBe(false);
    });

    it("rejects an object missing name", () => {
        const { name: _name, ...rest } = validBoard;
        expect(isBoard(rest)).toBe(false);
    });

    it("rejects an object missing version", () => {
        const { version: _version, ...rest } = validBoard;
        expect(isBoard(rest)).toBe(false);
    });

    it("rejects an object whose version is a string", () => {
        expect(isBoard({ ...validBoard, version: "0" })).toBe(false);
    });

    it("rejects null and non-object values", () => {
        expect(isBoard(null)).toBe(false);
        expect(isBoard("board")).toBe(false);
        expect(isBoard(undefined)).toBe(false);
    });
});

describe("isBoardArray", () => {
    it("accepts an empty array", () => {
        expect(isBoardArray([])).toBe(true);
    });

    it("accepts an array of well-formed boards", () => {
        expect(isBoardArray([validBoard, { id: "board-2", name: "Marketing Plan", version: 1 }])).toBe(true);
    });

    it("rejects an array containing a malformed board", () => {
        expect(isBoardArray([validBoard, { id: "board-2", name: "Marketing Plan" }])).toBe(false);
    });

    it("rejects a non-array value", () => {
        expect(isBoardArray(validBoard)).toBe(false);
    });
});
