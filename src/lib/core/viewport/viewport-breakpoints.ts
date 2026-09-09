// Covered by: `src/components/ui/modal/modal.test.tsx`

/**
 * Single source of truth for this project's two test/story viewport sizes (ADR tech/0010),
 * shared by `.storybook/preview.ts`, `visual/primitives.visual.spec.ts`, and
 * `describe-for-each-device.ts`. Enum-like constant declaration pattern (ADR tech/0012).
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

/*
 * 375x667 (breakpoint.mobile) / 1440x900 (breakpoint.desktop) — width matches the DTCG
 * `breakpoint.*` tokens exactly (src/styles/tokens.css `--breakpoint-sm`/`--breakpoint-lg`);
 * height is a representative device/viewport height, not itself a design token.
 */
export const VIEWPORT_SIZES: Record<DeviceType, ViewportSize> = {
    [DEVICE_TYPE.MOBILE]: { width: 375, height: 667 },
    [DEVICE_TYPE.DESKTOP]: { width: 1440, height: 900 },
};
