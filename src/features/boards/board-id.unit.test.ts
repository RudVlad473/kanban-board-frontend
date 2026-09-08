import { describe, expect, it } from "vitest";

import { boardIdMintedAt, BOARD_ID_PATTERN, mintBoardId } from "@/features/boards/board-id";

const DRAW_COUNT = 10_000;

/*
 * Real ids from the nonprod backend with the `createdAt` it returned for each, captured 2026-09-08.
 * They are what pins the epoch: nothing else in the repo states it, and a wrong one still mints
 * ids the backend accepts.
 */
const BACKEND_MINTED = [
    { id: "8qh29ckdqpds", createdAt: "2026-09-08T18:02:09.631254Z" },
    { id: "8qh29jpgaigw", createdAt: "2026-09-08T18:02:13.337956Z" },
    { id: "8qh29qhov3ls", createdAt: "2026-09-08T18:02:16.858560Z" },
    { id: "8qh29xk70nwg", createdAt: "2026-09-08T18:02:20.527595Z" },
];

describe("mintBoardId", () => {
    it("mints a value the backend's own id pattern accepts", () => {
        // Act
        const id = mintBoardId();

        // Assert
        expect(id).toMatch(BOARD_ID_PATTERN);
    });

    /* Every draw, not a sampled one: an id one symbol too long is answered 400, and would be rare. */
    it("never exceeds the 13-symbol ceiling across many draws", () => {
        // Act
        const ids = Array.from({ length: DRAW_COUNT }, () => mintBoardId());

        // Assert
        expect(ids.filter((id) => !BOARD_ID_PATTERN.test(id))).toEqual([]);
    });

    /* A collision is what the backend answers 409 to, and the increment field is what prevents it. */
    it("yields a distinct value on every draw", () => {
        // Act
        const ids = Array.from({ length: DRAW_COUNT }, () => mintBoardId());

        // Assert
        expect(new Set(ids).size).toBe(DRAW_COUNT);
    });

    /*
     * The ordering property the sidebar's newest-first list rests on — the old random mint had no
     * such guarantee, and this is the one claim that distinguishes the two.
     */
    it("mints ascending values, so a later board decodes as newer", () => {
        // Arrange
        const ids = Array.from({ length: 1000 }, () => mintBoardId());

        // Act
        const timestamps = ids.map((id) => boardIdMintedAt(id) ?? Number.NaN);

        // Assert
        expect(timestamps.filter((value, index) => index > 0 && value < timestamps[index - 1])).toEqual([]);
    });

    it("stamps the current time, decodable straight back out", () => {
        // Act
        const mintedAt = boardIdMintedAt(mintBoardId()) ?? Number.NaN;

        // Assert
        expect(Math.abs(mintedAt - Date.now())).toBeLessThan(1000);
    });
});

describe("boardIdMintedAt", () => {
    /* The epoch claim itself: a wrong constant shifts every one of these by a fixed offset. */
    it.each(BACKEND_MINTED)("decodes $id to the createdAt the backend reported", ({ id, createdAt }) => {
        // Act
        const mintedAt = boardIdMintedAt(id);

        // Assert — the snowflake carries whole milliseconds, `createdAt` carries microseconds.
        expect(mintedAt).toBe(Math.floor(Date.parse(createdAt)));
    });

    /*
     * The pre-snowflake mint drew 13 random base36 symbols, so it produced values up to 36^13 —
     * hundreds of millions of years past the epoch. Ordering them as if they were timestamps would
     * put every legacy board above every real one, which is the failure this branch prevents.
     */
    it("refuses a legacy random id rather than reading it as a far-future timestamp", () => {
        // Assert
        expect(boardIdMintedAt("zzzzzzzzzzzzz")).toBeNull();
    });

    it("refuses a value the backend's id pattern would refuse", () => {
        // Assert
        expect(boardIdMintedAt("NOT-AN-ID")).toBeNull();
    });
});
