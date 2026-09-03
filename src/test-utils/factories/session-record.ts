import { THEME } from "@/lib/core/theme/theme";
import type { SessionRecord } from "@/lib/server/session";

/**
 * The fixture-entity mechanism for `SessionRecord` — same factory-function-with-overrides
 * shape as `createBoard`. `SessionRecord` is a type-only import (`@/lib/server/session` opens with
 * `import "server-only"`), so this module stays importable from non-server test projects.
 */
export const createSessionRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
    id: "11111111-1111-4111-8111-111111111111",
    email: "fixture@example.com",
    displayName: "Fixture User",
    theme: THEME.LIGHT,
    jsessionId: "fixture-jsessionid",
    ...overrides,
});
