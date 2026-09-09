import { E2E_CONFIG } from "./test-env";
import { probeResetCapability, RESET_PROBE_OUTCOME } from "../src/test-utils/nonprod-reset-client";
import { resetSeededUserRegistry, SEED_SCOPE } from "../src/test-utils/seeded-user-registry";

/**
 * Playwright `globalSetup` for `e2e` -- refuses to run the suite without a working `/admin/reset`
 * and a valid `NONPROD_RESET_TOKEN`, since every e2e spec creates real, permanent accounts on the
 * shared nonprod backend. See SETUP.md and docs/adr/tech/0022 for the full reasoning.
 */
const globalSetup = async (): Promise<void> => {
    const token = process.env.NONPROD_RESET_TOKEN;

    if (!token) {
        throw new Error(
            "NONPROD_RESET_TOKEN is not set. The e2e suite creates real accounts on the shared " +
                "nonprod backend and refuses to run without a working reset endpoint to clean them " +
                "up. Set NONPROD_RESET_TOKEN in your environment or .env.local (see SETUP.md) before " +
                "running `pnpm exec playwright test --project e2e`.",
        );
    }

    /*
     * Truncated before probing (not after) -- a stale id from a killed prior run would otherwise
     * poison this run's teardown batch, since the backend 404s the whole delete list if any one id
     * in it doesn't exist.
     */
    resetSeededUserRegistry(SEED_SCOPE.PLAYWRIGHT);

    const probe = await probeResetCapability({ baseUrl: E2E_CONFIG.EXTERNAL_API_BASE_URL, token });

    if (probe.outcome !== RESET_PROBE_OUTCOME.CAPABLE) {
        throw new Error(
            `Reset capability probe against ${E2E_CONFIG.EXTERNAL_API_BASE_URL} failed -- ${probe.message} ` +
                "The e2e suite refuses to run without a working reset capability (see SETUP.md).",
        );
    }
};

export default globalSetup;
