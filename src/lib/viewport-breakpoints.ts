/**
 * Single source of truth for this project's two test/story viewport sizes (ADR tech/0010) — used
 * from three different loader contexts that each need the exact same numbers: `.storybook/
 * preview.ts` (Vite, the `viewport` toolbar control), `visual/primitives.visual.spec.ts`
 * (Playwright, `page.setViewportSize`), and `src/test/viewport.ts` (Vitest Browser Mode,
 * `page.viewport`). All three resolve plain TS with no side effects and no framework-specific
 * code, so one shared module works cleanly across all of them without needing per-context
 * duplication or a build step of its own.
 *
 * ADR tech/0012's enum-like constant pattern: keys mirror their own string values, the type is
 * always derived from the object, `as const` is required.
 */
export const DEVICE_TYPE = {
    MOBILE: "MOBILE",
    DESKTOP: "DESKTOP",
} as const;

export type DeviceType = (typeof DEVICE_TYPE)[keyof typeof DEVICE_TYPE];

export type ViewportSize = {
    width: number;
    height: number;
};

// 375x667 (breakpoint.mobile) / 1440x900 (breakpoint.desktop) — width matches the DTCG
// `breakpoint.*` tokens exactly (src/styles/tokens.css `--breakpoint-sm`/`--breakpoint-lg`);
// height is a representative device/viewport height, not itself a design token.
export const VIEWPORT_SIZES: Record<DeviceType, ViewportSize> = {
    [DEVICE_TYPE.MOBILE]: { width: 375, height: 667 },
    [DEVICE_TYPE.DESKTOP]: { width: 1440, height: 900 },
};
