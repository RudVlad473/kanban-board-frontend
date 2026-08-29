import { E2E_CONFIG } from "./test-env";
import { deleteSeededUsers } from "../src/test-utils/nonprod-reset-client";
import { readSeededUserIds, resetSeededUserRegistry, SEED_SCOPE } from "../src/test-utils/seeded-user-registry";

/**
 * Playwright `globalTeardown` for `e2e` -- deletes only the users this run's specs registered
 * (`seedAccount()`, UI sign-ups via `e2e/signed-up-user.ts`), never a full wipe. A run that
 * registered nothing performs no request at all (an empty list is a 400 by design).
 */
const globalTeardown = async (): Promise<void> => {
    const token = process.env.NONPROD_RESET_TOKEN;
    const userIds = readSeededUserIds(SEED_SCOPE.PLAYWRIGHT);

    if (!token || userIds.length === 0) {
        return;
    }

    const response = await deleteSeededUsers({ baseUrl: E2E_CONFIG.EXTERNAL_API_BASE_URL, token, userIds });

    if (!response.ok) {
        throw new Error(
            `Teardown failed to delete seeded users [${userIds.join(", ")}] -- ` +
                `${String(response.status)} from ${E2E_CONFIG.EXTERNAL_API_BASE_URL}. Retry with ` +
                "`pnpm e2e:cleanup` once the underlying issue is fixed.",
        );
    }

    resetSeededUserRegistry(SEED_SCOPE.PLAYWRIGHT);
};

export default globalTeardown;
