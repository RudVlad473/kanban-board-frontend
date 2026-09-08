// Covered by: `src/features/boards/board-id.unit.test.ts`

// comment-length-exempt: records the backend constant this mirrors and the sampling bias a bare modulo would introduce — both are facts a reader cannot recover from the code (docs/adr/tech/0023)
/**
 * The board-id format the backend accepts, mirroring `ValidationConstants.BOARD_ID_PATTERN`
 * verbatim — `@BoardId` refuses anything else, hyphens and uppercase included, so a
 * `crypto.randomUUID()` is answered 400.
 *
 * Declared here beside `mintBoardId` rather than in `schemas.ts` so the mint and the check are one
 * declaration and cannot drift. 13 is `Long.toString(Long.MAX_VALUE, 36).length()`.
 */
export const BOARD_ID_PATTERN = /^[0-9a-z]{1,13}$/;

const BOARD_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const BOARD_ID_LENGTH = 13;

/*
 * The largest multiple of 36 below 256. A byte at or above it is discarded rather than folded,
 * because a bare `% 36` over raw bytes makes the first four symbols measurably likelier.
 */
const REJECTION_CEILING = 252;

/**
 * Mint a board id the backend will accept, before the create is issued.
 *
 * That ordering is the whole point: the sidebar's optimistic row is staged under this id, so it is
 * already the board's final id rather than a placeholder something has to swap later.
 */
export const mintBoardId = (): string => {
    const symbols: string[] = [];

    while (symbols.length < BOARD_ID_LENGTH) {
        for (const byte of crypto.getRandomValues(new Uint8Array(BOARD_ID_LENGTH))) {
            if (byte < REJECTION_CEILING && symbols.length < BOARD_ID_LENGTH) {
                symbols.push(BOARD_ID_ALPHABET[byte % BOARD_ID_ALPHABET.length]);
            }
        }
    }

    return symbols.join("");
};
