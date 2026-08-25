import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { THEME, type Theme } from "@/lib/core/theme/theme";

/**
 * A no-op stand-in for the real `"use server"` update-theme action, aliased for the "storybook"
 * Vitest project only — no story ever triggers a real toggle (D-25).
 */
type UpdateThemeResult =
    { status: typeof RESULT_STATUS.SUCCESS; theme: Theme } | { status: typeof RESULT_STATUS.ERROR };

export const updateThemeAction = (): Promise<UpdateThemeResult> =>
    Promise.resolve({ status: RESULT_STATUS.SUCCESS, theme: THEME.LIGHT });
