import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COLUMN_DOT_TOKENS } from "@/features/boards/model";
import { deltaEOk, HEX_COLOR_PATTERN } from "@/lib/core/styling/oklab";

import { COLUMN_COLOR_PALETTE, pickNextColumnColor, resolveRenderedColumnColor } from "./column-palette";

/*
 * The three ids the shipped stories already stage per accent bucket (column-header.stories.tsx),
 * reused here so this suite proves the collision defect against ids known to land on a specific
 * bucket rather than trusting an arbitrary one.
 */
const FIRST_ACCENT_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_ACCENT_ID = "00000000-0000-4000-8000-000000000002";

describe("COLUMN_COLOR_PALETTE", () => {
    /*
     * hard_constraint 6: the mock's own shipped pair (indices 0/2) is grandfathered at exactly its
     * measured 0.134, so a change to either shipped accent fails loudly instead of widening the
     * exemption. Every other pair must clear the 0.15 floor.
     */
    it("keeps every pair at least ΔE_ok 0.15 apart, except the grandfathered shipped pair", () => {
        for (let i = 0; i < COLUMN_COLOR_PALETTE.length; i += 1) {
            for (let j = i + 1; j < COLUMN_COLOR_PALETTE.length; j += 1) {
                const distance = deltaEOk({ hexA: COLUMN_COLOR_PALETTE[i], hexB: COLUMN_COLOR_PALETTE[j] });

                if (i === 0 && j === 2) {
                    expect(distance).toBeCloseTo(0.134, 3);
                } else {
                    expect(distance).toBeGreaterThanOrEqual(0.15);
                }
            }
        }
    });

    it("carries only well-formed hex entries", () => {
        COLUMN_COLOR_PALETTE.forEach((entry) => {
            expect(HEX_COLOR_PATTERN.test(entry)).toBe(true);
        });
    });

    it("has no duplicate entries", () => {
        expect(new Set(COLUMN_COLOR_PALETTE).size).toBe(COLUMN_COLOR_PALETTE.length);
    });

    /* Asserted as a literal so a silent addition or removal to the shipped set is caught. */
    it("ships exactly 6 entries", () => {
        expect(COLUMN_COLOR_PALETTE.length).toBe(6);
    });

    /*
     * DRIFT: the first three entries are the three `--color-accent-column-N` tokens, parsed
     * straight out of the generated stylesheet rather than restated by hand, so a token change not
     * mirrored here fails a test instead of silently desynchronising the fallback hue.
     */
    it("keeps its first three entries identical to the shipped accent tokens, in COLUMN_DOT_TOKENS order", () => {
        const tokensCss = readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf-8");
        const shippedAccents = COLUMN_DOT_TOKENS.map((_, index) => {
            const match = new RegExp(`--color-accent-column-${String(index + 1)}:\\s*(#[0-9a-fA-F]{6});`).exec(
                tokensCss,
            );
            if (match === null) {
                throw new Error(`tokens.css has no --color-accent-column-${String(index + 1)} declaration`);
            }
            return match[1];
        });

        expect(COLUMN_COLOR_PALETTE.slice(0, 3)).toEqual(shippedAccents);
    });
});

describe("resolveRenderedColumnColor", () => {
    it("returns the stored colour when present", () => {
        // Act & Assert
        expect(resolveRenderedColumnColor({ id: FIRST_ACCENT_ID, color: "#D551A2" })).toBe("#D551A2");
    });

    it("falls back to the id-derived palette entry when the stored colour is null", () => {
        // Act & Assert
        expect(resolveRenderedColumnColor({ id: FIRST_ACCENT_ID, color: null })).toBe(COLUMN_COLOR_PALETTE[0]);
        expect(resolveRenderedColumnColor({ id: SECOND_ACCENT_ID, color: null })).toBe(COLUMN_COLOR_PALETTE[1]);
    });

    it("falls back to the id-derived palette entry when the colour key is absent entirely", () => {
        // Act & Assert
        expect(resolveRenderedColumnColor({ id: FIRST_ACCENT_ID })).toBe(COLUMN_COLOR_PALETTE[0]);
    });
});

