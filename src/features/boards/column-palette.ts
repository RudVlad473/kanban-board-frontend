import { isNil } from "es-toolkit";

import { toColumnAccentIndex, toColumnDotToken } from "@/features/boards/model";
import { deltaEOk } from "@/lib/core/styling/oklab";

/*
 * Entries 0-2 are the shipped `--color-accent-column-N` values, in `COLUMN_DOT_TOKENS` order — the
 * alignment `resolveRenderedColumnColor` needs. Entries 3-7 came from a farthest-point search over
 * the shipped OKLab band; every pair clears ΔE_ok 0.15 except the grandfathered pair at 0/2 (0.134).
 */
export const COLUMN_COLOR_PALETTE = [
    "#49C4E5",
    "#8471F2",
    "#67E2AE",
    "#EA6000",
    "#FF9FFC",
    "#729900",
    "#FFB700",
    "#D551A2",
] as const;

/** The narrow shape the picker needs — never the full `ColumnFull`, so this module has no schema dependency. */
type RenderableColumn = { id: string; color?: string | null };

/**
 * The colour a column actually RENDERS on its header dot — the stored colour when present, or the
 * id-derived fallback when it is null/absent. This is why a legacy neighbour cannot be collided
 * with: the picker below compares against what is on screen, never the raw stored value alone.
 */
export const resolveRenderedColumnColor = ({ id, color }: RenderableColumn): string =>
    color ?? COLUMN_COLOR_PALETTE[toColumnAccentIndex({ id })];

/*
 * Excludes the candidate's own occurrence in `used`: once every entry is rendered, a candidate is
 * always itself a member of `used`, and comparing it against itself is a zero that would poison
 * every candidate's minimum equally, collapsing "maximise the minimum" to an arbitrary tie.
 */
const minDistanceToUsed = ({ candidate, used }: { candidate: string; used: readonly string[] }): number =>
    Math.min(...used.filter((entry) => entry !== candidate).map((entry) => deltaEOk({ hexA: candidate, hexB: entry })));

/**
 * The first palette entry not already RENDERED on the board; when every entry is rendered at least
 * once, the entry maximising its minimum ΔE_ok against the rendered set, tied by palette order for
 * a deterministic result. An empty column list returns the first entry.
 */
export const pickNextColumnColor = ({
    columns,
}: {
    columns: RenderableColumn[];
}): (typeof COLUMN_COLOR_PALETTE)[number] => {
    const rendered = new Set(columns.map((column) => resolveRenderedColumnColor(column)));
    const firstUnused = COLUMN_COLOR_PALETTE.find((entry) => !rendered.has(entry));
    if (firstUnused !== undefined) {
        return firstUnused;
    }

    const used = [...rendered];

    return COLUMN_COLOR_PALETTE.reduce((best, candidate) =>
        minDistanceToUsed({ candidate, used }) > minDistanceToUsed({ candidate: best, used }) ? candidate : best,
    );
};

/** Exactly one of the two is ever set — the branch a header dot's `className`/`style` props read directly. */
export type ColumnDotProps = { className: string | undefined; style: { backgroundColor: string } | undefined };

/**
 * The id-derived accent CLASS for a null/absent stored colour, or an inline `backgroundColor` for
 * a stored one — a runtime hex can never be a Tailwind class. One branch, so the two render sites
 * (the header dot and the drag-overlay's copy of it) cannot drift apart on how they pick.
 */
export const toColumnDotProps = ({ id, color }: RenderableColumn): ColumnDotProps =>
    isNil(color)
        ? { className: toColumnDotToken({ id }), style: undefined }
        : { className: undefined, style: { backgroundColor: color } };
