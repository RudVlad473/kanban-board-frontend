import { THEME, type Theme } from "@/lib/core/theme/theme";

/**
 * A lightweight stand-in for `@/features/theme/actions/update-theme`'s runtime module, aliased for
 * the "storybook" Vitest project only (`vitest.config.ts`) — the real module opens with
 * `"use server"` and its import chain reaches `node:crypto` via `@/lib/server/session`. No story
 * ever triggers a real toggle (D-25), so a no-op stand-in is enough.
 */
type UpdateThemeResult = { status: "success"; theme: Theme } | { status: "error" };

export const updateThemeAction = (): Promise<UpdateThemeResult> =>
    Promise.resolve({ status: "success", theme: THEME.LIGHT });
