import { describe, expect, it } from "vitest";

import { BOARD_ID_PATTERN, mintBoardId } from "@/features/boards/board-id";

const DRAW_COUNT = 10_000;

describe("mintBoardId", () => {
    it("mints 13 characters drawn only from [0-9a-z], which is what the backend accepts", () => {
        // Act
        const id = mintBoardId();

        // Assert
        expect(id).toHaveLength(13);
        expect(id).toMatch(BOARD_ID_PATTERN);
    });

    /* Every draw, not a sampled one: a rejection-sampling bug shows up as one stray symbol, rarely. */
    it("never emits a character outside the alphabet across many draws", () => {
        // Act
        const ids = Array.from({ length: DRAW_COUNT }, () => mintBoardId());

        // Assert
        expect(ids.filter((id) => !BOARD_ID_PATTERN.test(id))).toEqual([]);
    });

    /*
     * A collision is what the backend answers 409 to, and each attempt mints independently — so a
     * repeat inside one run of 10k means the entropy is not what 36^13 claims.
     */
    it("yields a distinct value on every draw", () => {
        // Act
        const ids = Array.from({ length: DRAW_COUNT }, () => mintBoardId());

        // Assert
        expect(new Set(ids).size).toBe(DRAW_COUNT);
    });

    /*
     * The rejection ceiling's own effect: folding raw bytes with `% 36` would make the first four
     * symbols land ~1.14x more often, so an even spread across the alphabet is the observable claim.
     */
    it("spreads symbols across the whole alphabet rather than favouring the first four", () => {
        // Arrange
        const counts = new Map<string, number>();

        // Act
        for (const id of Array.from({ length: DRAW_COUNT }, () => mintBoardId())) {
            for (const symbol of id) {
                counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
            }
        }

        // Assert — 36 symbols over 130k draws; a 25% band is far wider than sampling noise.
        const expected = (DRAW_COUNT * 13) / 36;
        expect(counts.size).toBe(36);
        expect([...counts.values()].filter((count) => Math.abs(count - expected) > expected * 0.25)).toEqual([]);
    });
});
