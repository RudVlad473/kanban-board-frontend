/**
 * This domain's own runtime-verified shape — `BoardResponseDTO` (`generated-types.ts`) declares
 * every property optional because the contract's schema carries no `required` array, so casting an
 * upstream response straight to `Board` would be a lie the type checker can't catch. `isBoard`
 * exists to make that cast honest, the same reason `isSessionPayload` exists in `session.ts`.
 */
export type Board = { id: string; name: string; version: number };

/**
 * Runtime guard for an unverified value claiming to be a `Board` — property-by-property `typeof`
 * checks against an `unknown` value, in the style of `session.ts`'s `isSessionPayload`.
 */
export const isBoard = (value: unknown): value is Board => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.version === "number"
    );
};

/** Runtime guard for an unverified value claiming to be a `Board[]`. */
export const isBoardArray = (value: unknown): value is Board[] => Array.isArray(value) && value.every(isBoard);
