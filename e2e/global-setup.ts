import { E2E_CONFIG } from "./test-env";
import { EXTERNAL_PATH } from "../src/lib/core/api-contract/external-paths";

/**
 * Playwright `globalSetup` for the `e2e` project — runs once before any e2e spec, and throwing
 * here aborts the whole run before a single test creates an account. Every e2e spec creates real,
 * permanent accounts on the shared nonprod backend (GC-22/GC-23, `SETUP.md`); without a working
 * reset endpoint there is no way to clean that up afterward. Previously this repository treated
 * reset capability as CI-only, best-effort cleanup (`.github/workflows/ci.yml`'s post-suite
 * "Reset nonprod state" step) — this closes the gap that left local runs free to accumulate
 * orphaned accounts with nothing to clean them up: availability of the endpoint and a working
 * token to call it is now a hard precondition, checked and consumed before the suite starts (which
 * also has the side benefit of starting the run against a clean backend, not just ending against
 * one), not merely attempted afterward.
 *
 * Uses the same `NONPROD_RESET_TOKEN` name CI's own repository secret already uses
 * (`.github/workflows/ci.yml`) — see `SETUP.md` for where a local value comes from.
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
