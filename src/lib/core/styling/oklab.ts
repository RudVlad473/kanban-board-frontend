/**
 * `#RRGGBB` only — the single format authority for a stored column colour (the OpenAPI contract
 * carries no `pattern`/`maxLength` for it). Case-insensitive on the hex digits.
 */
import { isNil } from "es-toolkit";
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** The `#RRGGBB` string as 0-1 sRGB components, or `null` when it does not match `HEX_COLOR_PATTERN`. */
export const parseHexColor = (hex: string): { r: number; g: number; b: number } | null => {
    if (!HEX_COLOR_PATTERN.test(hex)) {
        return null;
    }

    const digits = hex.slice(1);

    return {
        r: parseInt(digits.slice(0, 2), 16) / 255,
        g: parseInt(digits.slice(2, 4), 16) / 255,
        b: parseInt(digits.slice(4, 6), 16) / 255,
    };
};

/* The sRGB piecewise transfer function — never a flat 2.2 power, which reproduces no reference value here. */
const srgbToLinear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

type OklabLab = { l: number; a: number; b: number };

/**
 * sRGB -> linear-light sRGB -> LMS -> cube root -> Oklab, per Bjorn Ottosson's published
 * `linear_srgb_to_oklab`. The sRGB-to-LMS matrix below, not the XYZ-to-LMS one from the same
 * article — the second transcription trap the reference test in this module's suite exists to catch.
 */
const toOklabLab = (hex: string): OklabLab => {
    const rgb = parseHexColor(hex);
    if (isNil(rgb)) {
        throw new Error(`toOklab: not a valid #RRGGBB hex color: ${hex}`);
    }

    const r = srgbToLinear(rgb.r);
    const g = srgbToLinear(rgb.g);
    const b = srgbToLinear(rgb.b);

    const lCone = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const mCone = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const sCone = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    const lRoot = Math.cbrt(lCone);
    const mRoot = Math.cbrt(mCone);
    const sRoot = Math.cbrt(sCone);

    return {
        l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
        a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
        b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
    };
};

export type Oklab = { l: number; c: number; h: number };

/** A `#RRGGBB` colour's Oklab lightness, chroma, and hue (degrees, 0-360). */
export const toOklab = (hex: string): Oklab => {
    const { l, a, b } = toOklabLab(hex);

    return { l, c: Math.sqrt(a * a + b * b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
};

/** The Euclidean distance between two colours in Oklab's l/a/b space — symmetric, zero for a colour against itself. */
export const deltaEOk = ({ hexA, hexB }: { hexA: string; hexB: string }): number => {
    const colorA = toOklabLab(hexA);
    const colorB = toOklabLab(hexB);

    return Math.sqrt((colorA.l - colorB.l) ** 2 + (colorA.a - colorB.a) ** 2 + (colorA.b - colorB.b) ** 2);
};
