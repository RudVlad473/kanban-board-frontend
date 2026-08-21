import { E2E_CONFIG } from "./test-env";
import { EXTERNAL_PATH } from "../src/lib/core/api-contract/external-paths";

/**
 * Playwright `globalSetup` for `e2e` — refuses to run the suite without a working `/admin/reset`
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

    const response = await fetch(`${E2E_CONFIG.EXTERNAL_API_BASE_URL}${EXTERNAL_PATH.ADMIN_RESET}`, {
        method: "POST",
        headers: { "X-Reset-Token": token },
    });

    if (!response.ok) {
        throw new Error(
            `Reset endpoint at ${E2E_CONFIG.EXTERNAL_API_BASE_URL}${EXTERNAL_PATH.ADMIN_RESET} returned ` +
                `${String(response.status)} — the e2e suite refuses to run without a working reset ` +
                "capability. Confirm NONPROD_RESET_TOKEN is correct (see SETUP.md).",
        );
    }
};

export default globalSetup;
