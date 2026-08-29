import { resolveTestApiBaseUrl } from "./api-base-url";
import { deleteSeededUsers } from "./nonprod-reset-client";
import { readSeededUserIds, resetSeededUserRegistry, SEED_SCOPE } from "./seeded-user-registry";

/** Vitest `globalSetup` pair for the `node` project -- scoped cleanup, never a full wipe. */
export const setup = (): void => {
    resetSeededUserRegistry(SEED_SCOPE.VITEST);
};

/**
 * Unlike `e2e`'s teardown, a missing token warns and skips rather than throwing: `pnpm test` is
 * routinely run by developers with no token configured, and these tests don't depend on cleanup
 * to pass -- only the shared backend depends on it not accumulating orphaned accounts.
 */
export const teardown = async (): Promise<void> => {
    const userIds = readSeededUserIds(SEED_SCOPE.VITEST);

    if (userIds.length === 0) {
        return;
    }

    const token = process.env.NONPROD_RESET_TOKEN;

    if (!token) {
        console.warn(
            `vitest-nonprod-cleanup: NONPROD_RESET_TOKEN is not set -- leaving ${String(userIds.length)} ` +
                "seeded account(s) on the shared backend. Run `pnpm e2e:cleanup` once a token is available.",
        );
        return;
    }

    const response = await deleteSeededUsers({ baseUrl: resolveTestApiBaseUrl(), token, userIds });

    if (!response.ok) {
        throw new Error(
            `vitest-nonprod-cleanup: failed to delete seeded users [${userIds.join(", ")}] -- ` +
                `${String(response.status)}. Retry with \`pnpm e2e:cleanup\` once the underlying issue is fixed.`,
        );
    }

    resetSeededUserRegistry(SEED_SCOPE.VITEST);
};
