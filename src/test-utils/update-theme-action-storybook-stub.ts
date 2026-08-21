import { THEME, type Theme } from "@/lib/core/theme/theme";

/**
 * A no-op stand-in for the real `"use server"` update-theme action, aliased for the "storybook"
 * Vitest project only — no story ever triggers a real toggle (D-25).
 */
type UpdateThemeResult = { status: "success"; theme: Theme } | { status: "error" };

export const updateThemeAction = (): Promise<UpdateThemeResult> =>
    Promise.resolve({ status: "success", theme: THEME.LIGHT });
