import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createChildrenSerially } from "@/lib/core/api-contract/create-children-serially";

const nonEmpty = z.string().min(1);

describe("createChildrenSerially", () => {
    it("calls the backend once per value, in the order given, never overlapping two calls", async () => {
        // Arrange
        const started: string[] = [];
        let inFlight = 0;
        let peakInFlight = 0;

        // Act
        const { created, failedValues } = await createChildrenSerially({
            values: ["first", "second", "third"],
            valueSchema: nonEmpty,
            parseChild: (data) => data,
            createChild: async ({ value }) => {
                started.push(value);
                inFlight += 1;
                peakInFlight = Math.max(peakInFlight, inFlight);
                await new Promise((resolve) => setTimeout(resolve, 0));
                inFlight -= 1;
                return {};
            },
        });

        // Assert
        expect(started).toEqual(["first", "second", "third"]);
        expect(peakInFlight).toBe(1);
        expect(failedValues).toEqual([]);
        /* Rule 4: the caller writes these into the board entry, so they must come back in order. */
        expect(created).toHaveLength(3);
    });

    it("keeps going after a refusal and reports only the refused value", async () => {
        // Arrange
        const attempted: string[] = [];

        // Act
        const { failedValues } = await createChildrenSerially({
            values: ["kept", "refused", "also kept"],
            valueSchema: nonEmpty,
            parseChild: (data) => data,
            createChild: ({ value }) => {
                attempted.push(value);
                return Promise.resolve(value === "refused" ? { error: { message: "nope" } } : {});
            },
        });

        // Assert
        expect(attempted).toEqual(["kept", "refused", "also kept"]);
        expect(failedValues).toEqual(["refused"]);
    });

    it("reports a value its schema rejects as failed without calling the backend for it", async () => {
        // Arrange
        const attempted: string[] = [];

        // Act
        const { failedValues } = await createChildrenSerially({
            values: ["valid", "", "also valid"],
            valueSchema: nonEmpty,
            parseChild: (data) => data,
            createChild: ({ value }) => {
                attempted.push(value);
                return Promise.resolve({});
            },
        });

        // Assert
        expect(attempted).toEqual(["valid", "also valid"]);
        expect(failedValues).toEqual([""]);
    });

    it("reports the value as given, not as its schema parsed it", async () => {
        // Act
        const { failedValues } = await createChildrenSerially({
            values: ["  padded  "],
            valueSchema: z.string().trim(),
            parseChild: (data) => data,
            createChild: ({ value }) => Promise.resolve(value === "padded" ? { error: { message: "nope" } } : {}),
        });

        // Assert
        expect(failedValues).toEqual(["  padded  "]);
    });

    /* A body the caller cannot parse is reported as failed: nothing here can name what was written. */
    it("reports a child whose response body it cannot parse as failed", async () => {
        // Act
        const { created, failedValues } = await createChildrenSerially({
            values: ["parsed", "unparsable"],
            valueSchema: nonEmpty,
            parseChild: (data) => (data !== "unparsable" ? data : null),
            createChild: ({ value }) => Promise.resolve({ data: value }),
        });

        // Assert
        expect(created).toEqual(["parsed"]);
        expect(failedValues).toEqual(["unparsable"]);
    });
});

/*
 * The accumulator exists so a caller can derive a child's field from its siblings — a column's
 * colour from the ones already on the board. Serial execution is what makes it meaningful, and
 * without it every child after the first sees the caller's empty pre-call snapshot instead.
 */
describe("createChildrenSerially's createdSoFar accumulator", () => {
    it("hands each createChild the children already landed, in order", async () => {
        // Arrange
        const seen: number[] = [];

        // Act
        await createChildrenSerially<{ name: string }>({
            values: ["a", "b", "c"],
            valueSchema: z.string(),
            createChild: ({ value, createdSoFar }) => {
                seen.push(createdSoFar.length);
                return Promise.resolve({ data: { name: value } });
            },
            parseChild: (data) => data as { name: string },
        });

        // Assert
        expect(seen).toEqual([0, 1, 2]);
    });

    it("does not count a child that failed to land", async () => {
        // Arrange
        const seen: number[] = [];

        // Act
        await createChildrenSerially<{ name: string }>({
            values: ["a", "b", "c"],
            valueSchema: z.string(),
            createChild: ({ value, createdSoFar }) => {
                seen.push(createdSoFar.length);
                return Promise.resolve(value === "a" ? { error: { detail: "nope" } } : { data: { name: value } });
            },
            parseChild: (data) => data as { name: string },
        });

        // Assert — "a" never lands, so "b" and "c" still see 0 and 1.
        expect(seen).toEqual([0, 0, 1]);
    });
});
