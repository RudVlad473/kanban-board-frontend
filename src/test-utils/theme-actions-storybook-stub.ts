import { THEME, type Theme } from "@/lib/core/theme/theme";

/**
 * A lightweight stand-in for `@/features/theme/actions`'s runtime module, aliased for the
 * "storybook" Vitest project only (`vitest.config.ts`) — mirrors `actions-storybook-stub.ts`'s
 * established pattern and rationale exactly: the real module opens with `"use server"` and
 * imports `@/lib/server/dal`/`@/lib/server/server-client`/`@/lib/server/theme`, whose chain
 * reaches `node:crypto` via `@/lib/server/session`. No story ever triggers a real toggle (D-25),
 * so a no-op stand-in is enough. Never imported by application code, only by the test config
 * (CONVENTIONS.md's `src/test-utils/` rule).
 */
type UpdateThemeResult = { status: "success"; theme: Theme } | { status: "error" };

export const updateThemeAction = (): Promise<UpdateThemeResult> =>
    Promise.resolve({ status: "success", theme: THEME.LIGHT });
