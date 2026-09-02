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
        const failed = await createChildrenSerially({
            values: ["first", "second", "third"],
            valueSchema: nonEmpty,
            createChild: async (value) => {
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
        expect(failed).toEqual([]);
    });

    it("keeps going after a refusal and reports only the refused value", async () => {
        // Arrange
        const attempted: string[] = [];

        // Act
        const failed = await createChildrenSerially({
            values: ["kept", "refused", "also kept"],
            valueSchema: nonEmpty,
            createChild: (value) => {
                attempted.push(value);
                return Promise.resolve(value === "refused" ? { error: { message: "nope" } } : {});
            },
        });

        // Assert
        expect(attempted).toEqual(["kept", "refused", "also kept"]);
        expect(failed).toEqual(["refused"]);
    });

    it("reports a value its schema rejects as failed without calling the backend for it", async () => {
        // Arrange
        const attempted: string[] = [];

        // Act
        const failed = await createChildrenSerially({
            values: ["valid", "", "also valid"],
            valueSchema: nonEmpty,
            createChild: (value) => {
                attempted.push(value);
                return Promise.resolve({});
            },
        });

        // Assert
        expect(attempted).toEqual(["valid", "also valid"]);
        expect(failed).toEqual([""]);
    });

    it("reports the value as given, not as its schema parsed it", async () => {
        // Act
        const failed = await createChildrenSerially({
            values: ["  padded  "],
            valueSchema: z.string().trim(),
            createChild: (value) => Promise.resolve(value === "padded" ? { error: { message: "nope" } } : {}),
        });

        // Assert
        expect(failed).toEqual(["  padded  "]);
    });
});