describe("pickNextColumnColor", () => {
    it("returns the first entry for an empty column list", () => {
        // Act & Assert
        expect(pickNextColumnColor({ columns: [] })).toBe(COLUMN_COLOR_PALETTE[0]);
    });

    it("returns entry 0 when it is the first unused entry, even though later entries are also unused", () => {
        // Arrange — every column already carries a stored colour other than entry 0.
        const columns = [
            { id: "col-a", color: COLUMN_COLOR_PALETTE[3] },
            { id: "col-b", color: COLUMN_COLOR_PALETTE[5] },
        ];

        // Act & Assert
        expect(pickNextColumnColor({ columns })).toBe(COLUMN_COLOR_PALETTE[0]);
    });

    it("returns entry 2 when entries 0 and 1 are already rendered", () => {
        // Arrange
        const columns = [
            { id: "col-a", color: COLUMN_COLOR_PALETTE[0] },
            { id: "col-b", color: COLUMN_COLOR_PALETTE[1] },
        ];

        // Act & Assert
        expect(pickNextColumnColor({ columns })).toBe(COLUMN_COLOR_PALETTE[2]);
    });

    /*
     * The collision defect this whole design exists to prevent: two legacy null-colour columns,
     * staged on ids known to hash into buckets 0 and 1, must not receive a pick that renders
     * identically to either of their fallback hues.
     */
    it("never returns a fallback hue a legacy null-colour sibling already renders", () => {
        // Arrange
        const columns = [
            { id: FIRST_ACCENT_ID, color: null },
            { id: SECOND_ACCENT_ID, color: null },
        ];

        // Act
        const picked = pickNextColumnColor({ columns });

        // Assert
        expect(picked).not.toBe(COLUMN_COLOR_PALETTE[0]);
        expect(picked).not.toBe(COLUMN_COLOR_PALETTE[1]);
        expect(picked).toBe(COLUMN_COLOR_PALETTE[2]);
    });

    /*
     * Every palette entry is rendered at least once — measured independently offline (not derived
     * from the function under test) that index 1 (#8471F2) has the greatest minimum ΔE_ok against
     * the other 5 entries, 0.2000, once each entry's own zero self-distance is excluded.
     */
    it("returns the entry maximising its minimum ΔE_ok against the rendered set once every entry is used", () => {
        // Arrange
        const columns = COLUMN_COLOR_PALETTE.map((color, index) => ({ id: `col-${String(index)}`, color }));

        // Act
        const first = pickNextColumnColor({ columns });
        const second = pickNextColumnColor({ columns });

        // Assert
        expect(first).toBe(COLUMN_COLOR_PALETTE[1]);
        expect(first).toBe(second);
    });

    /*
     * The saturated branch must SPREAD, not stick. Counting occurrences is what makes it: a set
     * loses multiplicity, so every candidate scored identically on every call past the sixth and
     * one entry won forever — columns 7, 8, 9 and 10 all rendered the same hue.
     */
    it("spreads successive picks across the palette once every entry is rendered, instead of repeating one", () => {
        // Arrange — every entry rendered exactly once, then four more columns added in turn.
        const live = COLUMN_COLOR_PALETTE.map((color, index) => ({ id: `col-${String(index)}`, color }));
        const picks: string[] = [];

        // Act
        for (let added = 0; added < COLUMN_COLOR_PALETTE.length; added += 1) {
            const picked = pickNextColumnColor({ columns: live });
            picks.push(picked);
            live.push({ id: `extra-${String(added)}`, color: picked });
        }

        // Assert — a full second lap uses every entry exactly once, in least-used order.
        expect(new Set(picks).size).toBe(COLUMN_COLOR_PALETTE.length);
    });

    /*
     * The backend preserves the case it is sent and CSS does not care, so two strings can paint one
     * dot. Compared raw, the stored value reads as unused and the new column is handed a hue already
     * on screen — the collision this module exists to prevent, wearing a different case.
     */
    it("treats a differently-cased stored colour as the palette entry it renders as", () => {
        // Arrange — the lowercase spelling of entry 0.
        const columns = [{ id: "legacy", color: COLUMN_COLOR_PALETTE[0].toLowerCase() }];

        // Act
        const picked = pickNextColumnColor({ columns });

        // Assert
        expect(picked).not.toBe(COLUMN_COLOR_PALETTE[0]);
        expect(picked.toUpperCase()).not.toBe(COLUMN_COLOR_PALETTE[0].toUpperCase());
    });
});
