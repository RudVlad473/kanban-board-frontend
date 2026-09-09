// Covered by: `src/features/boards/board-id.unit.test.ts`
import { Snowflake } from "@sapphire/snowflake";

// comment-length-exempt: records the backend constant this mirrors and why 13 is the ceiling — both facts a reader cannot recover from the code (docs/adr/tech/0023)
/**
 * The board-id format the backend accepts, mirroring `ValidationConstants.BOARD_ID_PATTERN`
 * verbatim — `@BoardId` refuses anything else, hyphens and uppercase included, so a
 * `crypto.randomUUID()` is answered 400.
 *
 * Declared here beside `mintBoardId` rather than in `schemas.ts` so the mint and the check are one
 * declaration and cannot drift. 13 is `Long.toString(Long.MAX_VALUE, 36).length()`.
 */
export const BOARD_ID_PATTERN = /^[0-9a-z]{1,13}$/;

// comment-length-exempt: an empirically derived constant with the measurement that produced it and what would falsify it — nothing upstream documents this value
/*
 * Decisions ─────────────────────────────────────────────────────────────────────────────────────
 * The backend's OWN snowflake epoch, 2018-01-01T00:00:00.000Z, recovered by measurement rather
 * than read from a spec: four boards seeded against the real nonprod backend on 2026-09-08 came
 * back as base36 Longs whose `value >> 22n` differences matched their `createdAt` differences to
 * the millisecond, exactly (10896 vs 10896). That fixes both the 22-bit shift and this epoch.
 *
 * It matters because a board id is minted HERE and accepted verbatim upstream, so client-minted
 * and server-minted ids share one number line. Same epoch → both sort by age and both decode to a
 * real creation time. A different epoch would still be a valid id and would still be accepted; it
 * would silently sort wrong, which is the failure this constant exists to prevent.
 *
 * Falsified by: minting an id, reading the board back, and finding `createdAt` more than a second
 * away from `timestampFrom` of that id.
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 */
const BACKEND_EPOCH = 1_514_764_800_000;

const snowflake = new Snowflake(BACKEND_EPOCH);

const BOARD_ID_RADIX = 36;

/**
 * Mint a board id the backend will accept, before the create is issued.
 *
 * That ordering is the whole point: the sidebar's optimistic row is staged under this id, so it is
 * already the board's final id rather than a placeholder something has to swap later.
 */
export const mintBoardId = (): string => snowflake.generate().toString(BOARD_ID_RADIX);

/**
 * Read the creation time out of a board id, or `null` when the id predates snowflake minting.
 *
 * A pre-snowflake id was 13 random base36 symbols, so it decodes to a timestamp far in the future —
 * refused here rather than trusted, which is what keeps it out of the ordering it would head.
 */
export const boardIdMintedAt = (boardId: string): number | null => {
    if (!BOARD_ID_PATTERN.test(boardId)) {
        return null;
    }

    /* `BigInt(36)`, not `36n`: this project targets ES2017, where a bigint literal is a syntax error. */
    const radix = BigInt(BOARD_ID_RADIX);
    let value = BigInt(0);

    for (const symbol of boardId) {
        value = value * radix + BigInt(parseInt(symbol, BOARD_ID_RADIX));
    }

    const mintedAt = snowflake.timestampFrom(value);

    return mintedAt <= Date.now() && mintedAt >= BACKEND_EPOCH ? mintedAt : null;
};
